# repositories/categoria_repository.py
from sqlalchemy.orm import Session
from models.categoria import Categoria
from schemas.categoria import CategoriaCreate, CategoriaUpdate
from sqlalchemy.future import select
from fastapi import HTTPException, status

class CategoriaRepository:

    @staticmethod
    #cadastrar categoria
    async def create_categoria(db: Session, categoria: CategoriaCreate):
        nova_categoria = Categoria(
            nome_categoria=categoria.nome_categoria,
            descricao_categoria=categoria.descricao_categoria
        )
        db.add(nova_categoria)
        await db.commit()
        await db.refresh(nova_categoria)
        return nova_categoria

    @staticmethod
    #listar categorias
    async def get_categorias(db: Session):
        result = await db.execute(select(Categoria))
        categorias = result.scalars().all()
        return categorias

    @staticmethod
    #filtar categoria por ID
    async def get_categoria_by_id(db: Session, categoria_id: int):
        result = await db.execute(select(Categoria).filter(Categoria.categoria_id == categoria_id))
        categoria = result.scalars().first()
        
        if not categoria:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Categoria não encontrada")

        return categoria

    @staticmethod

    # Atualizar categoria
    async def update_categoria(db: Session, categoria_id: int, categoria_data: CategoriaUpdate):
        result = await db.execute(select(Categoria).filter(Categoria.categoria_id == categoria_id))
        categoria = result.scalars().first()

        if not categoria:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Categoria não encontrada")

        categoria.nome_categoria = categoria_data.nome_categoria
        categoria.descricao_categoria = categoria_data.descricao_categoria

        await db.commit()
        await db.refresh(categoria)  

        return categoria

    @staticmethod
    async def delete_categoria(db: Session, categoria_id: int):
        result = await db.execute(select(Categoria).filter(Categoria.categoria_id == categoria_id))
        categoria = result.scalars().first()
        
        if not categoria:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Categoria não encontrada")
        
        await db.delete(categoria)
        await db.commit()
        return {"message": "Categoria deletada com sucesso"}
