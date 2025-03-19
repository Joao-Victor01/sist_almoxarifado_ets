#repositories\alerta_repository.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from models.alerta import Alerta
from schemas.alerta import AlertaBase
from fastapi import HTTPException, status
from datetime import datetime

class AlertaRepository:

    @staticmethod
    async def create_alerta(db: AsyncSession, alerta_data: AlertaBase):
        # Criando um novo alerta
        novo_alerta = Alerta(
            tipo_alerta=alerta_data.tipo_alerta,
            item_id=alerta_data.item_id,
            data_alerta=datetime.now()
        )

        db.add(novo_alerta)
        await db.commit()
        await db.refresh(novo_alerta)
        return novo_alerta

    @staticmethod
    async def get_alertas(db: AsyncSession):
        result = await db.execute(select(Alerta))
        alertas = result.scalars().all()
        return alertas

    @staticmethod
    async def get_alerta_by_id(db: AsyncSession, alerta_id: int):
        result = await db.execute(select(Alerta).where(Alerta.alerta_id == alerta_id))
        alerta = result.scalars().first()
        if not alerta:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alerta não encontrado")
        return alerta

    @staticmethod
    async def delete_alerta(db: AsyncSession, alerta_id: int):
        alerta = await AlertaRepository.get_alerta_by_id(db, alerta_id)
        await db.delete(alerta)
        await db.commit()
        return {"message": "Alerta deletado com sucesso"}
