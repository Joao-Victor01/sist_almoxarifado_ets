#api\v1\endpoints\alerta.py
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import get_session
from services.alerta_service import AlertaService
from core.security import usuario_almoxarifado
from models.alerta import TipoAlerta
from schemas.alerta import PaginatedAlertas, AlertaOut 


router = APIRouter(prefix="/alertas")

@router.get("/", dependencies=[Depends(usuario_almoxarifado)])
async def listar_alertas(db: AsyncSession = Depends(get_session)):

    alertas = await AlertaService.get_alertas(db)    
    return alertas

@router.get("/paginated", response_model=PaginatedAlertas, dependencies=[Depends(usuario_almoxarifado)])
async def listar_alertas_paginados(
    page: int = Query(1, ge=1, description="Número da página"),
    size: int = Query(10, ge=1, le=100, description="Alertas por página: 5, 10, 25, 50 ou 100"),
    db: AsyncSession = Depends(get_session)
):
    """
    Lista alertas do sistema com paginação.
    """
    return await AlertaService.get_alertas_paginated(db, page, size)


#ignorar novos alertas para o mesmo item/motivo
@router.patch("/ignorar/{alerta_id}")
async def ignorar_alerta(alerta_id: int, db: AsyncSession = Depends(get_session)):  
    await AlertaService.ignorar_alertas(db, alerta_id)
    return {"message": "Novos alertas para este item/motivo não serão gerados"}