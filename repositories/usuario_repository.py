from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from models.usuario import Usuario
from schemas.usuario import UsuarioCreate, UsuarioUpdate
from core.security import get_password_hash
from fastapi import HTTPException, status

class UsuarioRepository:
    @staticmethod
    async def create_usuario(db: AsyncSession, user_data: UsuarioCreate):

        #criando o modelo de usuário 
        new_user = Usuario(
            siape_usuario=user_data.siape_usuario,
            nome_usuario=user_data.nome_usuario,
            senha_usuario=get_password_hash(user_data.senha_usuario),
            tipo_usuario=user_data.tipo_usuario,
            email_usuario=user_data.email_usuario,
            setor_id=user_data.setor_id,
            username=user_data.username,

        )

        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)
        return new_user



    @staticmethod
    async def get_usuarios(db: AsyncSession):
        result = await db.execute(
            select(Usuario).where(Usuario.is_active == True)
        )
        return result.scalars().all()

    @staticmethod
    async def get_usuario_by_id(db: AsyncSession, usuario_id: int):
        result = await db.execute(
            select(Usuario)
            .where(Usuario.usuario_id == usuario_id, Usuario.is_active == True)
        )
        usuario = result.scalars().first()
        if not usuario:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuário não encontrado ou inativo"
            )
        return usuario
    
    #deletar usuário (soft delete)
    @staticmethod
    async def delete_usuario(db: AsyncSession, usuario_id: int):
        result = await db.execute(
            select(Usuario).where(Usuario.usuario_id == usuario_id)
        )
        usuario = result.scalars().first()
        if not usuario:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuário não encontrado"
            )
        # Soft delete:
        usuario.is_active = False
        await db.commit()
        return {"message": "Usuário inativado com sucesso"}

    # atualizar dados do usuario 
    @staticmethod
    async def update_usuario(db: AsyncSession, usuario_id: int, usuario_data: UsuarioUpdate):
        result = await db.execute(select(Usuario).where(Usuario.usuario_id == usuario_id))
        usuario = result.scalars().first()

        if not usuario:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")

        # Atualiza apenas os campos enviados na requisição
        if usuario_data.nome_usuario:
            usuario.nome_usuario = usuario_data.nome_usuario

        if usuario_data.email_usuario:
            usuario.email_usuario = usuario_data.email_usuario.lower()

        if usuario_data.tipo_usuario is not None:
            usuario.tipo_usuario = usuario_data.tipo_usuario

        if usuario_data.setor_id is not None:
            usuario.setor_id = usuario_data.setor_id

        if usuario_data.senha_usuario:
            usuario.senha_usuario = get_password_hash(usuario_data.senha_usuario)

        if usuario_data.username:
            usuario.username = usuario_data.username.lower()

        await db.commit()
        await db.refresh(usuario)
        return usuario
