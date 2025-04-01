from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from models.categoria import Categoria
from schemas.categoria import CategoriaCreate, CategoriaUpdate
from fastapi import HTTPException, status

class CategoriaRepository:

    @staticmethod
    async def create_categoria(db: AsyncSession, categoria_data: CategoriaCreate):
        nova_categoria = Categoria(**categoria_data.model_dump())
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
        return await CategoriaRepository.__first_or_404(db, categoria_id)

    @staticmethod
    async def get_categoria_by_name(db: AsyncSession, categoria_name: str):
        return await CategoriaRepository.__first_or_404(db, Categoria.nome_categoria == categoria_name, "Categoria não encontrada")

    @staticmethod
    async def get_categoria_by_name_like(db: AsyncSession, termo_busca: str):
        """
        Busca categorias por similaridade no nome (case-sensitive)
        
        Args:
            db: Sessão async do SQLAlchemy
            termo_busca: Termo para busca parcial
            
        Returns:
            Resultado executado (não consumido) para processamento posterior
        """
        result = await db.execute(
            select(Categoria).where(
                Categoria.nome_categoria.ilike(f"%{termo_busca}%")
            )
        )
        return result  # Retorna o Result sem consumir

    @staticmethod
    async def update_categoria(db: AsyncSession, categoria_id: int, categoria_data: CategoriaUpdate):
        categoria = await CategoriaRepository.__first_or_404(db, categoria_id)

        for key, value in categoria_data.dict(exclude_unset=True).items():
            setattr(categoria, key, value)

        await db.commit()
        await db.refresh(categoria)
        return categoria

    @staticmethod
    async def delete_categoria(db: AsyncSession, categoria_id: int):
        categoria = await CategoriaRepository.__first_or_404(db, categoria_id)
        await db.delete(categoria)
        await db.commit()
        return {"message": "Categoria deletada com sucesso"}

    @staticmethod
    async def __first_or_404(db: AsyncSession, *filters, message="Categoria não encontrada"):
        result = await db.execute(select(Categoria).where(*filters))
        categoria = result.scalars().first()
        if not categoria:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=message)
        return categoria
