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
    
    # Converter valores numéricos para labels
    return [{
        **alerta.__dict__,
        "tipo_label": TipoAlerta(alerta.tipo_alerta).name
    } for alerta in alertas]

#ignorar novos alertas para o mesmo item/motivo
@router.patch("/alertas/{alerta_id}/ignorar")
async def ignorar_alerta(alerta_id: int, db: AsyncSession = Depends(get_session)):
    alerta = await AlertaService.get_alerta_by_id(db, alerta_id)
    alerta.ignorar_novos = True  # Marca para ignorar novos alertas
    await db.commit()
    return {"message": "Novos alertas para este item/motivo não serão gerados"}