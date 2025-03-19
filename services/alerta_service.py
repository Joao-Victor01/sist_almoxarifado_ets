#services\alerta_service.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import datetime, timedelta
from repositories.alerta_repository import AlertaRepository
from models.item import Item
from fastapi import HTTPException, status
from schemas.alerta import AlertaBase

class AlertaService:

    @staticmethod
    async def create_alerta(db: AsyncSession, alerta_data: AlertaBase):
        return await AlertaRepository.create_alerta(db, alerta_data)

    @staticmethod
    async def get_alertas(db: AsyncSession):
        return await AlertaRepository.get_alertas(db)

    @staticmethod
    async def get_alerta_by_id(db: AsyncSession, alerta_id: int):
        return await AlertaRepository.get_alerta_by_id(db, alerta_id)

    @staticmethod
    async def delete_alerta(db: AsyncSession, alerta_id: int):
        return await AlertaRepository.delete_alerta(db, alerta_id)

    @staticmethod
    async def generate_alerts_for_items(db: AsyncSession):
        now = datetime.now()

        # Alerta para validade
        threshold_date = now + timedelta(days=60)
        items_near_expiry = await db.execute(
            select(Item).where(Item.data_validade_item <= threshold_date)
        )
        items_near_expiry = items_near_expiry.scalars().all()

        # Alerta para estoque baixo
        items_below_minimum = await db.execute(
            select(Item).where(Item.quantidade_item <= Item.quantidade_minima_item)
        )
        items_below_minimum = items_below_minimum.scalars().all()
