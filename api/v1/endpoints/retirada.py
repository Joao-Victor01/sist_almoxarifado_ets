from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import get_session
from schemas.retirada import RetiradaCreate, RetiradaUpdateStatus, RetiradaOut
from services.retirada_service import RetiradaService
from core.security import get_current_user

router = APIRouter(prefix="/retiradas")

@router.post("/", response_model=RetiradaOut, status_code=status.HTTP_201_CREATED)
async def solicitar_retirada(
    retirada: RetiradaCreate,
    db: AsyncSession = Depends(get_session),
    current_user=Depends(get_current_user)
):
    """
    Endpoint para solicitar uma nova retirada.
    """
    return await RetiradaService.solicitar_retirada(db, retirada, current_user.usuario_id)

@router.put("/{retirada_id}", response_model=RetiradaOut)
async def atualizar_status_retirada(
    retirada_id: int,
    status_data: RetiradaUpdateStatus,
    db: AsyncSession = Depends(get_session),
    current_user=Depends(get_current_user)
):
    """
    Endpoint para atualizar o status de uma retirada.
    """
    return await RetiradaService.atualizar_status(db, retirada_id, status_data, current_user.usuario_id)

@router.get("/pendentes", response_model=list[RetiradaOut])
async def listar_retiradas_pendentes(
    db: AsyncSession = Depends(get_session),
    current_user=Depends(get_current_user)
):
    """
    Endpoint para listar todas as retiradas pendentes.
    """
    return await RetiradaService.get_retiradas_pendentes(db)