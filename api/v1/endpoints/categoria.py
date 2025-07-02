from fastapi import APIRouter, Depends, Query, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from schemas.categoria import CategoriaCreate, CategoriaUpdate, CategoriaOut, PaginatedCategorias
from services.categoria_service import CategoriaService
from typing import List
from core.database import get_session
from core.security import usuario_almoxarifado, direcao_ou_almoxarifado
from utils.logger import logger

router = APIRouter(prefix="/categorias")


@router.post("/", response_model=CategoriaOut, status_code=status.HTTP_201_CREATED)
async def create_categoria(
    categoria: CategoriaCreate,
    db: AsyncSession = Depends(get_session),
    current_user=Depends(usuario_almoxarifado)
):
    try:
        logger.info(f"Usuário {current_user.usuario_id} criando categoria: {categoria.nome_categoria}")
        return await CategoriaService.create_categoria(db, categoria)
    except Exception as e:
        logger.error(f"Erro ao criar categoria: {categoria.nome_categoria} | {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro ao criar categoria")


@router.get("/buscar", response_model=PaginatedCategorias, dependencies=[Depends(usuario_almoxarifado)])
async def search_categorias(
    nome: str | None = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(10),
    db: AsyncSession = Depends(get_session),
    current_user=Depends(direcao_ou_almoxarifado)
):
    try:
        logger.info(f"Usuário {current_user.usuario_id} buscando categorias (nome={nome}, page={page}, size={size})")
        return await CategoriaService.search_categorias_paginated(db, nome_categoria=nome, page=page, size=size)
    except Exception as e:
        logger.error(f"Erro ao buscar categorias: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro ao buscar categorias")


@router.get("/paginated", response_model=PaginatedCategorias, dependencies=[Depends(direcao_ou_almoxarifado)])
async def get_items_paginated(
    page: int = Query(1, ge=1),
    size: int = Query(10),
    db: AsyncSession = Depends(get_session)
):
    try:
        logger.info(f"Listando categorias paginadas (page={page}, size={size})")
        return await CategoriaService.get_categorias_paginated(db, page, size)
    except Exception as e:
        logger.error(f"Erro ao listar categorias paginadas: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro ao listar categorias")


@router.get("/", response_model=List[CategoriaOut])
async def get_categorias(db: AsyncSession = Depends(get_session), current_user=Depends(direcao_ou_almoxarifado)):
    try:
        logger.info(f"Usuário {current_user.usuario_id} listando todas as categorias")
        return await CategoriaService.get_categorias(db)
    except Exception as e:
        logger.error(f"Erro ao listar categorias: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro ao listar categorias")


@router.get("/{categoria_id}", response_model=CategoriaOut)
async def get_categoria_by_id(categoria_id: int, db: AsyncSession = Depends(get_session), current_user=Depends(direcao_ou_almoxarifado)):
    try:
        logger.info(f"Usuário {current_user.usuario_id} consultando categoria por ID: {categoria_id}")
        return await CategoriaService.get_categoria_by_id(db, categoria_id)
    except Exception as e:
        logger.error(f"Erro ao buscar categoria ID {categoria_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro ao buscar categoria")


@router.get("/{categoria_name}", response_model=CategoriaOut)
async def get_categoria_by_name(categoria_name: str, db: AsyncSession = Depends(get_session), current_user=Depends(direcao_ou_almoxarifado)):
    try:
        logger.info(f"Usuário {current_user.usuario_id} consultando categoria por nome: {categoria_name}")
        return await CategoriaService.get_categoria_by_name(db, categoria_name)
    except Exception as e:
        logger.error(f"Erro ao buscar categoria '{categoria_name}': {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro ao buscar categoria")


@router.put("/{categoria_id}", response_model=CategoriaUpdate)
async def update_categoria(
    categoria_id: int,
    categoria: CategoriaUpdate,
    db: AsyncSession = Depends(get_session),
    current_user=Depends(usuario_almoxarifado)
):
    try:
        logger.info(f"Usuário {current_user.usuario_id} atualizando categoria ID {categoria_id} para: {categoria.nome_categoria}")
        return await CategoriaService.update_categoria(db, categoria_id, categoria)
    except Exception as e:
        logger.error(f"Erro ao atualizar categoria ID {categoria_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro ao atualizar categoria")


@router.delete("/{categoria_id}")
async def delete_categoria(categoria_id: int, db: AsyncSession = Depends(get_session), current_user=Depends(usuario_almoxarifado)):
    try:
        logger.info(f"Usuário {current_user.usuario_id} deletando categoria ID {categoria_id}")
        return await CategoriaService.delete_categoria(db, categoria_id)
    except Exception as e:
        logger.error(f"Erro ao deletar categoria ID {categoria_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro ao deletar categoria")
