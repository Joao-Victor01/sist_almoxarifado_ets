from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import get_session
from schemas.usuario import UsuarioOut, UsuarioCreate, UsuarioUpdate
from services.usuario_service import UsuarioService
from core.security import get_current_user
from typing import List
from sqlalchemy.future import select
from models.usuario import Usuario
from core.security import get_password_hash

router = APIRouter(prefix="/usuarios")

@router.post("/", response_model=UsuarioOut, status_code=status.HTTP_201_CREATED)
async def create_user(user: UsuarioCreate, db: AsyncSession = Depends(get_session)):
    # Verificar se o username já existe
    existing_user = await db.execute(select(Usuario).filter(Usuario.username == user.username))
    if existing_user.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Username já está em uso."
        )

    # Verificar se o email já existe
    existing_email = await db.execute(select(Usuario).filter(Usuario.email_usuario == user.email_usuario))
    if existing_email.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Email já está em uso."
        )


    #criando o modelo de usuário 
    new_user = Usuario(
        username=user.username,
        email_usuario=user.email_usuario,
        senha_usuario=get_password_hash(user.senha_usuario),
        siape_usuario=user.siape_usuario,
        tipo_usuario=user.tipo_usuario,
        nome_usuario=user.nome_usuario,
        setor_id =user.setor_id
    )

    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

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
