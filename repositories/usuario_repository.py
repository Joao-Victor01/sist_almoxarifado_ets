from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from models.usuario import Usuario
from schemas.usuario import UsuarioCreate, UsuarioUpdate
from core.security import get_password_hash

class UsuarioRepository:
    @staticmethod
    async def create_usuario(db: AsyncSession, usuario_data: UsuarioCreate):
        novo_usuario = Usuario(
            nome_usuario=usuario_data.nome_usuario,
            email_usuario=usuario_data.email_usuario,
            tipo_usuario=usuario_data.tipo_usuario,
            setor_id=usuario_data.setor_id,
            senha_usuario=get_password_hash(usuario_data.senha_usuario)
        )
        db.add(novo_usuario)
        await db.commit()
        await db.refresh(novo_usuario)
        return novo_usuario

    @staticmethod
    async def get_usuarios(db: AsyncSession):
        result = await db.execute(select(Usuario))
        return result.scalars().all()

    @staticmethod
    async def get_usuario_by_id(db: AsyncSession, usuario_id: int):
        result = await db.execute(select(Usuario).where(Usuario.usuario_id == usuario_id))
        return result.scalars().first()

    @staticmethod
    async def delete_usuario(db: AsyncSession, usuario_id: int):
        usuario = await db.scalar(select(Usuario).where(Usuario.usuario_id == usuario_id))

        if not usuario:
            return None

        await db.delete(usuario)
        await db.commit()
        return usuario

    @staticmethod
    async def update_usuario(db: AsyncSession, usuario_id: int, usuario_data: UsuarioUpdate):
        usuario = await UsuarioRepository.get_usuario_by_id(db, usuario_id)

        if not usuario:
            return None

        if usuario_data.nome_usuario:
            usuario.nome_usuario = usuario_data.nome_usuario
        
        if usuario_data.email_usuario:
            usuario.email_usuario = usuario_data.email_usuario

        if usuario_data.tipo_usuario is not None:
            usuario.tipo_usuario = usuario_data.tipo_usuario

        if usuario_data.setor_id is not None:
            usuario.setor_id = usuario_data.setor_id

        if usuario_data.senha_usuario:
            usuario.senha_usuario = get_password_hash(usuario_data.senha_usuario)

        await db.commit()
        await db.refresh(usuario)
        return usuario
