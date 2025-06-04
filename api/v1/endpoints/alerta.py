#api\vl\endpoints\alerta.py

from fastapi import APIRouter, Depends, Query, status # Importar 'status' para HTTP status codes
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_session

from services.alerta_service import AlertaService

from core.security import usuario_almoxarifado, direcao_ou_almoxarifado, todos_usuarios
from models.alerta import TipoAlerta

from schemas.alerta import PaginatedAlertas, AlertaOut

router = APIRouter (prefix="/alertas")

@router.get("/", response_model=list [AlertaOut] , dependencies=[Depends (usuario_almoxarifado)])
async def listar_todos_alertas (db: AsyncSession = Depends (get_session)):
    """Lista todos os alertas do sistema (sem paginação)."""
    return await AlertaService.get_alertas(db)

@router.get("/paginated", response_model=PaginatedAlertas, dependencies=[Depends (usuario_almoxarifado)])
async def listar_alertas_paginados (
    page: int = Query(1, ge=1, description="Número da página"),
    size: int = Query(10, ge=1, le=100, description="Alertas por página: 5, 10, 25, 50 ou 100"),
    tipo_alerta: int | None = Query (None, description="Filtrar por tipo de alerta (1: Estoque Baixo, 2: Validade Próxima)"),
    search_term: str | None = Query (None, description="Filtrar por mensagem do alerta ou ID do item (parte da string)"),
    db: AsyncSession = Depends (get_session)
):
    """Lista alertas do sistema com paginação e filtros."""
    return await AlertaService.get_alertas_paginated(db, page, size, tipo_alerta, search_term)

@router.patch("/ignorar/{alerta_id}", response_model=AlertaOut, dependencies=[Depends (usuario_almoxarifado)])
async def ignorar_alerta (alerta_id: int, db: AsyncSession = Depends (get_session)):
    """Marca um alerta como 'ignorar novos', para que não seja gerado novamente para o mesmo item/motivo."""
    return await AlertaService.mark_alerta_as_ignorar_novos (db, alerta_id)

#  Endpoint para obter a contagem de alertas não visualizados
@router.get("/unviewed-count", dependencies=[Depends (todos_usuarios)])
async def get_unviewed_alerts_count(db: AsyncSession = Depends (get_session)):
    """Retorna o número de alertas não visualizados."""
    count = await AlertaService.get_unviewed_alerts_count(db)
    return {"count": count}

#  Endpoint para marcar todos os alertas como visualizados
@router.patch("/mark-viewed", dependencies=[Depends (direcao_ou_almoxarifado)])
async def mark_all_alerts_as_viewed (db: AsyncSession = Depends (get_session)):
    """Marca todos os alertas como visualizados."""
    await AlertaService.mark_all_alerts_as_viewed (db)
    return {"message": "Todos os alertas marcados como visualizados."}

# Deletar Alerta
@router.delete("/{alerta_id}", status_code=status.HTTP_200_OK, dependencies=[Depends(usuario_almoxarifado)])
async def delete_alerta(alerta_id: int, db: AsyncSession = Depends(get_session)):
    """Deleta um alerta específico pelo ID."""
    return await AlertaService.delete_alerta(db, alerta_id)
