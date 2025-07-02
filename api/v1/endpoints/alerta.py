from fastapi import APIRouter, Depends, Query, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import get_session
from services.alerta_service import AlertaService
from core.security import usuario_almoxarifado, direcao_ou_almoxarifado, todos_usuarios
from schemas.alerta import PaginatedAlertas, AlertaOut
from utils.logger import logger

router = APIRouter(prefix="/alertas")


@router.get("/", response_model=list[AlertaOut], dependencies=[Depends(direcao_ou_almoxarifado)])
async def listar_todos_alertas(db: AsyncSession = Depends(get_session)):
    """Lista todos os alertas do sistema (sem paginação)."""
    try:
        logger.info("Listando todos os alertas (sem paginação)")
        return await AlertaService.get_alertas(db)
    except Exception as e:
        logger.error(f"Erro ao listar todos os alertas: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro ao listar alertas")


@router.get("/paginated", response_model=PaginatedAlertas, dependencies=[Depends(direcao_ou_almoxarifado)])
async def listar_alertas_paginados(
    page: int = Query(1, ge=1, description="Número da página"),
    size: int = Query(10, ge=1, le=100, description="Alertas por página"),
    tipo_alerta: int | None = Query(None, description="1: Estoque Baixo, 2: Validade Próxima"),
    search_term: str | None = Query(None, description="Buscar por mensagem ou ID do item"),
    db: AsyncSession = Depends(get_session)
):
    """Lista alertas do sistema com paginação e filtros."""
    try:
        logger.info(f"Listando alertas paginados (page={page}, size={size}, tipo_alerta={tipo_alerta}, search_term='{search_term}')")
        return await AlertaService.get_alertas_paginated(db, page, size, tipo_alerta, search_term)
    except Exception as e:
        logger.error(f"Erro ao listar alertas paginados: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro ao listar alertas paginados")


@router.patch("/ignorar/{alerta_id}", response_model=AlertaOut, dependencies=[Depends(usuario_almoxarifado)])
async def ignorar_alerta(alerta_id: int, db: AsyncSession = Depends(get_session)):
    """Marca um alerta como 'ignorar novos'."""
    try:
        logger.info(f"Marcando alerta_id={alerta_id} como 'ignorar novos'")
        return await AlertaService.mark_alerta_as_ignorar_novos(db, alerta_id)
    except Exception as e:
        logger.error(f"Erro ao ignorar alerta_id={alerta_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro ao ignorar alerta")


@router.get("/unviewed-count", dependencies=[Depends(todos_usuarios)])
async def get_unviewed_alerts_count(db: AsyncSession = Depends(get_session)):
    """Retorna o número de alertas não visualizados."""
    try:
        count = await AlertaService.get_unviewed_alerts_count(db)
        logger.debug(f"Número de alertas não visualizados: {count}")
        return {"count": count}
    except Exception as e:
        logger.error(f"Erro ao obter contagem de alertas não visualizados: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro ao obter contagem")


@router.patch("/mark-viewed", dependencies=[Depends(direcao_ou_almoxarifado)])
async def mark_all_alerts_as_viewed(db: AsyncSession = Depends(get_session)):
    """Marca todos os alertas como visualizados."""
    try:
        await AlertaService.mark_all_alerts_as_viewed(db)
        logger.info("Todos os alertas foram marcados como visualizados")
        return {"message": "Todos os alertas marcados como visualizados."}
    except Exception as e:
        logger.error(f"Erro ao marcar todos os alertas como visualizados: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro ao marcar como visualizados")


@router.delete("/{alerta_id}", status_code=status.HTTP_200_OK, dependencies=[Depends(usuario_almoxarifado)])
async def delete_alerta(alerta_id: int, db: AsyncSession = Depends(get_session)):
    """Deleta um alerta específico pelo ID."""
    try:
        logger.info(f"Deletando alerta_id={alerta_id}")
        return await AlertaService.delete_alerta(db, alerta_id)
    except Exception as e:
        logger.error(f"Erro ao deletar alerta_id={alerta_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro ao deletar alerta")
