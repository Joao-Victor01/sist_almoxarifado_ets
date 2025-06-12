# app/api/v1/endpoints/item.py

from fastapi import APIRouter, Depends, status, Query, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from core.database import get_session
from core.security import usuario_almoxarifado, direcao_ou_almoxarifado, todos_usuarios
from schemas.item import (
    ItemOut,
    ItemCreate,
    ItemUpdate,
    PaginatedItems,
    BulkItemUploadResult,
)
from services.item_service import ItemService

router = APIRouter(prefix="/itens")


@router.post("/", response_model=ItemOut, status_code=status.HTTP_201_CREATED)
async def create_item(
    item: ItemCreate,
    db: AsyncSession = Depends(get_session),
    current_user=Depends(usuario_almoxarifado),
):
    """
    Cria um novo item no sistema. Apenas para usuários do almoxarifado.
    """
    return await ItemService.create_item(db, item, current_user)


@router.get(
    "/buscar",
    response_model=PaginatedItems,
)
async def search_items(
    nome: str | None = Query(None, description="Nome total ou parcial do item"),
    categoria: str | None = Query(None, description="Categoria total ou parcial"),
    page: int = Query(1, ge=1, description="Número da página"),
    size: int = Query(10, description="Itens por página: 5,10,25,50 ou 100"),
    db: AsyncSession = Depends(get_session),
    current_user=Depends(todos_usuarios), 
):
    """
    Busca itens com filtros e paginação. Acessível por todos os tipos de usuários.
    """
    return await ItemService.search_items_paginated(
        db, nome_produto=nome, nome_categoria=categoria, page=page, size=size
    )


@router.get(
    "/paginated",
    response_model=PaginatedItems,
    dependencies=[Depends(todos_usuarios)], # Mantido para todos os usuários
)
async def get_items_paginated(
    page: int = Query(1, ge=1, description="Número da página"),
    size: int = Query(10, description="Itens por página: 5,10,25,50 ou 100"),
    db: AsyncSession = Depends(get_session),
):
    """
    Lista itens paginados. Acessível por todos os tipos de usuários.
    """
    return await ItemService.get_items_paginated(db, page, size)


@router.get("/", response_model=List[ItemOut])
async def get_itens(
    db: AsyncSession = Depends(get_session),
    current_user=Depends(direcao_ou_almoxarifado),
):
    """
    Retorna todos os itens. Apenas para direção ou almoxarifado.
    """
    return await ItemService.get_itens(db)


@router.get("/{item_id}", response_model=ItemOut)
async def get_item(
    item_id: int,
    db: AsyncSession = Depends(get_session),
    current_user=Depends(todos_usuarios), 
):
    """
    Retorna um item específico pelo ID. Acessível por todos os tipos de usuários.
    """
    return await ItemService.get_item_by_id(db, item_id)


@router.delete("/{item_id}")
async def delete_item(
    item_id: int,
    db: AsyncSession = Depends(get_session),
    current_user=Depends(usuario_almoxarifado),
):
    """
    Deleta um item. Apenas para usuários do almoxarifado.
    """
    return await ItemService.delete_item(db, item_id)


@router.put("/{item_id}", response_model=ItemOut)
async def update_item(
    item_id: int,
    item: ItemUpdate,
    db: AsyncSession = Depends(get_session),
    current_user=Depends(usuario_almoxarifado),
):
    """
    Atualiza um item existente. Apenas para usuários do almoxarifado.
    """
    return await ItemService.update_item(db, item_id, item, current_user)


@router.post("/upload-bulk/", response_model=BulkItemUploadResult, status_code=status.HTTP_200_OK)
async def upload_items_bulk(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_session),
    current_user=Depends(usuario_almoxarifado),
):
    """
    Realiza o upload em massa de itens via arquivo. Apenas para usuários do almoxarifado.
    """
    return await ItemService.process_bulk_upload(db, file, current_user.usuario_id)
