from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from models.usuario import Usuario
from schemas.usuario import UsuarioCreate, UsuarioUpdate
from repositories.usuario_repository import UsuarioRepository
from fastapi import HTTPException, status, Depends
from core.security import get_password_hash, verify_password, create_access_token
from fastapi.security import OAuth2PasswordRequestForm
from core.database import get_session



class UsuarioService:

    #create user
    @staticmethod
    async def create_usuario(db: AsyncSession, user_data: UsuarioCreate):
        existing_user = await db.execute(select(Usuario).filter(Usuario.username == user_data.username))
        if existing_user.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Username já está em uso."
            )

        # Verificar se o email já existe
        existing_email = await db.execute(select(Usuario).filter(Usuario.email_usuario == user_data.email_usuario))
        if existing_email.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Email já está em uso."
            )
        
        new_user = await UsuarioRepository.create_usuario(db, user_data)
        return new_user

    
    #get users
    @staticmethod
    async def get_usuarios(db: AsyncSession):
        usuarios = await UsuarioRepository.get_usuarios(db)
        return usuarios

    #get user by id
    @staticmethod
    async def get_usuario_by_id(db: AsyncSession, usuario_id: int):
        usuario = await UsuarioRepository.get_usuario_by_id(db, usuario_id)
        if not usuario:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")
        return usuario

    #delete user by id
    @staticmethod
    async def delete_usuario(db: AsyncSession, usuario_id: int, current_user):
        result = await UsuarioRepository.get_usuario_by_id(db, usuario_id)
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="Usuário não encontrado."
            )

        if current_user.usuario_id != usuario_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail='Usuário sem permissão para essa operação'
            )

        # Verifica se o usuário tem retiradas associadas antes de excluir
        has_dependencias = await db.execute(select(Usuario).filter(Usuario.usuario_id == usuario_id))
        if has_dependencias.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Usuário possui dependências e não pode ser excluído."
            )

        return await UsuarioRepository.delete_usuario(db, usuario_id)
    

    from sqlalchemy.ext.asyncio import AsyncSession

    #update user by id 
    @staticmethod
    async def update_usuario(db: AsyncSession, usuario_id: int, usuario_data: UsuarioUpdate, current_user):
        usuario = await UsuarioRepository.get_usuario_by_id(db, usuario_id)

        if current_user.usuario_id != usuario_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail='Usuário sem permissão para essa operação')

        if not usuario:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuário não encontrado."
            )

        # Atualiza apenas os campos enviados na requisição
        if usuario_data.nome_usuario:
            usuario.nome_usuario = usuario_data.nome_usuario
        
        if usuario_data.email_usuario:
            # Verifica se o email já está em uso por outro usuário
            existing_email = await db.scalar(select(Usuario).where(Usuario.email_usuario == usuario_data.email_usuario, Usuario.id != usuario_id))
            if existing_email:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST, 
                    detail="Email já está em uso por outro usuário."
                )
            usuario.email_usuario = usuario_data.email_usuario
        
        if usuario_data.username:
            # Verifica se o username já está em uso por outro usuário
            existing_username = await db.scalar(select(Usuario).where(Usuario.username == usuario_data.username, Usuario.id != usuario_id))
            if existing_username:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST, 
                    detail="Username já está em uso por outro usuário."
                )
            usuario.username = usuario_data.username

        if usuario_data.tipo_usuario is not None:
            usuario.tipo_usuario = usuario_data.tipo_usuario

        if usuario_data.setor_id is not None:
            usuario.setor_id = usuario_data.setor_id

        if usuario_data.senha_usuario:
            usuario.senha_usuario = get_password_hash(usuario_data.senha_usuario)

        return await UsuarioRepository.update_usuario(db, usuario)
    
    @staticmethod
    async def login_user(form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_session)):
        #buscar o usuário
        user = await db.scalar(select(Usuario).where(Usuario.username == form_data.username))

        if not user or not verify_password(form_data.password, user.senha_usuario):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Nome de usuário ou senha incorreta"
            )
        
        access_token = create_access_token(data_payload={'sub': user.username})

        return {'access_token': access_token, 'token_type': 'Bearer'}


