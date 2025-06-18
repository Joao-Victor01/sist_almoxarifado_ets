#services/retirada_service.py

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime

from schemas.retirada import RetiradaOut
from models.retirada import Retirada, StatusEnum
from models.retirada_item import RetiradaItem
from repositories.retirada_repository import RetiradaRepository
from schemas.retirada import RetiradaCreate, RetiradaUpdateStatus, RetiradaPaginated, RetiradaFilterParams

from services.alerta_service import AlertaService
from utils.websocket_endpoints import manager

from models.usuario import Usuario, RoleEnum
from sqlalchemy.future import select

class RetiradaService:

    @staticmethod
    async def get_retiradas_paginadas(
        db: AsyncSession, page: int, page_size: int
    ) -> RetiradaPaginated:
        """Retorna uma lista paginada de todas as retiradas ativas."""
        total = await RetiradaRepository.count_retiradas(db)
        pages = (total + page_size - 1) // page_size if total > 0 else 1
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
        """Filtra e retorna retiradas ativas com paginação."""
        total = await RetiradaRepository.count_retiradas_filter(db, params)
        pages = (total + page_size - 1) // page_size if total > 0 else 1
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
            #1) Cria Retirada
            nova_retirada = Retirada(
                usuario_id=usuario_id,
                setor_id=retirada_data.setor_id,
                status=StatusEnum.PENDENTE,
                solicitado_localmente_por=retirada_data.solicitado_localmente_por,
                justificativa=retirada_data.justificativa,
                is_active=True # Garante que a nova retirada é criada como ativa
            )
            await RetiradaRepository.criar_retirada(db, nova_retirada)

            #2) Cria e adiciona itens
            itens_retirada = [
                RetiradaItem(
                    retirada_id=nova_retirada.retirada_id,
                    item_id=item.item_id,
                    quantidade_retirada=item.quantidade_retirada
                )
                for item in retirada_data.itens
            ]
            await RetiradaRepository.adicionar_itens_retirada(db, itens_retirada)

            #3) Commit
            await db.commit()

            #4) Recarrega com eager-load para serialização segura
            retirada_completa = await RetiradaRepository.buscar_retirada_por_id(
                db, nova_retirada.retirada_id
            )
            
            # Transmitir o evento de nova solicitação de retirada APENAS para usuários do Almoxarifado
            # Consulta para obter IDs de todos os usuários com o perfil de Almoxarifado
            almoxarifados = await db.execute(
                select(Usuario).where(Usuario.tipo_usuario == RoleEnum.USUARIO_ALMOXARIFADO.value)
            )
            for almoxarifado_user in almoxarifados.scalars().all():
                await manager.send_to_user(
                    almoxarifado_user.usuario_id,
                    {
                        "type": "new_withdrawal_request",
                        "retirada_id": retirada_completa.retirada_id,
                        "message": f"Nova solicitação de retirada do setor {retirada_completa.setor_id}"
                    }
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
                    if not item: # Garante que o item existe antes de tentar acessar seus atributos
                        raise HTTPException(
                            status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"Item com ID {ri.item_id} não encontrado."
                        )
                    if item.quantidade_item < ri.quantidade_retirada:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Estoque insuficiente para item {item.nome_item_original}. Quantidade disponível: {item.quantidade_item}, solicitada: {ri.quantidade_retirada}"
                        )
                    await RetiradaRepository.atualizar_quantidade_item(
                        db, item, item.quantidade_item - ri.quantidade_retirada
                    )
                    # Se a quantidade do item chegar a 0, marcar como inativo (soft delete)
                    if item.quantidade_item == 0:
                        item.ativo = False # Marca o item como inativo (soft delete para item)
                        await db.flush() # Garante que a mudança seja persistida antes do commit

                    await AlertaService.verificar_estoque_baixo(db, ri.item_id)

            retirada.status = status_data.status
            retirada.detalhe_status = status_data.detalhe_status
            retirada.autorizado_por = admin_id # Define quem autorizou/negou

            updated_retirada = await RetiradaRepository.atualizar_retirada(db, retirada)

            # Enviar notificação específica para o usuário que solicitou a retirada
            await manager.send_to_user(
                updated_retirada.usuario_id,
                {
                    "type": "withdrawal_status_update",
                    "retirada_id": updated_retirada.retirada_id,
                    "status": updated_retirada.status,
                    "message": f"Sua solicitação de retirada ID {updated_retirada.retirada_id} foi atualizada para {StatusEnum(updated_retirada.status).name}."
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
        """Retorna uma lista paginada de retiradas pendentes ativas."""
        total = await RetiradaRepository.count_retiradas_pendentes(db)
        pages = (total + page_size - 1) // page_size if total > 0 else 1
        offset = (page - 1) * page_size
        sqlalchemy_items = await RetiradaRepository.get_retiradas_pendentes_paginated(db, offset, page_size)
        items = [RetiradaOut.model_validate(ent) for ent in sqlalchemy_items]
        return RetiradaPaginated(total=total, page=page, pages=pages, items=items)

    @staticmethod
    async def get_all_retiradas(db: AsyncSession):
        """Retorna todas as retiradas ativas."""
        try:
            all_r = await RetiradaRepository.get_retiradas(db)
            if not all_r:
                raise HTTPException(status.HTTP_404_NOT_FOUND, "Não há retiradas")
            return all_r
        except Exception as e:
            raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"Erro: {e}")

    @staticmethod
    async def get_retirada_by_id(db: AsyncSession, retirada_id: int):
        """Busca uma retirada ativa pelo ID."""
        r = await RetiradaRepository.buscar_retirada_por_id(db, retirada_id)
        if not r:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Retirada não encontrada")
        return r

    @staticmethod
    async def get_retiradas_por_setor_periodo(db: AsyncSession, setor_id: int, data_inicio: datetime, data_fim: datetime):
        """Retorna retiradas ativas filtradas por setor e período."""
        try:
            res = await RetiradaRepository.get_retiradas_por_setor_periodo(db, setor_id, data_inicio, data_fim)
            if not res:
                raise HTTPException(status.HTTP_404_NOT_FOUND, "Nenhuma retirada nesse período/setor")
            return res
        except Exception as e:
            raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"Erro: {e}")

    @staticmethod
    async def get_retiradas_por_usuario_periodo(db: AsyncSession, usuario_id: int, data_inicio: datetime, data_fim: datetime):
        """Retorna retiradas ativas filtradas por usuário e período."""
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
        """Retorna uma lista paginada de retiradas ativas para um usuário específico."""
        total = await RetiradaRepository.count_retiradas_by_user(db, usuario_id)
        pages = (total + page_size - 1) // page_size if total > 0 else 1
        offset = (page - 1) * page_size
        sqlalchemy_items = await RetiradaRepository.get_retiradas_by_user_paginated(db, usuario_id, offset, page_size)
        items = [RetiradaOut.model_validate(ent) for ent in sqlalchemy_items]
        return RetiradaPaginated(total=total, page=page, pages=pages, items=items)

    @staticmethod
    async def soft_delete_retiradas_by_period(db: AsyncSession, start_date: datetime, end_date: datetime) -> dict:
        """
        Realiza o soft delete (inativa) retiradas dentro de um período específico.
        """
        # Adicionar validação de datas, se necessário (ex: data_inicio < data_fim)
        if start_date >= end_date:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "A data inicial deve ser anterior à data final.")

        updated_count = await RetiradaRepository.soft_delete_by_period(db, start_date, end_date)
        
        if updated_count == 0:
            return {"message": f"Nenhuma retirada encontrada no período de {start_date.strftime('%d/%m/%Y')} a {end_date.strftime('%d/%m/%Y')} para ser deletada.", "deleted_count": 0}

        return {"message": f"{updated_count} retiradas foram deletadas (inativadas) com sucesso no período de {start_date.strftime('%d/%m/%Y')} a {end_date.strftime('%d/%m/%Y')}.", "deleted_count": updated_count}