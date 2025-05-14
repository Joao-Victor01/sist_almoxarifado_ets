#repositories\categoria_repository.py
from sqlalchemy import func
from sqlalchemy.exc import NoResultFound, IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from models.categoria import Categoria
from schemas.categoria import CategoriaCreate, CategoriaUpdate
from fastapi import HTTPException, status


class CategoriaRepository:

    @staticmethod
    async def create_categoria(db: AsyncSession, categoria_data: dict): 
        nova_categoria = Categoria(**categoria_data)  # recebe um dicionário
        db.add(nova_categoria)
        await db.commit()
        await db.refresh(nova_categoria)
        return nova_categoria
    
    @staticmethod
    async def get_categorias(db: AsyncSession):
        result = await db.execute(select(Categoria))
        return result.scalars().all()

    @staticmethod
    async def get_categoria_by_id(db: AsyncSession, categoria_id: int):
        # Usa expressão SQLAlchemy para filtrar por ID
        return await CategoriaRepository.__first_or_404(
            db,
            Categoria.categoria_id == categoria_id
        )
    
    @staticmethod
    async def aux_get_categoria_by_name(db: AsyncSession, categoria_name: str):
        result = await db.execute(
            select(Categoria)
            .where(Categoria.nome_categoria == categoria_name)
        )
        return result.scalars().first()  # Retorna None se não encontrar

    @staticmethod
    async def get_categoria_by_name(db: AsyncSession, categoria_name: str):
        # Filtra pelo nome exato
        return await CategoriaRepository.__first_or_404(
            db,
            Categoria.nome_categoria == categoria_name
        )

    @staticmethod
    async def get_categoria_by_name_like(db: AsyncSession, termo_busca: str):
        result = await db.execute(
            select(Categoria).where(
                Categoria.nome_categoria.ilike(f"%{termo_busca}%")
            )
        )
        return result

    @staticmethod
    async def update_categoria(db: AsyncSession, categoria_id: int, update_values: dict):
        categoria = await CategoriaRepository.__first_or_404(
            db,
            Categoria.categoria_id == categoria_id
        )
        
        for key, value in update_values.items():
            setattr(categoria, key, value)
        
        await db.commit()
        await db.refresh(categoria)
        return categoria

    @classmethod
    async def delete_categoria(cls, db: AsyncSession, categoria_id: int):
        expr = Categoria.categoria_id == categoria_id
        categoria = await cls.__first_or_404(db, expr)
        try:
            await db.delete(categoria)
            await db.commit()
            return {"message": "Categoria excluída com sucesso"}
        except IntegrityError as e:
            # se violação de FK em item → retorna 409 Conflict
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Não é possível excluir: existem itens vinculados a esta categoria."
            )
    
    @staticmethod
    async def find_categoria_ids_by_name(db: AsyncSession, nome_normalizado: str) -> list[int]:
        result = await db.execute(
            select(Categoria.categoria_id)
            .where(Categoria.nome_categoria.ilike(f"%{nome_normalizado}%"))
        )
        return [r[0] for r in result.all()]
    
    @staticmethod
    async def count_categorias(db: AsyncSession) -> int:
        result = await db.execute(select(func.count()).select_from(Categoria))
        return result.scalar_one()

    @staticmethod
    async def get_categorias_paginated(
        db: AsyncSession,
        offset: int,
        limit: int
    ) -> list[Categoria]:
        result = await db.execute(
            select(Categoria)
            .offset(offset)
            .limit(limit)
        )
        return result.scalars().all()
    
    @staticmethod
    async def count_filtered_categorias(
        db: AsyncSession,
        categoria_ids: list[int] | None,
        nome_categoria_normalizado: str | None
    ) -> int:
        query = select(func.count()).select_from(Categoria)
        if categoria_ids:
            query = query.where(Categoria.categoria_id.in_(categoria_ids))
        if nome_categoria_normalizado:
            query = query.where(Categoria.nome_categoria.ilike(f"%{nome_categoria_normalizado}%"))
        result = await db.execute(query)
        return result.scalar_one()

    @staticmethod
    async def get_filtered_categorias_paginated(
        db: AsyncSession,
        categoria_ids: list[int] | None,
        nome_categorias_normalizado: str | None,
        offset: int, limit: int
    ) -> list[Categoria]:
        query = select(Categoria)
        if categoria_ids:
            query = query.where(Categoria.categoria_id.in_(categoria_ids))
        if nome_categorias_normalizado:
            query = query.where(Categoria.nome_categoria.ilike(f"%{nome_categorias_normalizado}%"))
        query = query.offset(offset).limit(limit)
        result = await db.execute(query)
        return result.scalars().all()

    @staticmethod
    async def __first_or_404(db: AsyncSession, where_expr):
        """
        Retorna o primeiro resultado para a expressão SQL where_expr,
        ou levanta HTTPException(404) se nenhum for encontrado.
        """
        try:
            result = await db.execute(
                select(Categoria).where(where_expr)
            )
            return result.scalars().one()
        except NoResultFound:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Categoria não encontrada"
            )
