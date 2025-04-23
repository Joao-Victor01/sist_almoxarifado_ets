#api\v1\endpoints\alerta.py
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import get_session
from services.alerta_service import AlertaService
from core.security import usuario_almoxarifado
from models.alerta import TipoAlerta

router = APIRouter(prefix="/alertas")

@router.get("/", dependencies=[Depends(usuario_almoxarifado)])
async def listar_alertas(db: AsyncSession = Depends(get_session)):

    alertas = await AlertaService.get_alertas(db)    
    return alertas

#ignorar novos alertas para o mesmo item/motivo
@router.patch("/ignorar/{alerta_id}")
async def ignorar_alerta(alerta_id: int, db: AsyncSession = Depends(get_session)):  
    await AlertaService.ignorar_alertas(db, alerta_id)
    return {"message": "Novos alertas para este item/motivo não serão gerados"}