#services/usuario_service.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from models.usuario import Usuario
from models.setor import Setor
from schemas.usuario import UsuarioCreate, UsuarioUpdate
from repositories.usuario_repository import UsuarioRepository
from fastapi import HTTPException, status, Depends
from core.security import get_password_hash, verify_password, create_access_token
from fastapi.security import OAuth2PasswordRequestForm
from core.database import get_session
from models.usuario import RoleEnum
from services.setor_service import SetorService

class UsuarioService:

    @staticmethod
    async def create_first_user(db: AsyncSession, user_data: UsuarioCreate):
        # Verifica se já existe algum usuário no sistema
        existing_user = await db.execute(select(Usuario))
        if existing_user.scalars().first() is not None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="O sistema já possui usuários cadastrados"
            )

        setor_root = await SetorService.create_root_setor(db)
        setor_root_result = await db.execute(select(Setor).where(Setor.setor_id == setor_root.setor_id))
        setor_root_data = setor_root_result.scalars().first()

        user_data.tipo_usuario = RoleEnum.USUARIO_DIRECAO.value
        user_data.setor_id = setor_root_data.setor_id

        user_root = await UsuarioService.create_usuario(db, user_data)
        return user_root

    @staticmethod
    async def create_usuario (db: AsyncSession, user_data: UsuarioCreate):
        """Cria um novo usuário após validar os dados."""
        await UsuarioService._validate_user_data(db, user_data)
        return await UsuarioRepository.create_usuario(db, user_data)

    @staticmethod
    async def get_usuarios (db: AsyncSession):
        """Retorna todos os usuários cadastrados"""
        return await UsuarioRepository.get_usuarios(db)

    @staticmethod
    async def get_usuario_by_id(db: AsyncSession, usuario_id: int):
        """Obtém um usuário pelo ID"""
        usuario = await UsuarioRepository.get_usuario_by_id(db, usuario_id)
        if not usuario:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuário não encontrado"
            )
        return usuario

    @staticmethod
    async def delete_usuario(db: AsyncSession, usuario_id: int, current_user: Usuario):
        usuario = await UsuarioRepository.get_usuario_by_id(db, usuario_id)
        if not usuario:
            raise HTTPException(
                detail="Usuário não encontrado",
                status_code=status.HTTP_404_NOT_FOUND,
            )
        # Lógica de permissão permanece aqui, no serviço
        if current_user.tipo_usuario != RoleEnum.USUARIO_DIRECAO.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Sem permissão para esta operação"
            )
        
        return await UsuarioRepository.delete_usuario(db, usuario_id) 

    @staticmethod
    async def update_usuario(
        db: AsyncSession,
        usuario_id: int,
        usuario_data: UsuarioUpdate,
        current_user: Usuario
    ):
        """Atualiza os dados de um usuário"""
        usuario = await UsuarioRepository.get_usuario_by_id(db, usuario_id)
        if not usuario:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")

        UsuarioService._validate_permission(usuario_id, current_user)
        await UsuarioService._validate_user_data(db, usuario_data, usuario_id)

        campos_atualizados = UsuarioService._prepare_update_fields(db, usuario, usuario_data)

        if campos_atualizados:
            await db.commit()
            await db.refresh(usuario)
        return usuario

    @staticmethod
    async def login_user(
        form_data: OAuth2PasswordRequestForm = Depends(),
        db: AsyncSession = Depends(get_session)
    ):
        """Realiza o login do usuário e retorna um token JWT"""
        user = await db.scalar(
            select(Usuario).where(Usuario.username == form_data.username)
        )
        if not user or not verify_password(form_data.password, user.senha_usuario):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Credenciais inválidas"
            )
        
        access_token = create_access_token(
            data_payload={"sub": user.username},
            tipo_usuario=user.tipo_usuario,
            usuario_id=user.usuario_id 
        )
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "tipo_usuario": user.tipo_usuario, 
            "usuario_id": user.usuario_id 
        }
    
     # MÉTODO PARA REDEFINIÇÃO DE SENHA SIMPLES
    @staticmethod
    async def reset_password_simple(db: AsyncSession, username_or_email: str, new_password: str):
        """
        Busca um usuário por username ou email e redefine sua senha.
        LEMBRETE: Esta lógica é insegura para produção.
        """
        # Tenta encontrar por username
        user = await db.scalar(
            select(Usuario).where(Usuario.username == username_or_email)
        )
        
        # Se não encontrou por username, tenta por email
        if not user:
            user = await db.scalar(
                select(Usuario).where(Usuario.email_usuario == username_or_email.lower())
            )
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuário não encontrado."
            )
        
        # Atualiza a senha
        user.senha_usuario = get_password_hash(new_password)
        await db.commit()
        await db.refresh(user)
        
        return user
    

    #----------- MÉTODOS AUXILIXARES ABAIXO ---------------------------

    @staticmethod
    async def _validate_user_data(
        db: AsyncSession,
        user_data: UsuarioCreate | UsuarioUpdate,
        exclude_usuario_id: int | None = None
    ):
        """Valida os dados do usuário (username, email, siape e tipo_usuario)"""
        await UsuarioService._validate_unique_fields(db, user_data, exclude_usuario_id)
        UsuarioService._validate_tipo_usuario(user_data.tipo_usuario)
        if isinstance(user_data, UsuarioCreate):
            await UsuarioService._validate_setor(db, user_data.setor_id)

    @staticmethod
    async def _validate_unique_fields(db: AsyncSession, usuario_data: UsuarioUpdate, exclude_usuario_id: int | None):
        """Valida se email, username e siape já estão em uso."""
        campos = {
            "username": usuario_data.username,
            "email_usuario": usuario_data.email_usuario,
            "siape_usuario": usuario_data.siape_usuario
        }
        for campo, valor in campos.items():
            if valor is not None and valor != '': 
                query = await db.scalar(
                    select(Usuario).where(
                        getattr(Usuario, campo) == valor, 
                        Usuario.usuario_id != exclude_usuario_id
                    )
                )
                if query:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"{campo.title()} já está em uso.")

    @staticmethod
    def _validate_tipo_usuario(tipo_usuario: int):
        """Valida se o tipo de usuário está dentro dos valores permitidos."""
        if tipo_usuario not in [1, 2, 3]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tipo de usuário não permitido"
            )

    @staticmethod
    async def _validate_setor (db: AsyncSession, setor_id: int):
        """ Verifica se o setor informado existe no banco de dados."""
        if not await db.get(Setor, setor_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Setor não encontrado"
            )

    @staticmethod
    def _validate_permission (usuario_id: int, current_user: Usuario):
        """ Verifica se o usuário tem permissão para atualizar os dados. """
        # Direção (tipo 3) pode editar qualquer usuário.
        # Outros usuários só podem editar a si mesmos

        if current_user.tipo_usuario != RoleEnum.USUARIO_DIRECAO.value and usuario_id != current_user.usuario_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Sem permissão para esta operação"
            )

    @staticmethod
    def _prepare_update_fields (db: AsyncSession, usuario: Usuario, usuario_data: UsuarioUpdate):
        """Atualiza apenas os campos modificados."""
        campos_atualizados = False

        if usuario_data.nome_usuario is not None:
            usuario.nome_usuario = usuario_data.nome_usuario
            campos_atualizados = True

        if usuario_data.email_usuario is not None:
            usuario.email_usuario = usuario_data.email_usuario.lower()
            campos_atualizados = True
        
        if usuario_data.username is not None:
            usuario.username = usuario_data.username
            campos_atualizados = True

        if usuario_data.tipo_usuario is not None:
            usuario.tipo_usuario = usuario_data.tipo_usuario
            campos_atualizados = True

        if usuario_data.setor_id is not None:
            usuario.setor_id = usuario_data.setor_id
            campos_atualizados = True
        
        if usuario_data.siape_usuario is not None:
            usuario.siape_usuario = usuario_data.siape_usuario
            campos_atualizados = True
        elif hasattr(usuario_data, 'siape_usuario') and usuario_data.siape_usuario is None:
            usuario.siape_usuario = None
            campos_atualizados = True

        if usuario_data.senha_usuario:
            usuario.senha_usuario = get_password_hash(usuario_data.senha_usuario)
            campos_atualizados = True

        return campos_atualizados

