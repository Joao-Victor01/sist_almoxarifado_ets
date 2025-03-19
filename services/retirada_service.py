from sqlalchemy.ext.asyncio import AsyncSession
from repositories.retirada_repository import RetiradaRepository
from schemas.retirada import RetiradaCreate, RetiradaUpdateStatus

class RetiradaService:

    @staticmethod
    async def solicitar_retirada(db: AsyncSession, retirada_data: RetiradaCreate, usuario_id: int):
        return await RetiradaRepository.solicitar_retirada(db, retirada_data, usuario_id)

    @staticmethod
    async def atualizar_status(db: AsyncSession, retirada_id: int, status_data: RetiradaUpdateStatus, admin_id: int):
        return await RetiradaRepository.atualizar_status(db, retirada_id, status_data, admin_id)
