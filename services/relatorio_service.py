#services\relatorio_service.py

from sqlalchemy.ext.asyncio import AsyncSession
import pandas as pd
from models.retirada import StatusEnum
from core.configs import Settings
from services.export_strategy import CSVExportStrategy, XLSXExportStrategy
from services.categoria_service import CategoriaService
from services.item_service import ItemService # Manter para outros usos se houver, mas não para get_itens_filtrados
from repositories.item_repository import ItemRepository # NOVO: Importar ItemRepository
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
            categoria_ids = []
            if filtro_categoria:
                categorias = await CategoriaService.get_categorias_like(session, filtro_categoria)
                categoria_ids = [c.categoria_id for c in categorias]

            # 2. Buscar itens com filtros usando o ItemRepository.find_filtered
            # NOVO: Usar ItemRepository.find_filtered
            itens = await ItemRepository.find_filtered(
                session,
                categoria_ids=categoria_ids if categoria_ids else None, # Passar None se a lista estiver vazia
                nome_produto_normalizado=filtro_produto # O ItemRepository.find_filtered já espera o nome normalizado
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
            raise # Repassa exceções HTTP específicas
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Erro ao gerar relatório: {str(e)}"
            )

    @staticmethod
    async def gerar_relatorio_entrada_itens(
        session: AsyncSession,
        data_inicio: datetime,
        data_fim: datetime,
        formato: str
    ):
        itens = await ItemRepository.get_items_period(session, data_inicio, data_fim) # Usando ItemRepository diretamente

        # Formatar DataFrame acessando os dicionários retornados pelo repositório
        df = pd.DataFrame([{
            "ID_Item": item["item_id"],
            "Nome": item["nome_item_original"],
            "Quantidade": item["quantidade_item"],
            "Data_Entrada": item["data_entrada_item"].strftime('%d/%m/%Y'),
            "Categoria": item["nome_categoria_original"] # Agora acessa a chave correta do dicionário
        } for item in itens])

        # Exportar usando estratégia existente
        caminho_arquivo = os.path.join(Settings.PASTA_RELATORIOS, f"relatorio_entrada_itens.{formato}")
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

    @staticmethod
    async def gerar_relatorio_retiradas_usuario(
        session: AsyncSession,
        usuario_id: int,
        data_inicio: datetime,
        data_fim: datetime,
        formato: str
    ):
        try:
            retiradas = await RetiradaService.get_retiradas_por_usuario_periodo(
                session, usuario_id, data_inicio, data_fim
            )

            dados = []
            for retirada in retiradas:
                for item in retirada.itens:
                    dados.append({
                        "ID_Retirada": retirada.retirada_id,
                        "Data_Solicitacao": retirada.data_solicitacao.strftime('%d/%m/%Y'),
                        "Item": item.item.nome_item,
                        "Marca": item.item.marca_item,
                        "Quantidade_Retirada": item.quantidade_retirada,
                        "Usuario_Retirou_ID": retirada.usuario.usuario_id,
                        "Usuario_Retirou_Nome": retirada.usuario.nome_usuario,
                        "Usuario_Retirou_SIAPE": retirada.usuario.siape_usuario or "N/A",
                        "Usuario_Autorizou_ID": retirada.admin.usuario_id if retirada.admin else None,
                        "Usuario_Autorizou_Nome": retirada.admin.nome_usuario if retirada.admin else "N/A",
                        "Usuario_Autorizou_SIAPE": retirada.admin.siape_usuario if retirada.admin else "N/A",
                        "Status": StatusEnum(retirada.status).name
                    })

            df = pd.DataFrame(dados)
            caminho_arquivo = os.path.join(
                PASTA_RELATORIOS,
                f'relatorio_retiradas_usuario_{usuario_id}_{datetime.now().timestamp()}.{formato}'
            )
            export_strategy = CSVExportStrategy() if formato == "csv" else XLSXExportStrategy()
            export_strategy.export(df, caminho_arquivo)

            return caminho_arquivo

        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Erro ao gerar relatório: {str(e)}"
            )

