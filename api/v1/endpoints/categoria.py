# api/v1/endpoints/categoria.py
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from schemas.categoria import CategoriaCreate, CategoriaUpdate, CategoriaOut, PaginatedCategorias
from services.categoria_service import CategoriaService
from typing import List
from core.database import get_session
from fastapi import status
from core.security import usuario_almoxarifado

router = APIRouter(prefix="/categorias")

#Cadastrar categoria 
@router.post("/", response_model=CategoriaOut, status_code=status.HTTP_201_CREATED)
async def create_categoria(categoria: CategoriaCreate, 
                           db: AsyncSession = Depends(get_session),
                           current_user=Depends(usuario_almoxarifado)):
    response = await CategoriaService.create_categoria(db, categoria)
    return response


@router.get(
    "/buscar",
    response_model=PaginatedCategorias,
    dependencies=[Depends(usuario_almoxarifado)]
)
async def search_categorias(
    nome: str | None = Query(None, description="Nome total ou parcial da categoria"),
    page: int = Query(1, ge=1, description="Número da página"),
    size: int = Query(10, description="Itens por página: 5,10,25,50 ou 100"),
    db: AsyncSession = Depends(get_session),
    current_user=Depends(usuario_almoxarifado)
):
    """
     Busca categorias com paginação.
    """

    return await CategoriaService.search_categorias_paginated(
        db, nome_categoria=nome,
        page=page, 
        size=size)



@router.get(
    "/paginated",
    response_model=PaginatedCategorias,
    dependencies=[Depends(usuario_almoxarifado)]
)
async def get_items_paginated(
    page: int = Query(1, ge=1, description="Número da página"),
    size: int = Query(10, description="Categorias por página: 5,10,25,50 ou 100"),
    db: AsyncSession = Depends(get_session)
):
    """
    Lista itens com paginação.
    """
    return await CategoriaService.get_categorias_paginated(db, page, size)

#Listar categorias
@router.get("/", response_model=List[CategoriaOut], status_code=status.HTTP_200_OK)
async def get_categorias(db: AsyncSession = Depends(get_session),
                         current_user=Depends(usuario_almoxarifado)):
    response = await CategoriaService.get_categorias(db)
    return response

#filtrar categoria por ID
@router.get("/{categoria_id}", response_model=CategoriaOut, status_code=status.HTTP_200_OK)
async def get_categoria_by_id(categoria_id: int, 
                              db: AsyncSession = Depends(get_session),
                              current_user=Depends(usuario_almoxarifado)):
    response =  await CategoriaService.get_categoria_by_id(db, categoria_id)
    return response

#filtrar categoria por Nome
@router.get("/{categoria_name}", response_model=CategoriaOut, status_code=status.HTTP_200_OK)
async def get_categoria_by_name(categoria_name: str, 
                              db: AsyncSession = Depends(get_session),
                              current_user=Depends(usuario_almoxarifado)):
    response =  await CategoriaService.get_categoria_by_name(db, categoria_name)
    return response

#atualizar dados da categoria
@router.put("/{categoria_id}", response_model=CategoriaUpdate, status_code=status.HTTP_200_OK)
async def update_categoria(categoria_id: int, 
                           categoria: CategoriaUpdate, 
                           db: AsyncSession = Depends(get_session),
                           current_user=Depends(usuario_almoxarifado)):
    response  = await CategoriaService.update_categoria(db, categoria_id, categoria)
    return response

@router.delete("/{categoria_id}", status_code=status.HTTP_200_OK)
async def delete_categoria(categoria_id: int, 
                           db: AsyncSession = Depends(get_session),
                           current_user=Depends(usuario_almoxarifado)):
    response = await CategoriaService.delete_categoria(db, categoria_id)
    return response