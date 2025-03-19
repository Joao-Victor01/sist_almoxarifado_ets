#api\v1\endpoints\alerta.py
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import get_session
from schemas.alerta import AlertaBase
from services.alerta_service import AlertaService
from typing import List

router = APIRouter(prefix="/alertas")

@router.post("/", response_model=AlertaBase, status_code=status.HTTP_201_CREATED)
async def create_alerta(
    alerta: AlertaBase,
    db: AsyncSession = Depends(get_session)
):
    return await AlertaService.create_alerta(db, alerta)

@router.get("/", response_model=List[AlertaBase])
async def get_alertas(
    db: AsyncSession = Depends(get_session)
):
    return await AlertaService.get_alertas(db)

@router.get("/{alerta_id}", response_model=AlertaBase)
async def get_alerta(
    alerta_id: int,
    db: AsyncSession = Depends(get_session)
):
    return await AlertaService.get_alerta_by_id(db, alerta_id)

@router.delete("/{alerta_id}")
async def delete_alerta(
    alerta_id: int,
    db: AsyncSession = Depends(get_session)
):
    return await AlertaService.delete_alerta(db, alerta_id)

@router.post("/generate", status_code=status.HTTP_200_OK)
async def generate_alerts(db: AsyncSession = Depends(get_session)):
    await AlertaService.generate_alerts_for_items(db)
    return {"message": "Alertas gerados com sucesso!"}
