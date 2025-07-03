from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import get_session
from schemas.setor import SetorCreate, SetorUpdate, SetorOut
from services.setor_service import SetorService
from typing import List
from core.security import usuario_direcao, todos_usuarios
from utils.logger import logger

router = APIRouter(prefix="/setores")


@router.post("/", response_model=SetorOut, status_code=status.HTTP_201_CREATED)
async def create_setor(
    setor: SetorCreate,
    db: AsyncSession = Depends(get_session),
    current_user=Depends(usuario_direcao)
):
    try:
        logger.info(f"Usuário {current_user.usuario_id} criando setor: {setor.nome_setor}")
        return await SetorService.create_setor(db, setor)
    except Exception as e:
        logger.error(f"Erro ao criar setor '{setor.nome_setor}': {e}")
        raise HTTPException(status_code=500, detail="Erro ao criar setor")


@router.get("/", response_model=List[SetorOut], status_code=status.HTTP_200_OK)
async def get_setores(
    db: AsyncSession = Depends(get_session),
    current_user=Depends(todos_usuarios)
):
    try:
        logger.info(f"Usuário {current_user.usuario_id} listando todos os setores")
        return await SetorService.get_setores(db)
    except Exception as e:
        logger.error(f"Erro ao listar setores: {e}")
        raise HTTPException(status_code=500, detail="Erro ao listar setores")


@router.get("/{setor_id}", response_model=SetorOut, status_code=status.HTTP_200_OK)
async def get_setor_by_id(
    setor_id: int,
    db: AsyncSession = Depends(get_session),
    current_user=Depends(todos_usuarios)
):
    try:
        logger.info(f"Usuário {current_user.usuario_id} consultando setor ID {setor_id}")
        setor = await SetorService.get_setor_by_id(db, setor_id)
        if not setor:
            logger.warning(f"Setor ID {setor_id} não encontrado")
            raise HTTPException(status_code=404, detail="Setor não encontrado")
        return setor
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao buscar setor ID {setor_id}: {e}")
        raise HTTPException(status_code=500, detail="Erro ao buscar setor")


@router.put("/{setor_id}", response_model=SetorOut, status_code=status.HTTP_200_OK)
async def update_setor(
    setor_id: int,
    setor: SetorUpdate,
    db: AsyncSession = Depends(get_session),
    current_user=Depends(usuario_direcao)
):
    try:
        logger.info(f"Usuário {current_user.usuario_id} atualizando setor ID {setor_id} para: {setor.nome_setor}")
        updated = await SetorService.update_setor(db, setor_id, setor)
        if not updated:
            logger.warning(f"Tentativa de atualizar setor ID {setor_id} não existente")
            raise HTTPException(status_code=404, detail="Setor não encontrado")
        return updated
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao atualizar setor ID {setor_id}: {e}")
        raise HTTPException(status_code=500, detail="Erro ao atualizar setor")


@router.delete("/{setor_id}", status_code=status.HTTP_200_OK)
async def delete_setor(
    setor_id: int,
    db: AsyncSession = Depends(get_session),
    current_user=Depends(usuario_direcao)
):
    try:
        logger.info(f"Usuário {current_user.usuario_id} deletando setor ID {setor_id}")
        deleted = await SetorService.delete_setor(db, setor_id)
        if not deleted:
            logger.warning(f"Tentativa de deletar setor ID {setor_id} não existente")
            raise HTTPException(status_code=404, detail="Setor não encontrado")
        return {"message": "Setor deletado com sucesso"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao deletar setor ID {setor_id}: {e}")
        raise HTTPException(status_code=500, detail="Erro ao deletar setor")
