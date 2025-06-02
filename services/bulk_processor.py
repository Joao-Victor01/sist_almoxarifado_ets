# app/services/item/bulk_processor.py

import io
from datetime import datetime
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import pandas as pd

from utils.normalizar_texto import normalize_name
from services.finder import ItemFinder
from repositories.item_repository import ItemRepository
from schemas.item import BulkItemUploadResult

# Import do modelo Categoria para criação de novas categorias
from models.categoria import Categoria


class ItemBulkProcessor:
    ALLOWED_CONTENT_TYPES = {
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
        "text/csv": "csv",
    }

    def __init__(self, db: AsyncSession, auditoria_usuario_id: int):
        self.db = db
        self.auditoria_usuario_id = auditoria_usuario_id
        # Mapeamento de nome_categoria_normalizado -> categoria_id
        self.category_map: dict[str, int] = {}

    async def process(self, upload_file) -> BulkItemUploadResult:
        content_type = upload_file.content_type
        if content_type not in self.ALLOWED_CONTENT_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tipo de arquivo inválido. Apenas .xlsx e .csv são permitidos.",
            )

        # 1) Ler DataFrame conforme tipo
        df = await self._load_dataframe(upload_file)

        # 2) Preparar colunas e pré-carregar/criar categorias
        df = self._normalize_columns(df)
        await self._fetch_or_create_categories(df)

        total_processed = len(df)
        self._items_created = 0
        self._items_updated = 0
        errors: list[dict] = []

        # 3) Processar cada linha separadamente
        for idx, row in df.iterrows():
            try:
                await self._process_row(idx, row)
            except ValueError as ve:
                errors.append({"row": idx + 2, "error": str(ve)})
                await self.db.rollback()
            except Exception as e:
                errors.append({"row": idx + 2, "error": f"Erro inesperado: {e}"})
                await self.db.rollback()

        # 4) Commit final (se ao menos uma linha foi processada sem erro crítico)
        await self.db.commit()

        return BulkItemUploadResult(
            total_items_processed=total_processed,
            items_created=self._items_created,
            items_updated=self._items_updated,
            errors=errors,
        )

    async def _load_dataframe(self, upload_file) -> pd.DataFrame:
        content = await upload_file.read()
        file_type = self.ALLOWED_CONTENT_TYPES[upload_file.content_type]

        if file_type == "xlsx":
            return pd.read_excel(io.BytesIO(content))
        else:  # csv
            text = content.decode("utf-8")
            return pd.read_csv(io.StringIO(text))

    def _normalize_columns(self, df: pd.DataFrame) -> pd.DataFrame:
        df.columns = df.columns.str.strip().str.lower()
        required = ["produto", "quantidade", "unidade de medida", "categoria"]
        for col in required:
            if col not in df.columns:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Coluna obrigatória '{col}' não encontrada no arquivo.",
                )
        # 'descrição' é opcional agora
        return df

    async def _fetch_or_create_categories(self, df: pd.DataFrame) -> None:
        """
        1) Extrai todas as categorias normalizadas do DataFrame.
        2) Busca as que já existem no banco de dados e atualiza self.category_map.
        3) Para as categorias inexistentes, cria novas instâncias de Categoria,
           persiste no banco (flush) e inclui no self.category_map.
        """
        # 1) Normaliza nomes de categoria únicos do arquivo
        raw_categories = df["categoria"].dropna().astype(str).str.strip().tolist()
        normalized_list = [normalize_name(name) for name in raw_categories]
        unique_normalized = list(dict.fromkeys(normalized_list))  # mantém ordem, sem duplicar

        # 2) Busca no banco as categorias que já existem
        query = select(Categoria).where(Categoria.nome_categoria.in_(unique_normalized))
        result = await self.db.execute(query)
        existing_categories = result.scalars().all()

        # Preenche o mapeamento para as já existentes
        for cat in existing_categories:
            self.category_map[cat.nome_categoria] = cat.categoria_id

        # 3) Identifica quais normalized names ainda não existem e cria
        existing_names = {cat.nome_categoria for cat in existing_categories}
        to_create = [nome for nome in unique_normalized if nome not in existing_names]

        for normalized_cat in to_create:
            # Descobrir o raw name correspondente (para nome_original)
            raw_index = normalized_list.index(normalized_cat)
            raw_name = raw_categories[raw_index]

            nova_categoria = Categoria(
                nome_original=raw_name,
                nome_categoria=normalized_cat,
            )
            self.db.add(nova_categoria)
            await self.db.flush()  # garante que nova_categoria.categoria_id seja populado

            # Atualiza o mapeamento
            self.category_map[normalized_cat] = nova_categoria.categoria_id

    async def _process_row(self, idx: int, row) -> None:
        """
        Processa uma linha do DataFrame:
         - Valida campos obrigatórios de cada coluna
         - Normaliza nome do item e procura duplicata
         - Se existe duplicata: atualiza quantidade + campos opcionais
         - Senão: cria novo objeto Item e dá db.add(...)
         - Usa nome_item + unidade como 'descrição' quando coluna ausente ou vazia
        """
        # --- 1. Extrair e validar campos básicos ---
        produto_raw = str(row["produto"]).strip()
        if not produto_raw:
            raise ValueError("Nome do produto não pode ser vazio.")

        qtd_raw = row["quantidade"]
        if pd.isna(qtd_raw) or not str(qtd_raw).strip().isdigit():
            raise ValueError("Quantidade inválida ou vazia.")
        quantidade = int(qtd_raw)

        if quantidade <= 0:
            raise ValueError("Quantidade deve ser maior que zero.")

        # Unidade de medida (sempre obrigatória)
        unidade = str(row["unidade de medida"]).strip()
        if not unidade:
            raise ValueError("Unidade de medida não pode ser vazia.")

        # Descrição: se coluna existe e há valor não vazio, usa; senão, concatena nome + unidade
        if "descrição" in row and pd.notna(row["descrição"]) and str(row["descrição"]).strip():
            descricao = str(row["descrição"]).strip()
        else:
            descricao = f"{produto_raw} {unidade}"

        # Marca (opcional)
        marca = (
            str(row.get("marca", "")).strip() if pd.notna(row.get("marca")) else None
        )

        validade = self._parse_date(row.get("validade"), produto_raw)

        # Categoria
        cat_raw = str(row["categoria"]).strip()
        normalized_cat = normalize_name(cat_raw)
        categoria_id = self.category_map.get(normalized_cat)
        if not categoria_id:
            # Em teoria, todas as categorias já foram criadas em _fetch_or_create_categories()
            raise ValueError(f"Falha ao encontrar ou criar a categoria '{cat_raw}'.")

        # --- 2. Normalização e busca de duplicata ---
        nome_normalizado = normalize_name(produto_raw)
        existing = await ItemFinder.find_exact_match(
            self.db, nome_normalizado, validade, categoria_id, marca
        )

        # --- 3. Se duplicata existe, atualiza; senão, cria novo ---
        if existing:
            existing.quantidade_item += quantidade
            existing.data_entrada_item = datetime.now()
            if validade:
                existing.data_validade_item = validade
            if marca:
                existing.marca_item = marca
            # Atualiza descrição também, caso queira manter histórico (opcional)
            existing.descricao_item = descricao
            existing.auditoria_usuario_id = self.auditoria_usuario_id
            await self.db.flush()
            self._items_updated += 1
        else:
            from models.item import Item

            new_item = Item(
                nome_item_original=produto_raw,
                nome_item=nome_normalizado,
                descricao_item=descricao,
                unidade_medida_item=unidade,
                quantidade_item=quantidade,
                categoria_id=categoria_id,
                data_validade_item=validade,
                marca_item=marca,
                data_entrada_item=datetime.now(),
                auditoria_usuario_id=self.auditoria_usuario_id,
            )
            self.db.add(new_item)
            await self.db.flush()
            self._items_created += 1

    def _parse_date(self, raw_value, produto_raw: str):
        """Tenta converter a coluna 'validade' em date; levanta ValueError se inválido."""
        from datetime import datetime as dt

        if raw_value is pd.NA or pd.isna(raw_value):
            return None

        if isinstance(raw_value, (dt,)):
            return raw_value.date()

        # Tentar formato dd/mm/YYYY
        parsed = pd.to_datetime(raw_value, errors="coerce", format="%d/%m/%Y")
        if pd.isna(parsed):
            # Tentar inferir
            parsed = pd.to_datetime(raw_value, errors="coerce")
        if pd.isna(parsed):
            raise ValueError(f"Formato de validade inválido para '{produto_raw}': {raw_value}")
        return parsed.date()
