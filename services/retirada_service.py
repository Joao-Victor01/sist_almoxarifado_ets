
# services/retirada_service.py
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
from schemas.retirada import RetiradaOut
from models.retirada import Retirada, StatusEnum
from models.retirada_item import RetiradaItem
from repositories.retirada_repository import RetiradaRepository
from schemas.retirada import RetiradaCreate, RetiradaUpdateStatus, RetiradaPaginated, RetiradaFilterParams
from services.alerta_service import AlertaService
from utils.websocket_endpoints import manager # Importar o manager

class RetiradaService:
    @staticmethod
    async def get_retiradas_paginadas(
        db: AsyncSession, page: int, page_size: int
    ) -> RetiradaPaginated:
        """Retorna uma lista paginada de todas as retiradas."""
        total = await RetiradaRepository.count_retiradas(db)
        pages = (total + page_size - 1) // page_size
        offset = (page - 1) * page_size
        sqlalchemy_items = await RetiradaRepository.get_retiradas_paginated(db, offset, page_size)
        items = [RetiradaOut.model_validate(ent) for ent in sqlalchemy_items]
        return RetiradaPaginated(total=total, page=page, pages=pages, items=items)

    @staticmethod
    async def filter_retiradas_paginated(
        db: AsyncSession,
        params: RetiradaFilterParams,
        page: int,
        page_size: int
    ) -> RetiradaPaginated:
        """Filtra e retorna retiradas com paginação."""
        total = await RetiradaRepository.count_retiradas_filter(db, params)
        pages = (total + page_size - 1) // page_size
        offset = (page - 1) * page_size
        sqlalchemy_items = await RetiradaRepository.filter_retiradas_paginated(
            db, params, offset, page_size
        )
        items = [RetiradaOut.model_validate(ent) for ent in sqlalchemy_items]
        return RetiradaPaginated(total=total, page=page, pages=pages, items=items)

    @staticmethod
    async def solicitar_retirada(db: AsyncSession, retirada_data: RetiradaCreate, usuario_id: int):
        """Cria uma nova solicitação de retirada e seus itens associados."""
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

            # NOVO: Transmitir o evento de nova solicitação de retirada via WebSocket
            # Esta notificação ainda vai para as conexões gerais, pois é um alerta para o almoxarifado
            await manager.broadcast({
                "type": "new_withdrawal_request",
                "retirada_id": retirada_completa.retirada_id,
                "message": f"Nova solicitação de retirada do setor {retirada_completa.setor_id} ID: {retirada_completa.retirada_id}"
            })

            return retirada_completa
        except Exception as e:
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erro ao solicitar retirada: {e}"
            )

    @staticmethod
    async def atualizar_status(db: AsyncSession, retirada_id: int, status_data: RetiradaUpdateStatus, admin_id: int):
        """Atualiza o status de uma retirada e, se concluída, decrementa o estoque dos itens."""
        try:
            if status_data.status not in (s.value for s in StatusEnum):
                raise HTTPException(400, "Status inválido.")

            retirada = await RetiradaRepository.buscar_retirada_por_id(db, retirada_id)
            if not retirada:
                raise HTTPException(status.HTTP_404_NOT_FOUND, "Retirada não encontrada")

            # Se concluindo, decrementa estoques
            if status_data.status == StatusEnum.CONCLUIDA:
                for ri in retirada.itens:
                    item = await RetiradaRepository.buscar_item_por_id(db, ri.item_id)
                    
                    if item.quantidade_item < ri.quantidade_retirada:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Estoque insuficiente para item {item.nome_item_original}. Quantidade disponível: {item.quantidade_item}, Quantidade solicitada: {ri.quantidade_retirada}"
                        )
                    await RetiradaRepository.atualizar_quantidade_item(
                        db, item, item.quantidade_item - ri.quantidade_retirada
                    )
                    # NOVO: Se a quantidade do item chegar a 0, marcar como inativo (soft delete)
                    if item.quantidade_item == 0:
                        item.ativo = False # Marca o item como inativo
                        await db.flush() # Garante que a mudança seja persistida antes do commit
                    
                    await AlertaService.verificar_estoque_baixo(db, ri.item_id)

            retirada.status = status_data.status
            retirada.detalhe_status = status_data.detalhe_status
            retirada.autorizado_por = admin_id

            updated_retirada = await RetiradaRepository.atualizar_retirada(db, retirada)

            # NOVO: Enviar notificação específica para o usuário que solicitou a retirada
            await manager.send_to_user(
                updated_retirada.usuario_id,
                {
                    "type": "withdrawal_status_update",
                    "retirada_id": updated_retirada.retirada_id,
                    "status": updated_retirada.status,
                    "message": f"Sua solicitação de retirada ID {updated_retirada.retirada_id} foi atualizada para: {StatusEnum(updated_retirada.status).name}"
                }
            )
            return updated_retirada

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
    async def get_retiradas_pendentes_paginated(
        db: AsyncSession, page: int, page_size: int
    ) -> RetiradaPaginated:
        """Retorna uma lista paginada de retiradas pendentes."""
        total = await RetiradaRepository.count_retiradas_pendentes(db)
        pages = (total + page_size - 1) // page_size
        offset = (page - 1) * page_size
        sqlalchemy_items = await RetiradaRepository.get_retiradas_pendentes_paginated(db, offset, page_size)
        items = [RetiradaOut.model_validate(ent) for ent in sqlalchemy_items]
        return RetiradaPaginated(total=total, page=page, pages=pages, items=items)

    @staticmethod
    async def get_all_retiradas(db: AsyncSession):
        """Retorna todas as retiradas."""
        try:
            all_r = await RetiradaRepository.get_retiradas(db)
            if not all_r:
                raise HTTPException(status.HTTP_404_NOT_FOUND, "Não há retiradas")
            return all_r
        except Exception as e:
            raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"Erro: {e}")

    @staticmethod
    async def get_retirada_by_id(db: AsyncSession, retirada_id: int):
        """Busca uma retirada pelo ID."""
        r = await RetiradaRepository.buscar_retirada_por_id(db, retirada_id)
        if not r:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Retirada não encontrada")
        return r

    @staticmethod
    async def get_retiradas_por_setor_periodo(db: AsyncSession, setor_id: int, data_inicio: datetime, data_fim: datetime):
        """Retorna retiradas filtradas por setor e período."""
        try:
            res = await RetiradaRepository.get_retiradas_por_setor_periodo(db, setor_id, data_inicio, data_fim)
            if not res:
                raise HTTPException(status.HTTP_404_NOT_FOUND, "Nenhuma retirada nesse período/setor")
            return res
        except Exception as e:
            raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"Erro: {e}")

    @staticmethod
    async def get_retiradas_por_usuario_periodo(db: AsyncSession, usuario_id: int, data_inicio: datetime, data_fim: datetime):
        """Retorna retiradas filtradas por usuário e período."""
        try:
            res = await RetiradaRepository.get_retiradas_por_usuario_periodo(db, usuario_id, data_inicio, data_fim)
            if not res:
                raise HTTPException(status.HTTP_404_NOT_FOUND, "Nenhuma retirada para esse usuário")
            return res
        except Exception as e:
            raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"Erro: {e}")

    @staticmethod
    async def get_retiradas_by_user_paginated(
        db: AsyncSession, usuario_id: int, page: int, page_size: int
    ) -> RetiradaPaginated:
        """Retorna uma lista paginada de retiradas para um usuário específico."""
        total = await RetiradaRepository.count_retiradas_by_user(db, usuario_id)
        pages = (total + page_size - 1) // page_size
        offset = (page - 1) * page_size
        sqlalchemy_items = await RetiradaRepository.get_retiradas_by_user_paginated(db, usuario_id, offset, page_size)
        items = [RetiradaOut.model_validate(ent) for ent in sqlalchemy_items]
        return RetiradaPaginated(total=total, page=page, pages=pages, items=items)