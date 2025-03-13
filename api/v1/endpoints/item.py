from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import get_session
from schemas.item import ItemOut, ItemCreate, ItemUpdate
from services.item_service import ItemService
from core.security import get_current_user
from typing import List

router = APIRouter(prefix="/itens")

@router.post("/", response_model=ItemOut, status_code=status.HTTP_201_CREATED)
async def create_item(
    item: ItemCreate, 
    db: AsyncSession = Depends(get_session),
    current_user=Depends(get_current_user)  # Adicionei current_user, se necessário
):
    try:
        new_item = await ItemService.create_item(db, item)
        return new_item
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao criar item: {str(e)}"
        )

@router.get("/", response_model=List[ItemOut])
async def get_itens(
    db: AsyncSession = Depends(get_session), 
    current_user=Depends(get_current_user)
):
    try:
        response = await ItemService.get_itens(db)
        return response
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao buscar itens: {str(e)}"
        )

@router.get("/{item_id}", response_model=ItemOut)
async def get_item(
    item_id: int, 
    db: AsyncSession = Depends(get_session), 
    current_user=Depends(get_current_user)
):
    try:
        response = await ItemService.get_item_by_id(db, item_id)
        return response
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao buscar item: {str(e)}"
        )

@router.delete("/{item_id}")
async def delete_item(
    item_id: int, 
    db: AsyncSession = Depends(get_session),
    current_user=Depends(get_current_user)
):
    try:
        response = await ItemService.delete_item(db, item_id)
        return response
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao deletar item: {str(e)}"
        )

@router.put("/{item_id}", response_model=ItemOut)
async def update_item(
    item_id: int, 
    item: ItemUpdate, 
    db: AsyncSession = Depends(get_session),
    current_user=Depends(get_current_user)
):
    try:
        response = await ItemService.update_item(db, item_id, item)
        return response
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao atualizar item: {str(e)}"
        )