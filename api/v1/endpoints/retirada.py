# api/v1/endpoints/retirada.py
from datetime import datetime
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import get_session
from schemas.retirada import (
    RetiradaCreate, RetiradaUpdateStatus, RetiradaOut,
    RetiradaPaginated, RetiradaFilterParams, StatusEnum
)
from services.retirada_service import RetiradaService
from core.security import todos_usuarios, usuario_almoxarifado


router = APIRouter(prefix="/retiradas")

@router.post("/", response_model=RetiradaOut, status_code=status.HTTP_201_CREATED)
async def solicitar_retirada(
    retirada: RetiradaCreate,
    db: AsyncSession = Depends(get_session),
    current_user=Depends(todos_usuarios)
):
    return await RetiradaService.solicitar_retirada(db, retirada, current_user.usuario_id)

@router.put("/{retirada_id}", response_model=RetiradaOut)
async def atualizar_status_retirada(
    retirada_id: int,
    status_data: RetiradaUpdateStatus,
    db: AsyncSession = Depends(get_session),
    current_user=Depends(usuario_almoxarifado)
):
    return await RetiradaService.atualizar_status(db, retirada_id, status_data, current_user.usuario_id)

# Listagem paginada de todas as retiradas
@router.get(
    "/paginated",
    response_model=RetiradaPaginated,
    name="Listar retiradas paginadas"
)
async def listar_retiradas_paginadas(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_session),
    current_user=Depends(usuario_almoxarifado)
):
    return await RetiradaService.get_retiradas_paginadas(db, page, page_size)

# Listagem paginada de retiradas pendentes
@router.get(
    "/pendentes/paginated",
    response_model=RetiradaPaginated,
    name="Listar pendentes paginados"
)
async def listar_pendentes_paginados(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_session),
    current_user=Depends(todos_usuarios)
):
    return await RetiradaService.get_retiradas_pendentes_paginated(db, page, page_size)

# Busca com filtros e paginação
@router.get(
    "/search",
    response_model=RetiradaPaginated,
    name="Buscar retiradas por filtros paginados"
)
async def buscar_retiradas(
    status: StatusEnum | None = Query(None),
    solicitante: str | None = Query(None),
    start_date: datetime | None = Query(None),
    end_date: datetime | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_session),
    current_user=Depends(usuario_almoxarifado)
):
    params = RetiradaFilterParams(
        status=status,
        solicitante=solicitante,
        start_date=start_date,
        end_date=end_date,
    )
    return await RetiradaService.filter_retiradas_paginated(db, params, page, page_size)

# Recupera uma específica
@router.get("/{retirada_id}", response_model=RetiradaOut)
async def get_retirada(
    retirada_id: int,
    db: AsyncSession = Depends(get_session),
    current_user=Depends(usuario_almoxarifado)
):
    return await RetiradaService.get_retirada_by_id(db, retirada_id)