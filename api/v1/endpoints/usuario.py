from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import get_session
from schemas.usuario import UsuarioOut, UsuarioCreate, UsuarioUpdate
from services.usuario_service import UsuarioService
from core.security import get_current_user, verify_password, create_access_token
from typing import List
from sqlalchemy.future import select
from models.usuario import Usuario
from core.security import get_password_hash
from schemas.auth_schemas import TokenSchema
from fastapi.security import OAuth2PasswordRequestForm


router = APIRouter(prefix="/usuarios")

@router.post("/", response_model=UsuarioOut, status_code=status.HTTP_201_CREATED)
async def create_user(user: UsuarioCreate, db: AsyncSession = Depends(get_session)):
    new_user = await UsuarioService.create_usuario(db, user)
    return new_user

@router.get("/", response_model=List[UsuarioOut])
async def get_usuarios(db: AsyncSession = Depends(get_session), current_user=Depends(get_current_user)):

    response = await UsuarioService.get_usuarios(db)
    return response

@router.get("/{usuario_id}", response_model=UsuarioOut)
async def get_usuario_by_id(usuario_id: int, db: AsyncSession = Depends(get_session),
                            current_user=Depends(get_current_user)):
    
    response = await UsuarioService.get_usuario_by_id
    return response

@router.delete("/{usuario_id}")
async def delete_usuario(usuario_id: int, db: AsyncSession = Depends(get_session),
                         current_user=Depends(get_current_user)):

    response = await UsuarioService.delete_usuario(db, usuario_id, current_user)
    return response

@router.put("/{usuario_id}", response_model=UsuarioOut)
async def update_usuario(
    usuario_id: int, 
    usuario: UsuarioUpdate, 
    db: AsyncSession = Depends(get_session),
    current_user=Depends(get_current_user)
):


    return await UsuarioService.update_usuario(db, usuario_id, usuario, current_user)



#login usuario
@router.post('/token', response_model=TokenSchema)
async def get_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_session)
):
    result = await UsuarioService.login_user(form_data, db)

    return result