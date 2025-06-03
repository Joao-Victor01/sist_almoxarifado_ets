# repositories/item_repository.py

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from models.item import Item
from models.categoria import Categoria

class ItemRepository:

    @staticmethod
    async def create(db: AsyncSession, item: Item) -> Item:
        db.add(item)
        await db.commit()
        await db.refresh(item)
        return item

    @staticmethod
    async def get_all(db: AsyncSession) -> list[Item]:
        # Retorna apenas itens ativos
        result = await db.execute(select(Item).where(Item.ativo == True))
        return result.scalars().all()

    @staticmethod
    async def get_by_id(db: AsyncSession, item_id: int) -> Item | None:
        # Retorna apenas itens ativos
        result = await db.execute(select(Item).where(Item.item_id == item_id, Item.ativo == True))
        return result.scalars().first()

    @staticmethod
    async def delete(db: AsyncSession, item: Item) -> None:
        # Soft delete: marca o item como inativo
        item.ativo = False
        await db.commit()
        await db.refresh(item) # Atualiza o objeto item no Python com o novo estado
        # Não é necessário db.delete(item) para soft delete

    @staticmethod
    async def count(db: AsyncSession) -> int:
        # Conta apenas itens ativos
        result = await db.execute(select(func.count()).select_from(Item).where(Item.ativo == True))
        return result.scalar_one()

    @staticmethod
    async def get_paginated(db: AsyncSession, offset: int, limit: int) -> list[Item]:
        # Retorna apenas itens ativos
        result = await db.execute(select(Item).where(Item.ativo == True).offset(offset).limit(limit))
        return result.scalars().all()

    @staticmethod
    async def find_filtered(
        db: AsyncSession,
        categoria_ids: list[int] | None = None,
        nome_produto_normalizado: str | None = None,
    ) -> list[tuple[Item, str]]:
        # Filtra apenas itens ativos
        query = select(Item, Categoria.nome_categoria).join(
            Categoria, Item.categoria_id == Categoria.categoria_id
        ).where(Item.ativo == True) # Adiciona filtro de ativo

        if categoria_ids:
            query = query.where(Item.categoria_id.in_(categoria_ids))

        if nome_produto_normalizado:
            query = query.where(
                Item.nome_item.ilike(f"%{nome_produto_normalizado}%")
            )

        result = await db.execute(query)
        return result.all()

    @staticmethod
    async def count_filtered(
        db: AsyncSession,
        categoria_ids: list[int] | None = None,
        nome_produto_normalizado: str | None = None,
    ) -> int:
        # Conta apenas itens ativos
        query = select(func.count()).select_from(Item).where(Item.ativo == True) # Adiciona filtro de ativo
        if categoria_ids:
            query = query.where(Item.categoria_id.in_(categoria_ids))

        if nome_produto_normalizado:
            query = query.where(
                Item.nome_item.ilike(f"%{nome_produto_normalizado}%")
            )

        result = await db.execute(query)
        return result.scalar_one()

    @staticmethod
    async def get_filtered_paginated(
        db: AsyncSession,
        categoria_ids: list[int] | None = None,
        nome_produto_normalizado: str | None = None,
        offset: int = 0,
        limit: int = 10,
    ) -> list[Item]:
        # Retorna apenas itens ativos
        query = select(Item).where(Item.ativo == True) # Adiciona filtro de ativo

        if categoria_ids:
            query = query.where(Item.categoria_id.in_(categoria_ids))

        if nome_produto_normalizado:
            query = query.where(
                Item.nome_item.ilike(f"%{nome_produto_normalizado}%")
            )

        query = query.offset(offset).limit(limit)
        result = await db.execute(query)
        return result.scalars().all()

    @staticmethod
    async def get_items_by_category(db: AsyncSession, categoria_id: int) -> list[Item]:
        # Retorna apenas itens ativos
        result = await db.execute(select(Item).where(Item.categoria_id == categoria_id, Item.ativo == True))
        return result.scalars().all()

    @staticmethod
    async def get_items_period(
        db: AsyncSession, data_inicio, data_fim
    ) -> list[dict]:
        # Retorna apenas itens ativos
        query = (
            select(
                Item.item_id,
                Item.nome_item_original,
                Item.quantidade_item,
                Item.data_entrada_item,
                Categoria.nome_original.label("nome_categoria_original"),
            )
            .join(Categoria, Item.categoria_id == Categoria.categoria_id)
            .where(
                Item.data_entrada_item >= data_inicio,
                Item.data_entrada_item <= data_fim,
                Item.ativo == True # Adiciona filtro de ativo
            )
        )
        result = await db.execute(query)
        return result.mappings().all()

    @staticmethod
    async def get_items_expiring_before(db: AsyncSession, date) -> list[Item]:
        # Retorna apenas itens ativos
        result = await db.execute(
            select(Item).where(Item.data_validade_item <= date, Item.ativo == True) # Adiciona filtro de ativo
        )
        return result.scalars().all()

    @staticmethod
    async def find_low_stock(db: AsyncSession) -> list[Item]:
        # Retorna apenas itens ativos
        result = await db.execute(
            select(Item).where(Item.quantidade_item < Item.quantidade_minima_item, Item.ativo == True) # Adiciona filtro de ativo
        )
        return result.scalars().all()
