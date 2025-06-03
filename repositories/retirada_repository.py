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
        """
        Conta o total de retiradas no banco de dados.
        """
        result = await db.execute(select(func.count(Retirada.retirada_id)))
        return result.scalar_one()

    @staticmethod
    async def get_retiradas_paginated(db: AsyncSession, offset: int, limit: int):
        """
        Retorna uma lista paginada de retiradas, com eager loading de itens, usuário e admin.
        """
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
        return (await db.execute(q)).scalars().all()

    @staticmethod
    async def count_retiradas_pendentes(db: AsyncSession) -> int:
        """
        Conta o total de retiradas com status PENDENTE.
        """
        result = await db.execute(select(func.count(Retirada.retirada_id)).where(Retirada.status == StatusEnum.PENDENTE))
        return result.scalar_one()

    @staticmethod
    async def filter_retiradas_paginated(
        db: AsyncSession,
        params: RetiradaFilterParams,
        offset: int,
        limit: int
    ):
        """
        Filtra e retorna retiradas paginadas com base nos parâmetros fornecidos,
        com eager loading de itens, usuário e admin.
        """
        q = select(Retirada)
        q = q.options(
            selectinload(Retirada.itens).selectinload(RetiradaItem.item),
            selectinload(Retirada.usuario),
            selectinload(Retirada.admin),
        )
        conditions = []
        if params.status is not None:
            conditions.append(Retirada.status == params.status)
        if params.solicitante:
            alias = aliased(Usuario)
            q = q.join(alias, Retirada.usuario)
            conditions.append(
                or_(alias.nome_usuario.ilike(f"%{params.solicitante}%"),
                    Retirada.solicitado_localmente_por.ilike(f"%{params.solicitante}%"))
            )
        if params.start_date and params.end_date:
            conditions.append(
                and_(Retirada.data_solicitacao >= params.start_date,
                     Retirada.data_solicitacao <= params.end_date)
            )
        if conditions:
            q = q.where(*conditions)
        q = q.offset(offset).limit(limit)
        return (await db.execute(q)).scalars().all()

    @staticmethod
    async def criar_retirada(db: AsyncSession, retirada: Retirada):
        """
        Adiciona uma nova retirada ao banco de dados e a atualiza para obter o ID.
        """
        db.add(retirada)
        await db.flush()
        await db.refresh(retirada)
        return retirada

    @staticmethod
    async def adicionar_itens_retirada(db: AsyncSession, itens: list[RetiradaItem]):
        """
        Adiciona múltiplos itens a uma retirada no banco de dados.
        """
        db.add_all(itens)
        await db.flush()

    @staticmethod
    async def buscar_retirada_por_id(db: AsyncSession, retirada_id: int):
        """
        Busca uma retirada específica pelo ID, com eager loading de itens, usuário e admin.
        """
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
    async def get_retiradas_pendentes_paginated(db: AsyncSession, offset: int, limit: int):
        """
        Retorna uma lista paginada de retiradas pendentes, com eager loading.
        """
        q = (
            select(Retirada)
            .options(
                selectinload(Retirada.itens).selectinload(RetiradaItem.item),
                selectinload(Retirada.usuario),
                selectinload(Retirada.admin),
            )
            .where(Retirada.status == StatusEnum.PENDENTE)
            .offset(offset)
            .limit(limit)
        )
        return (await db.execute(q)).scalars().all()

    @staticmethod
    async def count_retiradas_filter(db: AsyncSession, params: RetiradaFilterParams) -> int:
        """
        Conta o total de retiradas filtradas com base nos parâmetros fornecidos.
        """
        q = select(func.count(Retirada.retirada_id))
        conditions = []
        if params.status is not None:
            conditions.append(Retirada.status == params.status)
        if params.solicitante:
            alias = aliased(Usuario)
            q = q.select_from(Retirada).join(alias, Retirada.usuario)
            conditions.append(
                or_(alias.nome_usuario.ilike(f"%{params.solicitante}%"),
                    Retirada.solicitado_localmente_por.ilike(f"%{params.solicitante}%"))
            )
        if params.start_date and params.end_date:
            conditions.append(
                and_(Retirada.data_solicitacao >= params.start_date,
                     Retirada.data_solicitacao <= params.end_date)
            )
        if conditions:
            q = q.where(*conditions)
        return (await db.execute(q)).scalar_one()

    @staticmethod
    async def get_retiradas(db: AsyncSession):
        """
        Retorna todas as retiradas (sem paginação), com eager loading.
        """
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
        """
        Retorna retiradas filtradas por setor e período, com eager loading.
        """
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
        """
        Retorna retiradas filtradas por usuário e período, com eager loading.
        """
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
        """
        Atualiza uma retirada existente no banco de dados.
        """
        # O objeto `retirada` já deve estar no estado gerenciado pela sessão ou ser adicionado
        # db.add(retirada) # Pode ser necessário se o objeto não estiver gerenciado
        await db.commit()
        await db.refresh(retirada)
        return retirada

    @staticmethod
    async def buscar_item_por_id(db: AsyncSession, item_id: int):
        """
        Busca um item pelo ID.
        """
        result = await db.execute(select(Item).where(Item.item_id == item_id))
        return result.scalars().first()

    @staticmethod
    async def atualizar_quantidade_item(db: AsyncSession, item: Item, nova_quantidade: int):
        """
        Atualiza a quantidade de um item no estoque.
        """
        item.quantidade_item = nova_quantidade
        await db.flush()
        return item

    #  Retorna retiradas paginadas para um usuário específico
    @staticmethod
    async def get_retiradas_by_user_paginated(db: AsyncSession, usuario_id: int, offset: int, limit: int):
        """
        Retorna retiradas paginadas para um usuário específico, com eager loading de itens, usuário e admin.
        """
        query = select(Retirada).where(Retirada.usuario_id == usuario_id).options(
            selectinload(Retirada.itens).selectinload(RetiradaItem.item),
            selectinload(Retirada.usuario),
            selectinload(Retirada.admin),
        ).offset(offset).limit(limit)
        result = await db.execute(query)
        return result.scalars().all()

    # Conta o total de retiradas para um usuário específico
    @staticmethod
    async def count_retiradas_by_user(db: AsyncSession, usuario_id: int):
        """
        Conta o total de retiradas para um usuário específico.
        """
        result = await db.execute(select(func.count(Retirada.retirada_id)).where(Retirada.usuario_id == usuario_id))
        return result.scalar_one()
