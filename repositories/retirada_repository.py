# repositories/retirada_repository.py

from sqlalchemy import func, and_, or_, update # Importe 'update'
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload, aliased
from schemas.retirada import RetiradaFilterParams
from models.retirada import Retirada, StatusEnum
from models.retirada_item import RetiradaItem
from models.item import Item
from models.usuario import Usuario
from datetime import datetime

class RetiradaRepository:

    @staticmethod
    async def count_retiradas(db: AsyncSession) -> int:
        """Conta o total de retiradas ativas no banco de dados."""
        result = await db.execute(select(func.count(Retirada.retirada_id)).where(Retirada.is_active == True))
        return result.scalar_one()

    @staticmethod
    async def get_retiradas_paginated(db: AsyncSession, offset: int, limit: int):
        """Retorna uma lista paginada de retiradas ativas, ordenadas por data_solicitacao (desc),
        com eager loading de itens, usuário e admin."""
        q = (
            select(Retirada)
            .options(
                selectinload(Retirada.itens).selectinload(RetiradaItem.item),
                selectinload(Retirada.usuario),
                selectinload(Retirada.admin),
            )
            .where(Retirada.is_active == True) # Filtra apenas retiradas ativas
            .order_by(Retirada.data_solicitacao.desc()) # ordena do mais recente para o mais antigo
            .offset(offset)
            .limit(limit)
        )
        return (await db.execute(q)).scalars().all()

    @staticmethod
    async def count_retiradas_pendentes(db: AsyncSession) -> int:
        """Conta o total de retiradas ativas com status PENDENTE."""
        result = await db.execute(
            select(func.count(Retirada.retirada_id))
            .where(and_(Retirada.status == StatusEnum.PENDENTE, Retirada.is_active == True)) # Adiciona filtro de ativo
        )
        return result.scalar_one()

    @staticmethod
    async def get_retiradas_pendentes_paginated(db: AsyncSession, offset: int, limit: int):
        """Retorna uma lista paginada de retiradas ativas e pendentes, ordenadas por data_solicitacao (desc),
        com eager loading de itens, usuário e admin."""
        q = (
            select(Retirada)
            .options(
                selectinload(Retirada.itens).selectinload(RetiradaItem.item),
                selectinload(Retirada.usuario),
                selectinload(Retirada.admin),
            )
            .where(and_(Retirada.status == StatusEnum.PENDENTE, Retirada.is_active == True)) # Adiciona filtro de ativo
            .order_by(Retirada.data_solicitacao.desc()) # pendentes mais recentes primeiro
            .offset(offset)
            .limit(limit)
        )
        return (await db.execute(q)).scalars().all()

    @staticmethod
    async def count_retiradas_filter(db: AsyncSession, params: RetiradaFilterParams) -> int:
        """Conta o total de retiradas ativas filtradas com base nos parâmetros fornecidos."""
        q = select(func.count(Retirada.retirada_id)).where(Retirada.is_active == True) # Adiciona filtro de ativo
        conditions = []

        if params.status is not None:
            conditions.append(Retirada.status == params.status)
        if params.solicitante:
            alias = aliased(Usuario)
            q = q.select_from(Retirada).join(alias, Retirada.usuario)
            conditions.append(
                or_(
                    alias.nome_usuario.ilike(f"%{params.solicitante}%"),
                    Retirada.solicitado_localmente_por.ilike(f"%{params.solicitante}%")
                )
            )
        if params.start_date and params.end_date:
            conditions.append(
                and_(
                    Retirada.data_solicitacao >= params.start_date, # Usar >=
                    Retirada.data_solicitacao <= params.end_date # Usar <=
                )
            )
        if conditions:
            q = q.where(and_(*conditions)) # Usa and_ para combinar todas as condições

        return (await db.execute(q)).scalar_one()

    @staticmethod
    async def filter_retiradas_paginated(
        db: AsyncSession,
        params: RetiradaFilterParams,
        offset: int,
        limit: int
    ):
        """Filtra e retorna retiradas ativas paginadas com base nos parâmetros fornecidos,
        ordenadas por data_solicitacao (desc), com eager loading de itens, usuário e admin."""
        q = select(Retirada).where(Retirada.is_active == True) # Adiciona filtro de ativo
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
            q = q.join(alias, Retirada.usuario) # Join aqui para usar o alias
            conditions.append(
                or_(
                    alias.nome_usuario.ilike(f"%{params.solicitante}%"),
                    Retirada.solicitado_localmente_por.ilike(f"%{params.solicitante}%")
                )
            )
        if params.start_date and params.end_date:
            conditions.append(
                and_(
                    Retirada.data_solicitacao >= params.start_date, # Usar >=
                    Retirada.data_solicitacao <= params.end_date # Usar <=
                )
            )
        if conditions:
            q = q.where(and_(*conditions))

        q = (
            q.order_by(Retirada.data_solicitacao.desc())
            .offset(offset)
            .limit(limit)
        )
        return (await db.execute(q)).scalars().all()

    @staticmethod
    async def criar_retirada(db: AsyncSession, retirada: Retirada):
        """Adiciona uma nova retirada ao banco de dados e a atualiza para obter o ID."""
        db.add(retirada)
        await db.flush()
        await db.refresh(retirada)
        return retirada

    @staticmethod
    async def adicionar_itens_retirada(db: AsyncSession, itens: list[RetiradaItem]):
        """Adiciona múltiplos itens a uma retirada no banco de dados."""
        db.add_all(itens)
        await db.flush()

    @staticmethod
    async def buscar_retirada_por_id(db: AsyncSession, retirada_id: int):
        """Busca uma retirada ativa específica pelo ID, com eager loading de itens, usuário e admin."""
        result = await db.execute(
            select(Retirada)
            .options(
                selectinload(Retirada.itens).selectinload(RetiradaItem.item),
                selectinload(Retirada.usuario),
                selectinload(Retirada.admin),
            )
            .where(and_(Retirada.retirada_id == retirada_id, Retirada.is_active == True)) # Adiciona filtro de ativo
        )
        return result.scalars().first()

    @staticmethod
    async def get_retiradas(db: AsyncSession):
        """Retorna todas as retiradas ativas (sem paginação), ordenadas por data_solicitacao (desc), com eager loading."""
        result = await db.execute(
            select(Retirada)
            .options(
                selectinload(Retirada.itens).selectinload(RetiradaItem.item),
                selectinload(Retirada.usuario),
                selectinload(Retirada.admin),
            )
            .where(Retirada.is_active == True) # Adiciona filtro de ativo
            .order_by(Retirada.data_solicitacao.desc()) # ordena do mais recente para o mais antigo
        )
        return result.scalars().unique().all()

    @staticmethod
    async def get_retiradas_por_setor_periodo(
        db: AsyncSession,
        setor_id: int,
        data_inicio: datetime,
        data_fim: datetime
    ):
        """Retorna retiradas ativas filtradas por setor e período, com eager loading."""
        result = await db.execute(
            select(Retirada)
            .options(
                selectinload(Retirada.itens).selectinload(RetiradaItem.item),
                selectinload(Retirada.usuario),
                selectinload(Retirada.admin),
            )
            .where(
                Retirada.setor_id == setor_id,
                Retirada.data_solicitacao >= data_inicio, # Usar >=
                Retirada.data_solicitacao <= data_fim, # Usar <=
                Retirada.is_active == True # Adiciona filtro de ativo
            )
            .order_by(Retirada.data_solicitacao.desc())
        )
        return result.scalars().unique().all()

    @staticmethod
    async def get_retiradas_por_usuario_periodo(
        db: AsyncSession,
        usuario_id: int,
        data_inicio: datetime,
        data_fim: datetime
    ):
        """Retorna retiradas ativas filtradas por usuário e período, com eager loading."""
        result = await db.execute(
            select(Retirada)
            .options(
                selectinload(Retirada.itens).selectinload(RetiradaItem.item),
                selectinload(Retirada.usuario),
                selectinload(Retirada.admin),
            )
            .where(
                Retirada.usuario_id == usuario_id,
                Retirada.data_solicitacao >= data_inicio, # Usar >=
                Retirada.data_solicitacao <= data_fim, # Usar <=
                Retirada.is_active == True # Adiciona filtro de ativo
            )
            .order_by(Retirada.data_solicitacao.desc())
        )
        return result.scalars().unique().all()

    @staticmethod
    async def atualizar_retirada(db: AsyncSession, retirada: Retirada):
        """Atualiza uma retirada existente no banco de dados."""
        # Não é necessário filtrar por is_active aqui, pois o objeto `retirada` já foi buscado
        # e estamos atualizando ele.
        await db.commit()
        await db.refresh(retirada)
        return retirada

    @staticmethod
    async def buscar_item_por_id(db: AsyncSession, item_id: int):
        """Busca um item pelo ID."""
        result = await db.execute(select(Item).where(Item.item_id == item_id))
        return result.scalars().first()

    @staticmethod
    async def atualizar_quantidade_item(db: AsyncSession, item: Item, nova_quantidade: int):
        """Atualiza a quantidade de um item no estoque."""
        item.quantidade_item = nova_quantidade
        await db.flush()
        return item

    @staticmethod
    async def get_retiradas_by_user_paginated(db: AsyncSession, usuario_id: int, offset: int, limit: int):
        """Retorna retiradas ativas paginadas para um usuário específico, ordenadas por data_solicitacao (desc),
        com eager loading de itens, usuário e admin."""
        query = (
            select(Retirada)
            .where(and_(Retirada.usuario_id == usuario_id, Retirada.is_active == True)) # Adiciona filtro de ativo
            .options(
                selectinload(Retirada.itens).selectinload(RetiradaItem.item),
                selectinload(Retirada.usuario),
                selectinload(Retirada.admin),
            )
            .order_by(Retirada.data_solicitacao.desc())
            .offset(offset)
            .limit(limit)
        )
        result = await db.execute(query)
        return result.scalars().all()

    @staticmethod
    async def count_retiradas_by_user(db: AsyncSession, usuario_id: int) -> int:
        """Conta o total de retiradas ativas para um usuário específico."""
        result = await db.execute(
            select(func.count(Retirada.retirada_id))
            .where(and_(Retirada.usuario_id == usuario_id, Retirada.is_active == True)) # Adiciona filtro de ativo
        )
        return result.scalar_one()
    
    @staticmethod
    async def soft_delete_by_period(db: AsyncSession, start_date: datetime, end_date: datetime) -> int:
        """
        Marca retiradas como inativas (soft delete) dentro de um período de datas.
        Retorna o número de retiradas atualizadas.
        """
        # Garante que apenas retiradas ativas sejam "deletadas" e que elas realmente estejam no período
        result = await db.execute(
            update(Retirada)
            .where(
                Retirada.is_active == True,
                Retirada.data_solicitacao >= start_date,
                Retirada.data_solicitacao <= end_date
            )
            .values(is_active=False)
        )
        await db.commit()
        return result.rowcount # Retorna o número de linhas afetadas