# api/v1/endpoints/categoria.py
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from schemas.categoria import CategoriaCreate, CategoriaUpdate, CategoriaOut
from services.categoria_service import CategoriaService
from typing import List
from core.database import get_session
from fastapi import status


router = APIRouter(prefix="/categorias", tags=["Categorias"])

#Cadastrar categoria 
@router.post("/", response_model=CategoriaOut, status_code=status.HTTP_201_CREATED)
async def create_categoria(categoria: CategoriaCreate, db: AsyncSession = Depends(get_session)):
    response = await CategoriaService.create_categoria(db, categoria)
    return response

#Listar categorias
@router.get("/", response_model=List[CategoriaOut], status_code=status.HTTP_200_OK)
async def get_categorias(db: AsyncSession = Depends(get_session)):
    response = await CategoriaService.get_categorias(db)
    return response

#filtrar categoria por ID
@router.get("/{categoria_id}", response_model=CategoriaOut, status_code=status.HTTP_200_OK)
async def get_categoria_by_id(categoria_id: int, db: AsyncSession = Depends(get_session)):
    response =  await CategoriaService.get_categoria_by_id(db, categoria_id)
    return response

#atualizar dados da categoria
@router.put("/{categoria_id}", response_model=CategoriaUpdate, status_code=status.HTTP_200_OK)
async def update_categoria(categoria_id: int, categoria: CategoriaUpdate, db: AsyncSession = Depends(get_session)):
    response  = await CategoriaService.update_categoria(db, categoria_id, categoria)
    return response

@router.delete("/{categoria_id}, status_code=status.HTTP_200_OK")
async def delete_categoria(categoria_id: int, db: AsyncSession = Depends(get_session)):
    response = await CategoriaService.delete_categoria(db, categoria_id)
    return response