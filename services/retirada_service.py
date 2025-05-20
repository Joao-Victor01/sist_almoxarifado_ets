# services\retirada_service.py

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
from schemas.retirada import RetiradaOut
from models.retirada import Retirada, StatusEnum
from models.retirada_item import RetiradaItem
from repositories.retirada_repository import RetiradaRepository
from schemas.retirada import RetiradaCreate, RetiradaUpdateStatus, RetiradaPaginated, RetiradaFilterParams
from services.alerta_service import AlertaService

class RetiradaService:
    
    @staticmethod
    async def get_retiradas_paginadas(db: AsyncSession, page: int, page_size: int) -> RetiradaPaginated:
        total = await RetiradaRepository.count_retiradas(db)
        pages = (total + page_size - 1) // page_size
        offset = (page - 1) * page_size

        sqlalchemy_items = await RetiradaRepository.get_retiradas_paginated(db, offset, page_size)
        items = [RetiradaOut.model_validate(ent) for ent in sqlalchemy_items]

        return RetiradaPaginated(
            total=total,
            page=page,
            pages=pages,
            items=items
        )

    @staticmethod
    async def filter_retiradas(db: AsyncSession, params: RetiradaFilterParams) -> list[Retirada]:
        return await RetiradaRepository.filter_retiradas(db, params)

    @staticmethod
    async def solicitar_retirada(db: AsyncSession, retirada_data: RetiradaCreate, usuario_id: int):
        try:
            # 1) cria Retirada
            nova_retirada = Retirada(
                usuario_id=usuario_id,
                setor_id=retirada_data.setor_id,
                status=StatusEnum.PENDENTE,
                solicitado_localmente_por=retirada_data.solicitado_localmente_por,
                justificativa=retirada_data.justificativa
            )
            await RetiradaRepository.criar_retirada(db, nova_retirada)

            # 2) cria e adiciona itens
            itens_retirada = [
                RetiradaItem(
                    retirada_id=nova_retirada.retirada_id,
                    item_id=item.item_id,
                    quantidade_retirada=item.quantidade_retirada
                )
                for item in retirada_data.itens
            ]
            await RetiradaRepository.adicionar_itens_retirada(db, itens_retirada)

            # 3) commit
            await db.commit()

            # 4) recarrega com eager-load para serialização segura
            retirada_completa = await RetiradaRepository.buscar_retirada_por_id(
                db, nova_retirada.retirada_id
            )
            return retirada_completa

        except Exception as e:
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erro ao solicitar retirada: {e}"
            )

    @staticmethod
    async def atualizar_status(db: AsyncSession, retirada_id: int, status_data: RetiradaUpdateStatus, admin_id: int):
        try:
            if status_data.status not in {s.value for s in StatusEnum}:
                raise HTTPException(400, "Status inválido.")

            retirada = await RetiradaRepository.buscar_retirada_por_id(db, retirada_id)
            if not retirada:
                raise HTTPException(status.HTTP_404_NOT_FOUND, "Retirada não encontrada")

            # se concluindo, decrementa estoques
            if status_data.status == StatusEnum.CONCLUIDA:
                for ri in retirada.itens:
                    item = await RetiradaRepository.buscar_item_por_id(db, ri.item_id)
                    if item.quantidade_item < ri.quantidade_retirada:
                        raise HTTPException(
                            status.HTTP_400_BAD_REQUEST,
                            f"Estoque insuficiente para item {ri.item_id}"
                        )
                    await RetiradaRepository.atualizar_quantidade_item(
                        db, item, item.quantidade_item - ri.quantidade_retirada
                    )
                    await AlertaService.verificar_estoque_baixo(db, ri.item_id)

            retirada.status = status_data.status
            retirada.detalhe_status = status_data.detalhe_status
            retirada.autorizado_por = admin_id

            updated = await RetiradaRepository.atualizar_retirada(db, retirada)
            return updated

        except HTTPException:
            await db.rollback()
            raise
        except Exception as e:
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erro ao atualizar status: {e}"
            )

    @staticmethod
    async def get_retiradas_pendentes(db: AsyncSession):
        try:
            pend = await RetiradaRepository.get_retiradas_pendentes(db)
            if not pend:
                raise HTTPException(status.HTTP_404_NOT_FOUND, "Não há retiradas pendentes")
            return pend
        except Exception as e:
            raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"Erro: {e}")

    @staticmethod
    async def get_all_retiradas(db: AsyncSession):
        try:
            allr = await RetiradaRepository.get_retiradas(db)
            if not allr:
                raise HTTPException(status.HTTP_404_NOT_FOUND, "Não há retiradas")
            return allr
        except Exception as e:
            raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"Erro: {e}")

    @staticmethod
    async def get_retirada_by_id(db: AsyncSession, retirada_id: int):
        r = await RetiradaRepository.buscar_retirada_por_id(db, retirada_id)
        if not r:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Retirada não encontrada")
        return r

    @staticmethod
    async def get_retiradas_por_setor_periodo(db: AsyncSession, setor_id: int, data_inicio: datetime, data_fim: datetime):
        try:
            res = await RetiradaRepository.get_retiradas_por_setor_periodo(db, setor_id, data_inicio, data_fim)
            if not res:
                raise HTTPException(status.HTTP_404_NOT_FOUND, "Nenhuma retirada nesse período/setor")
            return res
        except Exception as e:
            raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"Erro: {e}")

    @staticmethod
    async def get_retiradas_por_usuario_periodo(db: AsyncSession, usuario_id: int, data_inicio: datetime, data_fim: datetime):
        try:
            res = await RetiradaRepository.get_retiradas_por_usuario_periodo(db, usuario_id, data_inicio, data_fim)
            if not res:
                raise HTTPException(status.HTTP_404_NOT_FOUND, "Nenhuma retirada para esse usuário")
            return res
        except Exception as e:
            raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"Erro: {e}")
