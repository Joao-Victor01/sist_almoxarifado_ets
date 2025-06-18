#api/v1/endpoints/retirada.py

from datetime import datetime
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_session
from schemas.retirada import (
    RetiradaCreate, RetiradaUpdateStatus, RetiradaOut,
    RetiradaPaginated, RetiradaFilterParams, StatusEnum
)
from services.retirada_service import RetiradaService
from core.security import todos_usuarios, usuario_almoxarifado, direcao_ou_almoxarifado

router = APIRouter(prefix="/retiradas")

@router.post("/", response_model=RetiradaOut, status_code=status.HTTP_201_CREATED)
async def solicitar_retirada(
    retirada: RetiradaCreate,
    db: AsyncSession = Depends(get_session),
    current_user=Depends(todos_usuarios)
):
    """Endpoint para um usuário solicitar uma nova retirada de itens."""
    return await RetiradaService.solicitar_retirada(db, retirada, current_user.usuario_id)

@router.put("/{retirada_id}", response_model=RetiradaOut)
async def atualizar_status_retirada(
    retirada_id: int,
    status_data: RetiradaUpdateStatus,
    db: AsyncSession = Depends(get_session),
    current_user=Depends(usuario_almoxarifado)
):
    """Endpoint para um usuário do almoxarifado atualizar o status de uma retirada."""
    return await RetiradaService.atualizar_status(db, retirada_id, status_data, current_user.usuario_id)

# Listagem paginada de todas as retiradas (para almoxarifado)
@router.get(
    "/paginated",
    response_model=RetiradaPaginated,
    name="Listar retiradas paginadas"
)
async def listar_retiradas_paginadas(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_session),
    current_user=Depends(direcao_ou_almoxarifado)
):
    """Lista todas as retiradas com paginação. Apenas para usuários do almoxarifado."""
    return await RetiradaService.get_retiradas_paginadas(db, page, page_size)

# Listagem paginada de retiradas pendentes (para todos os usuários, mas com filtro de permissão)
@router.get(
    "/pendentes/paginated",
    response_model=RetiradaPaginated,
    name="Listar pendentes paginados"
)
async def listar_pendentes_paginados(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_session),
    current_user=Depends(todos_usuarios) # Pode ser acessado por todos, mas o serviço deve filtrar
):
    """Lista retiradas pendentes com paginação."""
    return await RetiradaService.get_retiradas_pendentes_paginated(db, page, page_size)

# Busca com filtros e paginação (para almoxarifado)
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
    current_user=Depends(direcao_ou_almoxarifado)
):
    """Busca retiradas com filtros e paginação. Apenas para usuários do almoxarifado."""
    params = RetiradaFilterParams(
        status=status,
        solicitante=solicitante,
        start_date=start_date,
        end_date=end_date,
    )
    return await RetiradaService.filter_retiradas_paginated(db, params, page, page_size)

# Recupera uma específica (para almoxarifado)
@router.get("/{retirada_id}", response_model=RetiradaOut)
async def get_retirada(
    retirada_id: int,
    db: AsyncSession = Depends(get_session),
    current_user=Depends(direcao_ou_almoxarifado)
):
    """Recupera uma retirada específica pelo ID. Apenas para usuários do almoxarifado."""
    return await RetiradaService.get_retirada_by_id(db, retirada_id)

# NOVO ENDPOINT: Listagem paginada das minhas retiradas (para servidor)
@router.get(
    "/minhas-retiradas/paginated",
    response_model=RetiradaPaginated,
    name="Listar minhas retiradas paginadas"
)
async def listar_minhas_retiradas_paginadas(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_session),
    current_user=Depends(todos_usuarios) # Acessível por qualquer usuário logado
):
    """Lista as retiradas solicitadas pelo usuário logado, com paginação."""
    return await RetiradaService.get_retiradas_by_user_paginated(db, current_user.usuario_id, page, page_size)

# NOVO ENDPOINT: Soft delete de retiradas por período
@router.delete(
    "/soft-delete-by-period",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(direcao_ou_almoxarifado)], # Apenas Direção ou Almoxarifado pode fazer isso
    summary="Deleta (inativa) retiradas antigas por período"
)
async def soft_delete_retiradas(
    start_date: datetime = Query(..., description="Data inicial do período (YYYY-MM-DD)"),
    end_date: datetime = Query(..., description="Data final do período (YYYY-MM-DD)"),
    db: AsyncSession = Depends(get_session)
):
    """
    Deleta (inativa) logicamente retiradas antigas em um período especificado.
    As retiradas não são removidas fisicamente, apenas marcadas como inativas.
    """
    return await RetiradaService.soft_delete_retiradas_by_period(db, start_date, end_date)