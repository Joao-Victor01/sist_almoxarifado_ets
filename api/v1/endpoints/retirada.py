from datetime import datetime
from fastapi import APIRouter, Depends, status, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import get_session
from schemas.retirada import (
    RetiradaCreate, RetiradaUpdateStatus, RetiradaOut,
    RetiradaPaginated, RetiradaFilterParams, StatusEnum
)
from services.retirada_service import RetiradaService
from core.security import todos_usuarios, usuario_almoxarifado, direcao_ou_almoxarifado
from utils.logger import logger

router = APIRouter(prefix="/retiradas")


@router.post("/", response_model=RetiradaOut, status_code=status.HTTP_201_CREATED)
async def solicitar_retirada(
    retirada: RetiradaCreate,
    db: AsyncSession = Depends(get_session),
    current_user=Depends(todos_usuarios)
):
    try:
        logger.info(
            f"Usuário {current_user.usuario_id} solicitando retirada: "
            f"item_id={retirada.item_id}, quantidade={retirada.quantidade}"
        )
        return await RetiradaService.solicitar_retirada(db, retirada, current_user.usuario_id)
    except Exception as e:
        logger.error(f"Erro ao solicitar retirada: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro ao solicitar retirada")


@router.put("/{retirada_id}", response_model=RetiradaOut)
async def atualizar_status_retirada(
    retirada_id: int,
    status_data: RetiradaUpdateStatus,
    db: AsyncSession = Depends(get_session),
    current_user=Depends(usuario_almoxarifado)
):
    try:
        logger.info(
            f"Usuário {current_user.usuario_id} atualizando status da retirada ID {retirada_id} "
            f"para {status_data.status}"
        )
        return await RetiradaService.atualizar_status(
            db, retirada_id, status_data, current_user.usuario_id
        )
    except Exception as e:
        logger.error(f"Erro ao atualizar status de retirada ID {retirada_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro ao atualizar status da retirada")


@router.get("/paginated", response_model=RetiradaPaginated, name="Listar retiradas paginadas")
async def listar_retiradas_paginadas(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_session),
    current_user=Depends(direcao_ou_almoxarifado)
):
    try:
        logger.info(f"Usuário {current_user.usuario_id} listando retiradas (page={page}, size={page_size})")
        return await RetiradaService.get_retiradas_paginadas(db, page, page_size)
    except Exception as e:
        logger.error(f"Erro ao listar retiradas paginadas: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro ao listar retiradas")


@router.get("/pendentes/paginated", response_model=RetiradaPaginated, name="Listar pendentes paginados")
async def listar_pendentes_paginados(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_session),
    current_user=Depends(todos_usuarios)
):
    try:
        logger.info(f"Usuário {current_user.usuario_id} listando retiradas pendentes (page={page}, size={page_size})")
        return await RetiradaService.get_retiradas_pendentes_paginated(db, page, page_size)
    except Exception as e:
        logger.error(f"Erro ao listar retiradas pendentes: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro ao listar pendentes")


@router.get("/search", response_model=RetiradaPaginated, name="Buscar retiradas por filtros paginados")
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
    try:
        params = RetiradaFilterParams(
            status=status, solicitante=solicitante,
            start_date=start_date, end_date=end_date
        )
        logger.info(
            f"Usuário {current_user.usuario_id} buscando retiradas com filtros: "
            f"{params.dict()} (page={page}, size={page_size})"
        )
        return await RetiradaService.filter_retiradas_paginated(db, params, page, page_size)
    except Exception as e:
        logger.error(f"Erro ao buscar retiradas por filtros: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro ao buscar retiradas")


@router.get("/{retirada_id}", response_model=RetiradaOut)
async def get_retirada(
    retirada_id: int,
    db: AsyncSession = Depends(get_session),
    current_user=Depends(direcao_ou_almoxarifado)
):
    try:
        logger.info(f"Usuário {current_user.usuario_id} consultando retirada ID {retirada_id}")
        return await RetiradaService.get_retirada_by_id(db, retirada_id)
    except Exception as e:
        logger.error(f"Erro ao buscar retirada ID {retirada_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro ao buscar retirada")


@router.get("/minhas-retiradas/paginated", response_model=RetiradaPaginated, name="Listar minhas retiradas paginadas")
async def listar_minhas_retiradas_paginadas(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_session),
    current_user=Depends(todos_usuarios)
):
    try:
        logger.info(f"Usuário {current_user.usuario_id} listando suas retiradas (page={page}, size={page_size})")
        return await RetiradaService.get_retiradas_by_user_paginated(db, current_user.usuario_id, page, page_size)
    except Exception as e:
        logger.error(f"Erro ao listar minhas retiradas: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro ao listar minhas retiradas")


@router.delete("/soft-delete-by-period", status_code=status.HTTP_200_OK, dependencies=[Depends(direcao_ou_almoxarifado)])
async def soft_delete_retiradas(
    start_date: datetime = Query(...),
    end_date: datetime = Query(...),
    db: AsyncSession = Depends(get_session)
):
    try:
        logger.info(f"Solicitando soft-delete de retiradas no período {start_date} a {end_date}")
        return await RetiradaService.soft_delete_retiradas_by_period(db, start_date, end_date)
    except Exception as e:
        logger.error(f"Erro ao soft-delete de retiradas: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro ao inativar retiradas")
