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
from utils.logger import logger

router = APIRouter(prefix="/itens")


@router.post("/", response_model=ItemOut, status_code=status.HTTP_201_CREATED)
async def create_item(item: ItemCreate, db: AsyncSession = Depends(get_session), current_user=Depends(usuario_almoxarifado)):
    try:
        logger.info(f"Usuário {current_user.usuario_id} criando item: {item.nome_item}")
        return await ItemService.create_item(db, item, current_user)
    except Exception as e:
        logger.error(f"Erro ao criar item '{item.nome_item}': {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro ao criar item")


@router.get("/buscar", response_model=PaginatedItems)
async def search_items(
    nome: str | None = Query(None),
    categoria: str | None = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(10),
    db: AsyncSession = Depends(get_session),
    current_user=Depends(todos_usuarios),
):
    try:
        logger.info(f"Usuário {current_user.usuario_id} buscando itens (nome={nome}, categoria={categoria}, page={page})")
        return await ItemService.search_items_paginated(db, nome_produto=nome, nome_categoria=categoria, page=page, size=size)
    except Exception as e:
        logger.error(f"Erro ao buscar itens: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro ao buscar itens")


@router.get("/paginated", response_model=PaginatedItems, dependencies=[Depends(todos_usuarios)])
async def get_items_paginated(
    page: int = Query(1, ge=1),
    size: int = Query(10),
    db: AsyncSession = Depends(get_session),
):
    try:
        logger.info(f"Listando itens paginados (page={page}, size={size})")
        return await ItemService.get_items_paginated(db, page, size)
    except Exception as e:
        logger.error(f"Erro ao listar itens paginados: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro ao listar itens")


@router.get("/", response_model=List[ItemOut])
async def get_itens(db: AsyncSession = Depends(get_session), current_user=Depends(direcao_ou_almoxarifado)):
    try:
        logger.info(f"Usuário {current_user.usuario_id} listando todos os itens")
        return await ItemService.get_itens(db)
    except Exception as e:
        logger.error(f"Erro ao listar itens: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro ao listar itens")


@router.get("/{item_id}", response_model=ItemOut)
async def get_item(item_id: int, db: AsyncSession = Depends(get_session), current_user=Depends(todos_usuarios)):
    try:
        logger.info(f"Usuário {current_user.usuario_id} consultando item ID {item_id}")
        return await ItemService.get_item_by_id(db, item_id)
    except Exception as e:
        logger.error(f"Erro ao buscar item ID {item_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro ao buscar item")


@router.delete("/{item_id}")
async def delete_item(item_id: int, db: AsyncSession = Depends(get_session), current_user=Depends(usuario_almoxarifado)):
    try:
        logger.info(f"Usuário {current_user.usuario_id} deletando item ID {item_id}")
        return await ItemService.delete_item(db, item_id)
    except Exception as e:
        logger.error(f"Erro ao deletar item ID {item_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro ao deletar item")


@router.put("/{item_id}", response_model=ItemOut)
async def update_item(item_id: int, item: ItemUpdate, db: AsyncSession = Depends(get_session), current_user=Depends(usuario_almoxarifado)):
    try:
        logger.info(f"Usuário {current_user.usuario_id} atualizando item ID {item_id} para: {item.nome_item}")
        return await ItemService.update_item(db, item_id, item, current_user)
    except Exception as e:
        logger.error(f"Erro ao atualizar item ID {item_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro ao atualizar item")


@router.post("/upload-bulk/", response_model=BulkItemUploadResult)
async def upload_items_bulk(file: UploadFile = File(...), db: AsyncSession = Depends(get_session), current_user=Depends(usuario_almoxarifado)):
    try:
        logger.info(f"Usuário {current_user.usuario_id} fez upload de arquivo de itens: {file.filename}")
        return await ItemService.process_bulk_upload(db, file, current_user.usuario_id)
    except Exception as e:
        logger.error(f"Erro no upload em massa de itens: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro ao processar upload de itens")
