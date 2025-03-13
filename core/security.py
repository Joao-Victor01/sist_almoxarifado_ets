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


pwd_context = PasswordHash.recommended()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/almoxarifado/usuarios/token")
def get_password_hash(password: str):
    return pwd_context.hash(password)

#verifica se a senha original condiz com a senha que foi gerada no hash da função get_password_hash
def verify_password(orginal_password: str, hashed_password: str):
    return pwd_context.verify(orginal_password, hashed_password)

def create_access_token(data_payload: dict):
    to_encode = data_payload.copy()

    #ver se é melhor usar ZoneInfo
    expire_date = datetime.now(tz=settings.BRASILIA_TIMEZONE) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({'exp': expire_date.timestamp()})

    encoded_jwt = encode(to_encode, settings.JWT_SECRET, algorithm=settings.ALGORITHM)

    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), 
                     db: AsyncSession = Depends(get_session)):
    
    credentials_exception = HTTPException(status_code= status.HTTP_401_UNAUTHORIZED, 
                                          detail='Não foi possível validar as credenciais',
                                          headers={'WWW-Autenticate' : 'Bearer'})
    
    try:
        payload = decode(token, settings.JWT_SECRET, algorithms=[settings.ALGORITHM])
        username: str = payload.get('sub')

        if not username:
            raise credentials_exception

    except PyJWTError:
        raise credentials_exception
    
    user = await db.scalar(select(Usuario).where(Usuario.username == username))

    if not user:
        raise credentials_exception
    
    return user