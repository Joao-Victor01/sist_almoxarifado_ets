#repositories\retirada_repository.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from models.retirada import Retirada
from models.retirada_item import RetiradaItem
from models.item import Item
from datetime import datetime
from models.retirada_item import RetiradaItem

class RetiradaRepository:

    @staticmethod
    async def criar_retirada(db: AsyncSession, retirada: Retirada):
        db.add(retirada)
        await db.flush()
        await db.refresh(retirada)
        return retirada

    @staticmethod
    async def adicionar_itens_retirada(db: AsyncSession, itens: list[RetiradaItem]):
        db.add_all(itens)
        await db.flush()

    @staticmethod
    async def buscar_retirada_por_id(db: AsyncSession, retirada_id: int):
        result = await db.execute(
            select(Retirada)
            .options(
                selectinload(Retirada.itens).selectinload(RetiradaItem.item),
                selectinload(Retirada.usuario),
                selectinload(Retirada.admin),
            )
            .where(Retirada.retirada_id == retirada_id)
        )
        return result.scalars().first()

    @staticmethod
    async def get_retiradas_pendentes(db: AsyncSession):
        result = await db.execute(
            select(Retirada)
            .options(
                selectinload(Retirada.itens).selectinload(RetiradaItem.item),
                selectinload(Retirada.usuario),
                selectinload(Retirada.admin),
            )
            .where(Retirada.status == 1)
        )
        return result.scalars().unique().all()

    @staticmethod
    async def get_retiradas(db: AsyncSession):
        result = await db.execute(
            select(Retirada)
            .options(
                selectinload(Retirada.itens).selectinload(RetiradaItem.item),
                selectinload(Retirada.usuario),
                selectinload(Retirada.admin),
            )
        )
        return result.scalars().unique().all()

    @staticmethod
    async def get_retiradas_por_setor_periodo(
        db: AsyncSession,
        setor_id: int,
        data_inicio: datetime,
        data_fim: datetime
    ):
        result = await db.execute(
            select(Retirada)
            .options(
                selectinload(Retirada.itens).selectinload(RetiradaItem.item),
                selectinload(Retirada.usuario),
                selectinload(Retirada.admin),
            )
            .where(
                Retirada.setor_id == setor_id,
                Retirada.data_solicitacao >= data_inicio,
                Retirada.data_solicitacao <= data_fim
            )
        )
        return result.scalars().unique().all()

    @staticmethod
    async def get_retiradas_por_usuario_periodo(
        db: AsyncSession,
        usuario_id: int,
        data_inicio: datetime,
        data_fim: datetime
    ):
        result = await db.execute(
            select(Retirada)
            .options(
                selectinload(Retirada.itens).selectinload(RetiradaItem.item),
                selectinload(Retirada.usuario),
                selectinload(Retirada.admin),
            )
            .where(
                Retirada.usuario_id == usuario_id,
                Retirada.data_solicitacao >= data_inicio,
                Retirada.data_solicitacao <= data_fim
            )
        )
        return result.scalars().unique().all()

    @staticmethod
    async def atualizar_retirada(db: AsyncSession, retirada: Retirada):
        await db.commit()
        await db.refresh(retirada)
        return retirada

    @staticmethod
    async def buscar_item_por_id(db: AsyncSession, item_id: int):
        result = await db.execute(select(Item).where(Item.item_id == item_id))
        return result.scalars().first()

    @staticmethod
    async def atualizar_quantidade_item(db: AsyncSession, item: Item, nova_quantidade: int):
        item.quantidade_item = nova_quantidade
        await db.flush()
        return item
