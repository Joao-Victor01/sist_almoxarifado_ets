#services\relatorio_service.py

from sqlalchemy.ext.asyncio import AsyncSession
import pandas as pd
from models.retirada import StatusEnum
from core.configs import Settings
from services.export_strategy import CSVExportStrategy, XLSXExportStrategy
from services.categoria_service import CategoriaService
from services.item_service import ItemService
from services.retirada_service import RetiradaService
from utils.relatorio_itens import formatar_dados_relatorio
from fastapi import HTTPException
from datetime import datetime
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


    @staticmethod
    async def gerar_relatorio_entrada_itens(
        session: AsyncSession,
        data_inicio: datetime,
        data_fim: datetime,
        formato: str
    ):
        itens = await ItemService.get_itens_por_periodo(session, data_inicio, data_fim)
        
        # Formatar DataFrame com acesso via dicionário
        df = pd.DataFrame([{
            "ID_Item": item["item_id"],
            "Nome": item["nome_item"],
            "Quantidade": item["quantidade_item"],
            "Data_Entrada": item["data_entrada_item"].strftime('%d/%m/%Y'),
            "Categoria": item["nome_categoria"]  # Nome da categoria do JOIN
        } for item in itens])
        
        # Exportar usando estratégia existente
        caminho_arquivo = os.path.join(PASTA_RELATORIOS, f"relatorio_entrada_itens.{formato}")
        export_strategy = CSVExportStrategy() if formato == "csv" else XLSXExportStrategy()
        export_strategy.export(df, caminho_arquivo)
        return caminho_arquivo

    @staticmethod
    async def gerar_relatorio_retiradas_setor(
        session: AsyncSession,
        setor_id: int,
        data_inicio: datetime,
        data_fim: datetime,
        formato: str
    ):
        if not setor_id:
            raise HTTPException(status_code=400, detail="Setor não informado")

        retiradas = await RetiradaService.get_retiradas_por_setor_periodo(
            session, setor_id, data_inicio, data_fim
        )
        
        dados = []
        for retirada in retiradas:
            if not retirada.itens:
                continue
            for item in retirada.itens:
                if not item.item:
                    continue
                dados.append({
                    "ID_Retirada": retirada.retirada_id,
                    "Data_Solicitacao": retirada.data_solicitacao.strftime('%d/%m/%Y'),
                    "Item": item.item.nome_item,
                    "Quantidade_Retirada": item.quantidade_retirada,
                    "Usuario": retirada.usuario.nome_usuario,  
                    "Status": StatusEnum(retirada.status).name,
                    "Autorizada_Por": retirada.admin.nome_usuario if retirada.admin else "N/A",
                    "Setor_ID": retirada.setor_id  
                })
        
        df = pd.DataFrame(dados)
        caminho_arquivo = os.path.join(PASTA_RELATORIOS, f"relatorio_retiradas_setor.{formato}")
        export_strategy = CSVExportStrategy() if formato == "csv" else XLSXExportStrategy()
        export_strategy.export(df, caminho_arquivo)
        return caminho_arquivo