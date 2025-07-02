# api/v1/endpoints/usuario.py

from fastapi import APIRouter, Depends, status, Response, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from core.database import get_session
from core.security import usuario_direcao, direcao_ou_almoxarifado, todos_usuarios
from schemas.usuario import (
    UsuarioOut,
    UsuarioCreate,
    UsuarioUpdate,
    UsuarioResetPasswordSimple,
    UsuarioCheckForReset,
)
from schemas.auth_schemas import TokenSchema
from services.usuario_service import UsuarioService
from utils.logger import logger

router = APIRouter(prefix="/usuarios")


@router.post("/primeiro-usuario", status_code=status.HTTP_201_CREATED, response_model=UsuarioOut)
async def criar_primeiro_usuario(
    usuario_data: UsuarioCreate,
    db: AsyncSession = Depends(get_session),
):
    try:
        logger.info("Criando primeiro usuário")
        return await UsuarioService.create_first_user(db, usuario_data)
    except Exception as e:
        logger.error(f"Erro ao criar primeiro usuário: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro ao criar primeiro usuário")


@router.post("/", response_model=UsuarioOut, status_code=status.HTTP_201_CREATED)
async def create_user(
    user: UsuarioCreate,
    db: AsyncSession = Depends(get_session),
    current_user=Depends(usuario_direcao),
):
    try:
        logger.info(f"Usuário {current_user.usuario_id} criando novo usuário: {user.username}")
        return await UsuarioService.create_usuario(db, user)
    except Exception as e:
        logger.error(f"Erro ao criar usuário '{user.username}': {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro ao criar usuário")


@router.get("/", response_model=List[UsuarioOut], status_code=status.HTTP_200_OK)
async def get_usuarios(
    db: AsyncSession = Depends(get_session),
    current_user=Depends(direcao_ou_almoxarifado),
):
    try:
        logger.info(f"Usuário {current_user.usuario_id} listando todos os usuários")
        return await UsuarioService.get_usuarios(db)
    except Exception as e:
        logger.error(f"Erro ao listar usuários: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro ao listar usuários")


@router.get("/{usuario_id}", response_model=UsuarioOut, status_code=status.HTTP_200_OK)
async def get_usuario(
    usuario_id: int,
    db: AsyncSession = Depends(get_session),
    current_user=Depends(todos_usuarios),
):
    try:
        logger.info(f"Usuário {current_user.usuario_id} consultando usuário ID {usuario_id}")
        user = await UsuarioService.get_usuario_by_id(db, usuario_id)
        if not user:
            logger.warning(f"Usuário ID {usuario_id} não encontrado")
            raise HTTPException(status_code=404, detail="Usuário não encontrado")
        return user
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao buscar usuário ID {usuario_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro ao buscar usuário")


@router.delete("/{usuario_id}", status_code=status.HTTP_200_OK)
async def delete_usuario(
    usuario_id: int,
    db: AsyncSession = Depends(get_session),
    current_user=Depends(usuario_direcao),
):
    try:
        logger.info(f"Usuário {current_user.usuario_id} deletando usuário ID {usuario_id}")
        deleted = await UsuarioService.delete_usuario(db, usuario_id, current_user)
        if not deleted:
            logger.warning(f"Tentativa de deletar usuário ID {usuario_id} não existente")
            raise HTTPException(status_code=404, detail="Usuário não encontrado")
        return {"message": "Usuário deletado com sucesso"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao deletar usuário ID {usuario_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro ao deletar usuário")


@router.put("/{usuario_id}", response_model=UsuarioOut, status_code=status.HTTP_200_OK)
async def update_usuario(
    usuario_id: int,
    usuario: UsuarioUpdate,
    db: AsyncSession = Depends(get_session),
    current_user=Depends(todos_usuarios),
):
    try:
        logger.info(f"Usuário {current_user.usuario_id} atualizando usuário ID {usuario_id}")
        updated = await UsuarioService.update_usuario(db, usuario_id, usuario, current_user)
        if not updated:
            logger.warning(f"Tentativa de atualizar usuário ID {usuario_id} não existente")
            raise HTTPException(status_code=404, detail="Usuário não encontrado")
        return updated
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao atualizar usuário ID {usuario_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro ao atualizar usuário")


@router.post("/token", response_model=TokenSchema)
async def get_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_session),
):
    try:
        logger.info(f"Tentativa de login para username={form_data.username}")
        token = await UsuarioService.login_user(form_data, db)
        logger.info(f"Login bem‑sucedido para username={form_data.username}")
        return token
    except HTTPException as e:
        logger.warning(f"Falha no login para username={form_data.username}: {e.detail}", exc_info=True)
        raise
    except Exception as e:
        logger.error(f"Erro inesperado no login de username={form_data.username}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro ao efetuar login")


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response):
    logger.info("Logout realizado com sucesso")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/reset-password-simple", status_code=status.HTTP_200_OK)
async def reset_password_simple(
    data: UsuarioResetPasswordSimple,
    db: AsyncSession = Depends(get_session),
):
    try:
        logger.info(f"Reset de senha solicitado para: {data.username_or_email}")
        await UsuarioService.reset_password_simple(db, data.username_or_email, data.new_password)
        logger.info(f"Senha redefinida com sucesso para: {data.username_or_email}")
        return {"message": "Senha redefinida com sucesso!"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao redefinir senha para {data.username_or_email}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro ao redefinir senha")


@router.post("/check-user-for-reset", status_code=status.HTTP_200_OK)
async def check_user_for_reset(
    data: UsuarioCheckForReset,
    db: AsyncSession = Depends(get_session),
):
    try:
        exists = await UsuarioService.check_user_exists_for_reset(db, data.username_or_email)
        if not exists:
            logger.warning(f"Usuário não encontrado para reset: {data.username_or_email}")
            raise HTTPException(status_code=404, detail="Usuário não encontrado")
        logger.info(f"Usuário confirmado para reset: {data.username_or_email}")
        return {"message": "Usuário encontrado. Prossiga para a redefinição de senha."}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao verificar usuário para reset: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro ao verificar usuário")
