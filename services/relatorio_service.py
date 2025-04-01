#services\relatorio_service.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import pandas as pd
from core.configs import Settings
from models.item import Item
from models.categoria import Categoria
from utils.normalizar_texto import normalize_name
from services.export_strategy import CSVExportStrategy, XLSXExportStrategy
from services.categoria_service import CategoriaService
from fastapi import HTTPException
import os

PASTA_RELATORIOS = Settings.PASTA_RELATORIOS
os.makedirs(PASTA_RELATORIOS, exist_ok=True)

class RelatorioService:
    @staticmethod
    async def gerar_relatorio_quantidade_itens(
        session: AsyncSession,
        filtro_categoria: str = None,
        filtro_produto: str = None,
        formato: str = "csv"
    ):
        try:
            query = select(
                Item.categoria_id.label("ID_Categoria"),
                Categoria.nome_categoria.label("Nome_Categoria"),
                Item.nome_item.label("Produto"),
                Item.quantidade_item.label("Quantidade"),
                Item.data_validade_item.label("Data_Validade")
            ).join(Categoria, Item.categoria_id == Categoria.categoria_id)

            if filtro_categoria:
                categorias = await CategoriaService.get_categorias_like(session, filtro_categoria)
                categoria_ids = [c.categoria_id for c in categorias]
                if not categoria_ids:
                    # Se não houver categorias, retorna um DataFrame vazio com as colunas corretas
                    return pd.DataFrame(columns=["ID_Categoria", "Nome_Categoria", "Produto", "Quantidade", "Data_Validade"])
                query = query.where(Item.categoria_id.in_(categoria_ids))

            if filtro_produto:
                produto_normalizado = normalize_name(filtro_produto)
                query = query.where(Item.nome_item.ilike(f"%{produto_normalizado}%"))

            result = await session.execute(query)
            dados = result.mappings().all()

            # Verificação de dados vazios antes de gerar o DataFrame
            if not dados:
                raise HTTPException(
                    status_code=404,
                    detail="Nenhum dado encontrado para o relatório."
                )

            df = pd.DataFrame(dados)

            # Garante que o DataFrame tem as colunas corretas, mesmo se vazio
            if df.empty:
                df = pd.DataFrame(columns=["ID_Categoria", "Nome_Categoria", "Produto", "Quantidade", "Data_Validade"])

            if 'Produto' in df.columns:
                df['Produto'] = df['Produto'].str.title().str.replace(r"([a-z])([A-Z])", r"\1 \2", regex=True)

            if 'Data_Validade' in df.columns:
                df['Data_Validade'] = pd.to_datetime(df['Data_Validade']).dt.strftime('%d/%m/%Y')

            caminho_arquivo = os.path.join(PASTA_RELATORIOS, f"relatorio_quantidade_itens.{formato}")

            if formato == "csv":
                export_strategy = CSVExportStrategy()
            elif formato == "xlsx":
                export_strategy = XLSXExportStrategy()
            else:
                raise HTTPException(
                    status_code=400,
                    detail="Formato inválido. Use: csv ou xlsx"
                )

            export_strategy.export(df, caminho_arquivo)

            return caminho_arquivo

        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Erro ao gerar relatório: {str(e)}"
            )
