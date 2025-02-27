from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import get_session
from schemas.usuario import UsuarioOut, UsuarioCreate, UsuarioUpdate
from services.usuario_service import UsuarioService
from core.security import get_current_user
from typing import List

router = APIRouter(prefix="/usuarios")

@router.post("/", response_model=UsuarioOut, status_code=status.HTTP_201_CREATED)
async def create_usuario(usuario: UsuarioCreate, db: AsyncSession = Depends(get_session)):
    return await UsuarioService.create_usuario(db, usuario)

@router.get("/", response_model=List[UsuarioOut])
async def get_usuarios(db: AsyncSession = Depends(get_session), current_user=Depends(get_current_user)):
    return await UsuarioService.get_usuarios(db)

@router.get("/{usuario_id}", response_model=UsuarioOut)
async def get_usuario_by_id(usuario_id: int, db: AsyncSession = Depends(get_session),
                            current_user=Depends(get_current_user)):
    usuario = await UsuarioService.get_usuario_by_id(db, usuario_id)
    if not usuario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")
    return usuario

@router.put("/{usuario_id}", response_model=UsuarioOut)
async def update_usuario(usuario_id: int, usuario: UsuarioUpdate, db: AsyncSession = Depends(get_session),
                         current_user=Depends(get_current_user)):
    if current_user.id != usuario_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail='Usuário sem permissão para essa operação')

    return await UsuarioService.update_usuario(db, usuario_id, usuario)

@router.delete("/{usuario_id}")
async def delete_usuario(usuario_id: int, db: AsyncSession = Depends(get_session),
                         current_user=Depends(get_current_user)):
    if current_user.id != usuario_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail='Usuário sem permissão para essa operação')

    deleted_usuario = await UsuarioService.delete_usuario(db, usuario_id)
    if not deleted_usuario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")

    return {"message": "Usuário deletado com sucesso"}

@router.put("/{usuario_id}", response_model=UsuarioOut)
async def update_usuario(
    usuario_id: int, 
    usuario: UsuarioUpdate, 
    db: AsyncSession = Depends(get_session),
    current_user=Depends(get_current_user)
):
    if current_user.id != usuario_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail='Usuário sem permissão para essa operação')

    return await UsuarioService.update_usuario(db, usuario_id, usuario)
