# frontend/routes/deps.py

from fastapi import Cookie, Depends, HTTPException, status
from jwt import decode, PyJWTError
from core.configs import settings

async def get_current_user_type(
    access_token: str | None = Cookie(None),
) -> int:
    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de autenticação não fornecido.",
        )
    try:
        payload = decode(
            access_token,
            settings.JWT_SECRET,
            algorithms=[settings.ALGORITHM]
        )
    except PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado.",
        )
    tipo = payload.get("tipo_usuario")
    if tipo is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Payload do token sem tipo de usuário.",
        )
    return tipo

def require_user_type(
    allowed_type: int,
):
    """
    Retorna uma dependency que levanta 403 se
    o tipo do usuário for diferente do permitido.
    """
    async def _verify(tipo: int = Depends(get_current_user_type)):
        if tipo != allowed_type:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso proibido para este recurso.",
            )
    return Depends(_verify)
