#services\relatorio_service.py

from sqlalchemy.ext.asyncio import AsyncSession
import pandas as pd
from models.retirada import StatusEnum
from core.configs import Settings
from services.export_strategy import CSVExportStrategy, XLSXExportStrategy
from services.categoria_service import CategoriaService
from repositories.item_repository import ItemRepository 
from services.retirada_service import RetiradaService
from utils.relatorio_itens import formatar_dados_relatorio
from fastapi import HTTPException
from datetime import datetime
import os
import unicodedata
from utils.normalizar_texto import normalize_name

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
            # 1. Tratar filtro de categoria: ID numérico ou texto
            categoria_ids = []
            if filtro_categoria:
                if filtro_categoria.isdigit():
                    cat = await CategoriaService.get_categoria_by_id(session, int(filtro_categoria))
                    if not cat:
                        raise HTTPException(status_code=404, detail="Categoria não encontrada")
                    categoria_ids = [cat.categoria_id]
                else:
                    cats = await CategoriaService.get_categorias_like(session, filtro_categoria)
                    if not cats:
                        raise HTTPException(status_code=404, detail="Nenhuma categoria encontrada com o termo fornecido")
                    categoria_ids = [c.categoria_id for c in cats]

            # 2. Normalizar e tratar filtro de produto
            filtro_normalizado = None
            if filtro_produto:
                filtro_normalizado = normalize_name(filtro_produto)

            # 3. Buscar itens
            itens = await ItemRepository.find_filtered(
                session,
                categoria_ids=categoria_ids or None,
                nome_produto_normalizado=filtro_normalizado
            )

            # 4. Formatar e exportar
            dados = formatar_dados_relatorio(itens)
            df = pd.DataFrame(dados)

            caminho_arquivo = os.path.join(
                PASTA_RELATORIOS,
                f"relatorio_quantidade_itens.{formato}"
            )
            export_strategy = CSVExportStrategy() if formato == "csv" else XLSXExportStrategy()
            export_strategy.export(df, caminho_arquivo)

            return caminho_arquivo

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Erro ao gerar relatório: {e}")
        
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

