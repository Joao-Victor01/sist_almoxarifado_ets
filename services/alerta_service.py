#services\alerta_service.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta
from models.alerta import TipoAlerta
from models.item import Item
from repositories.alerta_repository import AlertaRepository
from schemas.alerta import AlertaBase
from fastapi import HTTPException, status

class AlertaService:
    
    @staticmethod
    async def generate_daily_alerts(db: AsyncSession):
        # Verificar validade e estoque juntos
        await AlertaService.verificar_validade_itens(db)
        await AlertaService.verificar_estoque_baixo(db)

    @staticmethod
    async def verificar_validade_itens(db: AsyncSession):
        threshold_date = datetime.now() + timedelta(days=60)
        items = await db.execute(
            select(Item).where(Item.data_validade_item <= threshold_date))
        for item in items.scalars():
            alerta_existe = await AlertaRepository.alerta_ja_existe(
                db, TipoAlerta.VALIDADE_PROXIMA.value, item.item_id
            )
            if not alerta_existe:
                await AlertaRepository.create_alerta(db, AlertaBase(
                    tipo_alerta=2,
                    mensagem_alerta=f"Item {item.nome_item} próximo da validade",
                    item_id=item.item_id,
                    data_alerta=datetime.now()
                ))

    @staticmethod
    async def get_alertas(db:AsyncSession):
        result = await AlertaRepository.get_alertas(db)
        if not result:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail="Não foram encontrados alertas na base de dados"
                                )
        return result

    @staticmethod
    async def verificar_estoque_baixo(db: AsyncSession, item_id: int = None):
        query = select(Item)
        if item_id:
            query = query.where(Item.item_id == item_id)
        query = query.where(Item.quantidade_item <= Item.quantidade_minima_item)
        
        items = await db.execute(query)
        for item in items.scalars():
            alerta_existe = await AlertaRepository.alerta_ja_existe(
                db, TipoAlerta.ESTOQUE_BAIXO.value, item.item_id
            )
            if not alerta_existe:
                await AlertaRepository.create_alerta(db, AlertaBase(
                    tipo_alerta=1,
                    mensagem_alerta=f"Estoque de {item.nome_item} abaixo do mínimo",
                    item_id=item.item_id,
                    data_alerta=datetime.now()
                ))

    @staticmethod
    async def get_alerta_by_id(db: AsyncSession, alerta_id: int):
        result = await AlertaRepository.get_alerta_by_id(db, alerta_id)
        if not result:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alerta não encontrado")
        return result
    
