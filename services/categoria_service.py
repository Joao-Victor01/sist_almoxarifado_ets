# services/categoria_service.py
from schemas.categoria import CategoriaCreate, CategoriaUpdate
from repositories.categoria_repository import CategoriaRepository
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession


class CategoriaService:
    @staticmethod
    async def create_categoria(db: AsyncSession, categoria_data: CategoriaCreate):
        categoria = await CategoriaRepository.create_categoria(db, categoria_data)
        return categoria

    @staticmethod
    async def get_categorias(db: AsyncSession):
        categorias = await CategoriaRepository.get_categorias(db)
        return categorias

    @staticmethod
    async def get_categoria_by_id(db: AsyncSession, categoria_id: int):
        categoria = await CategoriaRepository.get_categoria_by_id(db, categoria_id)
        if not categoria:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Categoria não encontrada")
        return categoria

    @staticmethod
    async def update_categoria(db: AsyncSession, categoria_id: int, categoria_data: CategoriaUpdate):
        updated_categoria = await CategoriaRepository.update_categoria(db, categoria_id, categoria_data)
        if not updated_categoria:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Categoria não encontrada")
        return updated_categoria

    @staticmethod
    async def delete_categoria(db: AsyncSession, categoria_id: int):
        result = await CategoriaRepository.delete_categoria(db, categoria_id)
        if not result:
            raise HTTPException(status_code=404, detail="Categoria não encontrada")
        return result
