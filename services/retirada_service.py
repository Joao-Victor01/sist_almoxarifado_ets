#services\retirada_service.py

from fastapi import HTTPException, status
from schemas.retirada import RetiradaCreate, RetiradaUpdateStatus
from models.retirada import Retirada
from models.retirada_item import RetiradaItem
from repositories.retirada_repository import RetiradaRepository
from sqlalchemy.ext.asyncio import AsyncSession
from models.retirada import StatusEnum


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