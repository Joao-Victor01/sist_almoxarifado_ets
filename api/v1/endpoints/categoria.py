# api/v1/endpoints/categoria.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from schemas.categoria import CategoriaCreate, CategoriaUpdate, CategoriaOut
from services.categoria_service import CategoriaService
from typing import List
from core.database import get_session


router = APIRouter(prefix="/categorias", tags=["Categorias"])

@router.post("/", response_model=CategoriaOut)
def create_categoria(categoria: CategoriaCreate, db: AsyncSession = Depends(get_session)):
    return CategoriaService.create_categoria(db, categoria)

@router.get("/", response_model=List[CategoriaOut])
def get_categorias(db: AsyncSession = Depends(get_session)):
    return CategoriaService.get_categorias(db)

@router.get("/{categoria_id}", response_model=CategoriaOut)
def get_categoria_by_id(categoria_id: int, db: AsyncSession = Depends(get_session)):
    categoria = CategoriaService.get_categoria_by_id(db, categoria_id)
    if not categoria:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    return categoria

@router.put("/{categoria_id}", response_model=CategoriaOut)
def update_categoria(categoria_id: int, categoria: CategoriaUpdate, db: AsyncSession = Depends(get_session)):
    updated_categoria = CategoriaService.update_categoria(db, categoria_id, categoria)
    if not updated_categoria:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    return updated_categoria

@router.delete("/{categoria_id}")
def delete_categoria(categoria_id: int, db: AsyncSession = Depends(get_session)):
    deleted_categoria = CategoriaService.delete_categoria(db, categoria_id)
    if not deleted_categoria:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    return {"message": "Categoria deletada com sucesso"}