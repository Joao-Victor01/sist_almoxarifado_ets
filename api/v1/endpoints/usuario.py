#api\v1\endpoints\usuario.py

from fastapi import APIRouter, Depends, status, Response, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import get_session
from schemas.usuario import UsuarioOut, UsuarioCreate, UsuarioUpdate, UsuarioResetPasswordSimple, UsuarioCheckForReset
from services.usuario_service import UsuarioService
from core.security import usuario_direcao, direcao_ou_almoxarifado, todos_usuarios
from typing import List
from schemas.auth_schemas import TokenSchema
from fastapi.security import OAuth2PasswordRequestForm


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
async def get_usuarios(db: AsyncSession = Depends(get_session), current_user=Depends(direcao_ou_almoxarifado)):

    response = await UsuarioService.get_usuarios(db)
    return response

@router.get("/{usuario_id}", response_model=UsuarioOut)
async def get_usuario(usuario_id: int, 
                       db: AsyncSession = Depends(get_session), 
                       current_user=Depends(todos_usuarios)):

    print(usuario_id)
    response = await UsuarioService.get_usuario_by_id(db, usuario_id)
    return response


@router.delete("/{usuario_id}")
async def delete_usuario(
    usuario_id: int,
    db: AsyncSession = Depends(get_session),
    current_user=Depends(usuario_direcao)
):
    return await UsuarioService.delete_usuario(db, usuario_id, current_user)


@router.put("/{usuario_id}", response_model=UsuarioOut)
async def update_usuario(
    usuario_id: int, 
    usuario: UsuarioUpdate, 
    db: AsyncSession = Depends(get_session),
    current_user=Depends(todos_usuarios)
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


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response):
    """
    Endpoint de logout: função dummy que pode ser usada
    para limpar cookies HttpOnly(caso fique decidido usar, ver com Robson depois).
    Retorna 204 No Content.
    """
    # Se estivesse usando cookie HttpOnly:
    # response.delete_cookie(key="access_token")
    return Response(status_code=status.HTTP_204_NO_CONTENT)

# ENDPOINT PARA REDEFINIÇÃO DE SENHA SIMPLES
@router.post("/reset-password-simple", status_code=status.HTTP_200_OK)
async def reset_password_simple(
    data: UsuarioResetPasswordSimple, # Usar o novo schema
    db: AsyncSession = Depends(get_session)
):
    """
    Redefine a senha de um usuário.
     --> lógica SIMPLES e INSEGURA, apenas para desenvolvimento.
    Em produção, avaliar método mais seguro como dois fatores com token por e-mail.
    """
    try:
        await UsuarioService.reset_password_simple(db, data.username_or_email, data.new_password)
        return {"message": "Senha redefinida com sucesso!"}
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao redefinir senha: {str(e)}"
        )
    
# ENDPOINT PARA CHECAR A EXISTÊNCIA DO USUÁRIO NA PRIMEIRA ETAPA DE ESQUECI SENHA
@router.post("/check-user-for-reset", status_code=status.HTTP_200_OK)
async def check_user_for_reset(
    data: UsuarioCheckForReset, # Usar o novo schema
    db: AsyncSession = Depends(get_session)
):
    """
    Verifica se o username ou email fornecido existe no sistema para a redefinição de senha.
    Não retorna dados do usuário, apenas confirma a existência para avançar à próxima etapa.
    PONTO DE SEGURANÇA: Este endpoint não deveria ser exposto sem CAPTCHA ou limites de taxa em produção.
    """
    user_exists = await UsuarioService.check_user_exists_for_reset(db, data.username_or_email)
    
    if not user_exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado. Verifique o nome de usuário ou e-mail."
        )
    
    return {"message": "Usuário encontrado. Prossiga para a redefinição de senha."}


