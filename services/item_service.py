# app/services/item/item_service.py

from datetime import datetime
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status, UploadFile
from utils.normalizar_texto import normalize_name
from services.validator import ItemValidator
from services.finder import ItemFinder
from services.bulk_processor import ItemBulkProcessor
from repositories.item_repository import ItemRepository
from repositories.categoria_repository import CategoriaRepository
from schemas.item import (
    ItemCreate,
    ItemUpdate,
    PaginatedItems,
    ItemOut,
    BulkItemUploadResult,
)

class ItemService:

    @staticmethod
    async def create_item(db: AsyncSession, item_data: ItemCreate, current_user):
        # 1) Valida campos obrigatórios
        ItemValidator.validate_on_create(item_data)

        # 2) Normaliza nome
        nome_original = item_data.nome_item.strip()
        nome_normalizado = normalize_name(nome_original)

        # 3) Prepara dicionário para persistência
        dados = item_data.model_dump()
        dados.update(
            {
                "nome_item_original": nome_original,
                "nome_item": nome_normalizado,
                "auditoria_usuario_id": current_user.usuario_id,
            }
        )
        # Se não vier data_entrada_item, usa agora
        dados["data_entrada_item"] = dados.get("data_entrada_item") or datetime.now()

        try:
            # 4) Verifica duplicata (incluindo itens inativos para reativação)
            existing = await ItemFinder.find_exact_match(
                db,
                nome_normalizado,
                dados.get("data_validade_item"),
                dados["categoria_id"],
                dados.get("marca_item"),
            )

            if existing:
                # Se existir duplicado, incrementa quantidade e reativa se necessário
                return await ItemService._increment_existing_item(db, existing, item_data)

            # 5) Se não, cria via repositório
            from models.item import Item # Importação local para evitar circular
            novo = Item(**dados)
            return await ItemRepository.create(db, novo)

        except IntegrityError as ie:
            await db.rollback()
            ItemService._handle_integrity_error(ie)
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Erro ao criar o item: {e}",
            )

    @staticmethod
    async def _increment_existing_item(db: AsyncSession, existing, item_data: ItemCreate):
        """
        Incrementa apenas a quantidade (e atualiza campos opcionais)
        sem criar novo registro. Reativa o item se ele estava inativo.
        """
        existing.quantidade_item += item_data.quantidade_item
        existing.data_entrada_item = item_data.data_entrada_item or datetime.now()

        # Atualiza campos opcionais, se vierem
        if item_data.data_validade_item:
            existing.data_validade_item = item_data.data_validade_item
        if item_data.quantidade_minima_item:
            existing.quantidade_minima_item = item_data.quantidade_minima_item
        if item_data.marca_item:
            existing.marca_item = item_data.marca_item

        # Se o item estava inativo e sua quantidade foi incrementada, reativá-lo
        if not existing.ativo:
            existing.ativo = True

        existing.auditoria_usuario_id = (
            item_data.auditoria_usuario_id
            if hasattr(item_data, "auditoria_usuario_id")
            else existing.auditoria_usuario_id
        )

        await db.commit()
        await db.refresh(existing)
        return existing

    @staticmethod
    async def get_itens(db: AsyncSession):
        items = await ItemRepository.get_all(db)
        if not items:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Sem itens no banco de dados"
            )
        return items

    @staticmethod
    async def get_item_by_id(db: AsyncSession, item_id: int):
        item = await ItemRepository.get_by_id(db, item_id)
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Item não encontrado"
            )
        return item

    @staticmethod
    async def delete_item(db: AsyncSession, item_id: int):
        item = await ItemRepository.get_by_id(db, item_id)
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Item não encontrado"
            )
        # O ItemRepository.delete já realiza o soft delete (seta ativo=False)
        await ItemRepository.delete(db, item)
        return {"message": "Item deletado com sucesso"}

    @staticmethod
    async def update_item(
        db: AsyncSession, item_id: int, data: ItemUpdate, current_user
    ):
        # 1) Busca o item (get_by_id já filtra por ativo=True)
        item = await ItemRepository.get_by_id(db, item_id)
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Item não encontrado"
            )

        # 2) Valida campos que vieram
        ItemValidator.validate_on_update(data)

        # 3) Se vier nome item, normaliza
        valores = data.model_dump(exclude_unset=True)
        if "nome_item" in valores:
            nome_original = valores["nome_item"].strip()
            valores["nome_item_original"] = nome_original
            valores["nome_item"] = normalize_name(nome_original)

        # 4) Verificar duplicata com novos valores (inclui inativos)
        novo_nome = valores.get("nome_item", item.nome_item)
        nova_marca = valores.get("marca_item", item.marca_item)
        nova_validade = valores.get("data_validade_item", item.data_validade_item)
        nova_categoria = valores.get("categoria_id", item.categoria_id)

        existing = await ItemFinder.find_exact_match(
            db, novo_nome, nova_validade, nova_categoria, nova_marca
        )

        # 5a) Merging: se encontrou uma duplicata diferente do item atual
        if existing and existing.item_id != item.item_id:
            # Transfere quantidade para o item existente (duplicata)
            existing.quantidade_item += item.quantidade_item
            # Reativa o item existente se ele estava inativo
            if not existing.ativo:
                existing.ativo = True

            # Atualiza apenas campos opcionais do item existente, se vierem
            for campo in ["quantidade_minima_item", "data_validade_item", "marca_item", "unidade_medida_item", "descricao_item"]:
                if campo in valores:
                    setattr(existing, campo, valores[campo])

            existing.auditoria_usuario_id = current_user.usuario_id

            # O item original (item_id) é soft-deletado
            await ItemRepository.delete(db, item) # Já seta item.ativo = False
            await db.commit()
            await db.refresh(existing)
            return existing
        # 5b) Senão, faz atualização pontual no próprio item
        for key, valor in valores.items():
            setattr(item, key, valor)

        # Lógica para reativar o item se a quantidade for > 0 ou se 'ativo' for explicitamente True
        if 'quantidade_item' in valores and valores['quantidade_item'] > 0 and not item.ativo:
            item.ativo = True
        elif 'ativo' in valores: # Permite definir o status ativo/inativo explicitamente
            item.ativo = valores['ativo']
        
        item.auditoria_usuario_id = current_user.usuario_id

        await db.commit()
        await db.refresh(item)
        return item

    @staticmethod
    async def get_items_paginated(db: AsyncSession, page: int, size: int) -> PaginatedItems:
        allowed = [5, 10, 25, 50, 100]
        if size not in allowed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"size deve ser um de {allowed}",
            )
        if page < 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="page deve ser >= 1"
            )

        total = await ItemRepository.count(db) # Já conta apenas itens ativos
        offset = (page - 1) * size
        itens = await ItemRepository.get_paginated(db, offset, size) # Já lista apenas itens ativos

        items_out = [ItemOut.model_validate(i) for i in itens]
        total_pages = (total // size) + (1 if total % size else 0)

        return PaginatedItems(
            page=page, size=size, total=total, total_pages=total_pages, items=items_out
        )

    @staticmethod
    async def search_items_paginated(
        db: AsyncSession, nome_produto: str | None, nome_categoria: str | None, page: int, size: int
    ) -> PaginatedItems:
        allowed = [5, 10, 25, 50, 100]
        if size not in allowed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"size deve ser um de {allowed}",
            )
        if page < 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="page deve ser >= 1"
            )

        nome_norm = normalize_name(nome_produto) if nome_produto else None
        categoria_ids = None
        if nome_categoria:
            nome_categoria_norm = normalize_name(nome_categoria)
            categoria_ids = await CategoriaRepository.find_categoria_ids_by_name(
                db, nome_categoria_norm
            )

        total = await ItemRepository.count_filtered(db, categoria_ids, nome_norm) # Já conta apenas itens ativos
        offset = (page - 1) * size
        itens = await ItemRepository.get_filtered_paginated( # Já lista apenas itens ativos
            db, categoria_ids, nome_norm, offset, size
        )

        items_out = [ItemOut.model_validate(i) for i in itens]
        total_pages = (total // size) + (1 if total % size else 0)

        return PaginatedItems(
            page=page, size=size, total=total, total_pages=total_pages, items=items_out
        )

    @staticmethod
    async def process_bulk_upload(
        db: AsyncSession, file: UploadFile, auditoria_usuario_id: int
    ) -> BulkItemUploadResult:
        processor = ItemBulkProcessor(db, auditoria_usuario_id)
        return await processor.process(file)

    @staticmethod
    def _handle_integrity_error(e: IntegrityError):
        error_msg = str(e.orig).lower()
        if "fk_item_categoria" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Categoria do item não encontrada no banco de dados.",
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao criar/atualizar o item. Verifique os dados e tente novamente."
        )
