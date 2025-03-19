from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import get_session
from schemas.retirada import RetiradaCreate, RetiradaUpdateStatus, RetiradaOut
from services.retirada_service import RetiradaService
from core.security import get_current_user
from typing import List

router = APIRouter(prefix="/retiradas")

@router.post("/", response_model=RetiradaOut, status_code=status.HTTP_201_CREATED)
async def solicitar_retirada(
    retirada: RetiradaCreate,
    db: AsyncSession = Depends(get_session),
    current_user=Depends(get_current_user)
):
    return await RetiradaService.solicitar_retirada(db, retirada, current_user.usuario_id)

@router.put("/{retirada_id}", response_model=RetiradaOut)
async def atualizar_status_retirada(
    retirada_id: int,
    status_data: RetiradaUpdateStatus,
    db: AsyncSession = Depends(get_session),
    current_user=Depends(get_current_user)
):
    return await RetiradaService.atualizar_status(db, retirada_id, status_data, current_user.usuario_id)
