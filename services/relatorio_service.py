#services\relatorio_service.py

from sqlalchemy.ext.asyncio import AsyncSession
import pandas as pd
from core.configs import Settings
from services.export_strategy import CSVExportStrategy, XLSXExportStrategy
from services.categoria_service import CategoriaService
from services.item_service import ItemService
from utils.relatorio_itens import formatar_dados_relatorio
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
            # 1. Buscar categorias (se aplicável)
            categorias = []
            if filtro_categoria:
                categorias = await CategoriaService.get_categorias_like(session, filtro_categoria)
            
            # 2. Buscar itens com filtros
            itens = await ItemService.get_itens_filtrados(
                session,
                categoria_ids=[c.categoria_id for c in categorias] if categorias else None,
                nome_produto=filtro_produto
            )
            
            # 3. Formatar dados
            dados = formatar_dados_relatorio(itens)
            df = pd.DataFrame(dados)
            
            # 4. Exportar
            caminho_arquivo = os.path.join(PASTA_RELATORIOS, f"relatorio_quantidade_itens.{formato}")
            export_strategy = CSVExportStrategy() if formato == "csv" else XLSXExportStrategy()
            export_strategy.export(df, caminho_arquivo)
            
            return caminho_arquivo
        
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Erro: {str(e)}")
