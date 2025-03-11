from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from core.database import get_session
from schemas.auth_schemas import TokenSchema
from models.usuario import Usuario
from core.security import verify_password
from core.security import create_access_token
from fastapi.security import OAuth2PasswordRequestForm

router = APIRouter(prefix="/auth")


@router.post('/token', response_model=TokenSchema)
async def get_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_session)
):
    # Use await para buscar o usuário
    user = await db.scalar(select(Usuario).where(Usuario.username == form_data.username))

    if not user or not verify_password(form_data.password, user.senha_usuario):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nome de usuário ou senha incorreta"
        )
    
    access_token = create_access_token(data_payload={'sub': user.username})

    return {'access_token': access_token, 'token_type': 'Bearer'}
