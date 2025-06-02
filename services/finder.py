# services/item/finder.py

from datetime import date, datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from models.item import Item


class ItemFinder:
    @staticmethod
    async def find_exact_match(
        db: AsyncSession,
        nome_item_normalizado: str,
        validade: date | datetime | None,
        categoria_id: int,
        marca_item: str | None,
    ) -> Item | None:
        query = select(Item).where(
            Item.nome_item == nome_item_normalizado,
            Item.categoria_id == categoria_id,
        )
        if validade is not None:
            query = query.where(Item.data_validade_item == validade)
        else:
            query = query.where(Item.data_validade_item.is_(None))
        if marca_item is not None:
            query = query.where(Item.marca_item == marca_item)
        else:
            query = query.where(Item.marca_item.is_(None))

        result = await db.execute(query)
        return result.scalars().first()
