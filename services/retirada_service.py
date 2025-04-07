#services\retirada_service.py

import os
from fastapi import HTTPException, status
from schemas.retirada import RetiradaCreate, RetiradaUpdateStatus
from models.retirada import Retirada
from models.retirada_item import RetiradaItem
from repositories.retirada_repository import RetiradaRepository
from sqlalchemy.ext.asyncio import AsyncSession
from models.retirada import StatusEnum
from datetime import datetime
from core.configs import Settings
from services.export_strategy import XLSXExportStrategy, CSVExportStrategy
from services.usuario_service import UsuarioService
import pandas as pd


class RetiradaService:

    @staticmethod
    async def solicitar_retirada(db: AsyncSession, retirada_data: RetiradaCreate, usuario_id: int):
        try:
            # Criar a entidade Retirada
            nova_retirada = Retirada(
                usuario_id=usuario_id,
                setor_id=retirada_data.setor_id,
                status=StatusEnum.PENDENTE,
                solicitado_localmente_por=retirada_data.solicitado_localmente_por,
                justificativa=retirada_data.justificativa
            )

            # Adicionar a retirada ao banco de dados
            await RetiradaRepository.criar_retirada(db, nova_retirada)

            # Criar os itens da retirada
            itens_retirada = [
                RetiradaItem(
                    retirada_id=nova_retirada.retirada_id,
                    item_id=item.item_id,
                    quantidade_retirada=item.quantidade_retirada
                )
                for item in retirada_data.itens
            ]

            # Adicionar os itens ao banco de dados
            await RetiradaRepository.adicionar_itens_retirada(db, itens_retirada)

            # Commit final
            await db.commit()
            return nova_retirada
        except Exception as e:
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erro ao solicitar retirada: {str(e)}"
            )

    @staticmethod
    async def atualizar_status(db: AsyncSession, retirada_id: int, status_data: RetiradaUpdateStatus, admin_id: int):
        try:
            if status_data.status not in {status.value for status in StatusEnum}:
                raise HTTPException(
                    status_code=400,
                    detail="Status inválido. Os valores permitidos são: 1 (PENDENTE), 2 (AUTORIZADA) ou 3 (CONCLUÍDA)."
                )

            # Buscar a retirada no banco de dados
            retirada = await RetiradaRepository.buscar_retirada_por_id(db, retirada_id)
            if not retirada:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Retirada não encontrada")

            # Verificar se o status é "Concluído" (status == 3)
            if status_data.status == StatusEnum.CONCLUIDA:
                for item in retirada.itens:
                    item_existente = await RetiradaRepository.buscar_item_por_id(db, item.item_id)
                    if not item_existente or item_existente.quantidade_item < item.quantidade_retirada:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Estoque insuficiente para o item {item.item_id}"
                        )
                    # Atualizar a quantidade do item no estoque
                    nova_quantidade = item_existente.quantidade_item - item.quantidade_retirada
                    await RetiradaRepository.atualizar_quantidade_item(db, item_existente, nova_quantidade)

            # Atualizar o status da retirada
            retirada.status = status_data.status
            retirada.detalhe_status = status_data.detalhe_status
            retirada.autorizado_por = admin_id

            # Salvar as alterações no banco de dados
            await RetiradaRepository.atualizar_retirada(db, retirada)
            return retirada
        except HTTPException as e:
            await db.rollback()
            raise e
        except Exception as e:
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erro ao atualizar status da retirada: {str(e)}"
            )

    @staticmethod
    async def get_retiradas_pendentes(db: AsyncSession):
        try:
            retiradas_pendentes = await RetiradaRepository.get_retiradas_pendentes(db)
            if not retiradas_pendentes:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Não há retiradas pendentes")
            return retiradas_pendentes
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erro ao listar retiradas pendentes: {str(e)}"
            )
        
    @staticmethod
    async def get_retiradas_por_setor_periodo(
        db: AsyncSession,
        setor_id: int,
        data_inicio: datetime,
        data_fim: datetime
    ):

        result = await RetiradaRepository.get_retiradas_por_setor_periodo(db, setor_id, data_inicio, data_fim) 
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="Não há retiradas para esse setor ou período"
                )
        return result
    

    @staticmethod
    async def gerar_relatorio_retiradas_usuario(
        session: AsyncSession,
        usuario_id: int,
        data_inicio: datetime,
        data_fim: datetime,
        formato: str
    ):
        try:
            retiradas = await RetiradaRepository.get_retiradas_por_usuario_periodo(
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
                        "Quantidade": item.quantidade_retirada,
                        "Usuario_Retirou_ID": retirada.usuario.usuario_id,
                        "Usuario_Retirou_Nome": retirada.usuario.nome_usuario,
                        "Usuario_Retirou_SIAPE": retirada.usuario.siape_usuario,
                        "Usuario_Autorizou_ID": retirada.admin.usuario_id if retirada.admin else None,
                        "Usuario_Autorizou_Nome": retirada.admin.nome_usuario if retirada.admin else "N/A",
                        "Usuario_Autorizou_SIAPE": retirada.admin.siape_usuario if retirada.admin else "N/A",
                        "Status": StatusEnum(retirada.status).name
                    })

            df = pd.DataFrame(dados)
            
            caminho_arquivo = os.path.join(Settings.PASTA_RELATORIOS, f'relatorio_retiradas_usuario_{usuario_id}_{datetime.now().timestamp()}.{formato}')
            
            export_strategy = CSVExportStrategy() if formato == "csv" else XLSXExportStrategy()
            export_strategy.export(df, caminho_arquivo)
            
            return caminho_arquivo

        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Erro ao gerar relatório: {str(e)}"
            )
        
    @staticmethod
    async def get_retiradas_por_usuario_periodo(
        db: AsyncSession,
        usuario_id: int,
        data_inicio: datetime,
        data_fim: datetime
    ):
        user = await UsuarioService.get_usuario_by_id(db, usuario_id)

        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, 
                                detail="Usuário não encontrado")
        
        return await RetiradaRepository.get_retiradas_por_usuario_periodo(db, usuario_id, data_inicio, data_fim)