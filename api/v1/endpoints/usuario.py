#api\v1\endpoints\usuario.py

from fastapi import APIRouter, Depends, status, Response
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import get_session
from schemas.usuario import UsuarioOut, UsuarioCreate, UsuarioUpdate
from services.usuario_service import UsuarioService
from core.security import usuario_direcao
from typing import List
from schemas.auth_schemas import TokenSchema
from fastapi.security import OAuth2PasswordRequestForm
from datetime import datetime, timedelta



router = APIRouter(prefix="/usuarios")

@router.post("/primeiro-usuario", status_code=201)
async def criar_primeiro_usuario(
    usuario_data: UsuarioCreate,
    db: AsyncSession = Depends(get_session)
):    
    # Cria o primeiro usuário
    return await UsuarioService.create_first_user(db, usuario_data)


@router.post("/", response_model=UsuarioOut, status_code=status.HTTP_201_CREATED)
async def create_user(user: UsuarioCreate, db: AsyncSession = Depends(get_session),
                      current_user = Depends(usuario_direcao)):
    new_user = await UsuarioService.create_usuario(db, user)
    return new_user

@router.get("/", response_model=List[UsuarioOut])
async def get_usuarios(db: AsyncSession = Depends(get_session), current_user=Depends(usuario_direcao)):

    response = await UsuarioService.get_usuarios(db)
    return response

@router.get("/{usuario_id}", response_model=UsuarioOut)
async def get_usuario(usuario_id: int, 
                       db: AsyncSession = Depends(get_session), 
                       current_user=Depends(usuario_direcao)):

    print(usuario_id)
    response = await UsuarioService.get_usuario_by_id(db, usuario_id)
    return response


@router.delete("/{usuario_id}")
async def delete_usuario(usuario_id: int, 
                         db: AsyncSession = Depends(get_session),
                         current_user=Depends(usuario_direcao)):

    response = await UsuarioService.delete_usuario(db, usuario_id, current_user)
    return response

@router.put("/{usuario_id}", response_model=UsuarioOut)
async def update_usuario(
    usuario_id: int, 
    usuario: UsuarioUpdate, 
    db: AsyncSession = Depends(get_session),
    current_user=Depends(usuario_direcao)
):


    return await UsuarioService.update_usuario(db, usuario_id, usuario, current_user)


#login usuario
@router.post('/token', response_model=TokenSchema)
async def get_access_token(
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_session),
):
    token_dict = await UsuarioService.login_user(form_data, db)
    token = TokenSchema(**token_dict)
    expires = datetime.utcnow() + timedelta(days=1)


    response.set_cookie(
        key="access_token",
        value=token.access_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=86400,  # 60 segundos * 60 minutos * 24 horas
        expires=expires.strftime("%a, %d-%b-%Y %H:%M:%S GMT"),
        path="/"
    )

    return token