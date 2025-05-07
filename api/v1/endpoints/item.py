#api\v1\endpoints\item.py

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import get_session
from schemas.item import ItemOut, ItemCreate, ItemUpdate
from services.item_service import ItemService
from core.security import usuario_almoxarifado, direcao_ou_almoxarifado
from typing import List


router = APIRouter(prefix="/itens")

@router.post("/", response_model=ItemOut, status_code=status.HTTP_201_CREATED)
async def create_item(
    item: ItemCreate, 
    db: AsyncSession = Depends(get_session),
    current_user=Depends(usuario_almoxarifado) 
):
    return await ItemService.create_item(db, item, current_user)


@router.get("/", response_model=List[ItemOut])
async def get_itens(
    db: AsyncSession = Depends(get_session), 
    current_user = Depends(direcao_ou_almoxarifado)
):
    return await ItemService.get_itens(db)


@router.get("/{item_id}", response_model=ItemOut)
async def get_item(
    item_id: int, 
    db: AsyncSession = Depends(get_session), 
    current_user=Depends(direcao_ou_almoxarifado)
):
    return await ItemService.get_item_by_id(db, item_id)


@router.delete("/{item_id}")
async def delete_item(
    item_id: int, 
    db: AsyncSession = Depends(get_session),
    current_user=Depends(usuario_almoxarifado)
):
    return await ItemService.delete_item(db, item_id)


@router.put("/{item_id}", response_model=ItemOut)
async def update_item(
    item_id: int, 
    item: ItemUpdate, 
    db: AsyncSession = Depends(get_session),
    current_user=Depends(usuario_almoxarifado)
):
    return await ItemService.update_item(db, item_id, item, current_user)
