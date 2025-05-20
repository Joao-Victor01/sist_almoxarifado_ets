#repositories\retirada_repository.py

from sqlalchemy import func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload, aliased
from schemas.retirada import RetiradaFilterParams
from models.retirada import Retirada, StatusEnum
from models.retirada_item import RetiradaItem
from models.item import Item
from models.usuario import Usuario
from models.retirada_item import RetiradaItem
from datetime import datetime


class RetiradaRepository:

    @staticmethod
    async def count_retiradas(db: AsyncSession) -> int:
        result = await db.execute(select(func.count(Retirada.retirada_id)))
        return result.scalar_one()

    @staticmethod
    async def get_retiradas_paginated(db: AsyncSession, offset: int, limit: int):
        q = (
            select(Retirada)
            .options(
                selectinload(Retirada.itens).selectinload(RetiradaItem.item),
                selectinload(Retirada.usuario),
                selectinload(Retirada.admin),
            )
            .offset(offset)
            .limit(limit)
        )
        result = await db.execute(q)
        return result.scalars().all()

    @staticmethod
    async def filter_retiradas(db: AsyncSession, params: RetiradaFilterParams):
        q = select(Retirada).options(
            selectinload(Retirada.itens).selectinload(RetiradaItem.item),
            selectinload(Retirada.usuario),
            selectinload(Retirada.admin),
        )
        conditions = []
        # filtrar por status
        if params.status:
            conditions.append(Retirada.status == params.status)
        # filtrar por solicitante (nome ou solicitado_localmente_por)
        if params.solicitante:
            usuario_alias = aliased(Usuario)
            q = q.join(usuario_alias, Retirada.usuario)
            conditions.append(
                or_(
                    usuario_alias.nome_usuario.ilike(f"%{params.solicitante}%"),
                    Retirada.solicitado_localmente_por.ilike(f"%{params.solicitante}%")
                )
            )
        # filtrar por período
        if params.start_date and params.end_date:
            conditions.append(
                and_(
                    Retirada.data_solicitacao >= params.start_date,
                    Retirada.data_solicitacao <= params.end_date
                )
            )
        if conditions:
            q = q.where(*conditions)
        result = await db.execute(q)
        return result.scalars().all()

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
