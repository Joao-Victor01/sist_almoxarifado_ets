# core/security.py
from pwdlib import PasswordHash
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jwt import encode, decode
from jwt.exceptions import PyJWTError
from datetime import datetime, timedelta
from core.configs import settings
from core.database import get_session
from sqlalchemy.ext.asyncio import AsyncSession
from models import Usuario
from sqlalchemy.future import select
from models.usuario import RoleEnum
from typing import List

pwd_context = PasswordHash.recommended()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/almoxarifado/usuarios/token")

def get_password_hash(password: str):
    return pwd_context.hash(password)

def verify_password(original_password: str, hashed_password: str):
    return pwd_context.verify(original_password, hashed_password)

def create_access_token(data_payload: dict, tipo_usuario: int, usuario_id: int = None): # Adicionado usuario_id
    to_encode = data_payload.copy()
    if tipo_usuario is not None:
        to_encode.update({'tipo_usuario': tipo_usuario})
    if usuario_id is not None: # Adiciona o usuario_id ao payload
        to_encode.update({'usuario_id': usuario_id})

    #ver se é melhor usar ZoneInfo
    expire_date = datetime.now(tz=settings.BRASILIA_TIMEZONE) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({'exp': expire_date.timestamp()})

    encoded_jwt = encode(to_encode, settings.JWT_SECRET, algorithm=settings.ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme),
                           db: AsyncSession = Depends(get_session)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail='Não foi possível validar as credenciais',
        headers={'WWW-Authenticate': 'Bearer'}
    )
    try:
        payload = decode(token, settings.JWT_SECRET, algorithms=[settings.ALGORITHM])
        username: str = payload.get('sub')
        tipo_usuario = payload.get('tipo_usuario') # Agora buscando 'tipo_usuario'
        #  Obtendo o usuario_id do token
        usuario_id = payload.get('usuario_id')

        if not username:
            raise credentials_exception
    except PyJWTError:
        raise credentials_exception

    user = await db.scalar(select(Usuario).where(Usuario.username == username))
    if not user:
        raise credentials_exception
    user.tipo_usuario_from_token = tipo_usuario
    user.usuario_id_from_token = usuario_id # Armazena o ID do token no objeto do usuário

    return user

def verify_user_type(allowed_types: List[RoleEnum]):
    allowed_values = [t.value for t in allowed_types]
    def verifier(current_user: Usuario = Depends(get_current_user)):
        tipo_usuario = current_user.tipo_usuario_from_token
        if tipo_usuario not in allowed_values:
            allowed_names = [t.name for t in allowed_types]
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acesso restrito a: {', '.join(allowed_names)}"
            )
        return current_user
    return verifier

# Verificadores (use os mesmos nomes do RoleEnum)
usuario_direcao = verify_user_type([RoleEnum.USUARIO_DIRECAO])
usuario_almoxarifado = verify_user_type([RoleEnum.USUARIO_ALMOXARIFADO])
usuario_geral = verify_user_type([RoleEnum.USUARIO_GERAL])
direcao_ou_almoxarifado = verify_user_type([RoleEnum.USUARIO_ALMOXARIFADO, RoleEnum.USUARIO_DIRECAO])
todos_usuarios = verify_user_type([RoleEnum.USUARIO_ALMOXARIFADO, RoleEnum.USUARIO_DIRECAO, RoleEnum.USUARIO_GERAL])