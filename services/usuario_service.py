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
    async def create_first_user(db:AsyncSession, user_data: UsuarioCreate):

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

        user_root = await UsuarioService.create_usuario(db,user_data)
        
        return user_root

    
    @staticmethod
    async def create_usuario(db: AsyncSession, user_data: UsuarioCreate):
        """
        Cria um novo usuário após validar os dados.
        
        Args:
            db: Sessão do banco de dados
            user_data: Dados do usuário a ser criado
            
        Returns:
            Usuario: O usuário criado
            
        Raises:
            HTTPException: Se os dados forem inválidos ou o usuário já existir
        """
        await UsuarioService._verify_user_data(db, user_data)
        new_user = await UsuarioRepository.create_usuario(db, user_data)
        return new_user

    @staticmethod
    async def get_usuarios(db: AsyncSession):
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
        """
        Remove um usuário
        
        Args:
            usuario_id: ID do usuário a ser removido
            current_user: Usuário autenticado
            
        Raises:
            HTTPException: Se o usuário não existir ou não tiver permissão
        """
        usuario = await UsuarioRepository.get_usuario_by_id(db, usuario_id)
        
        if not usuario:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuário não encontrado"
            )

        # Permite que admins ou o próprio usuário possa deletar
        if current_user.usuario_id != usuario_id and current_user.tipo_usuario != 1:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Sem permissão para esta operação"
            )
            
        await UsuarioRepository.delete_usuario(db, usuario_id)

    @staticmethod
    async def update_usuario(
        db: AsyncSession,
        usuario_id: int,
        usuario_data: UsuarioUpdate,
        current_user: Usuario
    ):
        """
        Atualiza os dados de um usuário
        
        Args:
            usuario_id: ID do usuário a ser atualizado
            usuario_data: Novos dados do usuário
            current_user: Usuário autenticado
            
        Returns:
            Usuario: O usuário atualizado
            
        Raises:
            HTTPException: Em caso de erros de validação ou permissão
        """
        usuario = await UsuarioRepository.get_usuario_by_id(db, usuario_id)
        
        if not usuario:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuário não encontrado"
            )

        # Verifica permissão
        if current_user.usuario_id != usuario_id and current_user.tipo_usuario != 1:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Sem permissão para esta operação"
            )

        # Valida dados únicos (ignorando o próprio usuário)
        await UsuarioService._verify_user_data(db, usuario_data, usuario_id)

        # Atualiza campos
        if usuario_data.nome_usuario:
            usuario.nome_usuario = usuario_data.nome_usuario
            
        if usuario_data.email_usuario:
            usuario.email_usuario = usuario_data.email_usuario.lower()
            
        if usuario_data.username:
            usuario.username = usuario_data.username.lower()
            
        if usuario_data.tipo_usuario is not None:
            usuario.tipo_usuario = usuario_data.tipo_usuario
            
        if usuario_data.setor_id is not None:
            setor = await db.get(Setor, usuario_data.setor_id)
            if not setor:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Setor não encontrado"
                )
            usuario.setor_id = usuario_data.setor_id
            
        if usuario_data.senha_usuario:
            usuario.senha_usuario = get_password_hash(usuario_data.senha_usuario)

        await db.commit()
        await db.refresh(usuario)
        return usuario

    @staticmethod
    async def login_user(
        form_data: OAuth2PasswordRequestForm = Depends(),
        db: AsyncSession = Depends(get_session)
    ):
        """
        Realiza o login do usuário e retorna um token JWT
        
        Returns:
            dict: {access_token, token_type}
            
        Raises:
            HTTPException: Se as credenciais forem inválidas
        """
        user = await db.scalar(
            select(Usuario).where(Usuario.username == form_data.username)
        )
        
        if not user or not verify_password(form_data.password, user.senha_usuario):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Credenciais inválidas"
            )
        
        # Correção: Passando o tipo_usuario para o token
        access_token = create_access_token(
            data_payload={"sub": user.username},
            tipo_usuario=user.tipo_usuario  # Adicionando o tipo do usuário
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "tipo_usuario": user.tipo_usuario  # Opcional: retornar no response
        }

    @staticmethod
    async def _verify_user_data(
        db: AsyncSession,
        user_data: UsuarioCreate | UsuarioUpdate,
        exclude_usuario_id: int = None
    ):
        """
        Valida os dados do usuário (username, email e siape)
        
        Args:
            exclude_usuario_id: ID do usuário a ser ignorado (para updates)
            
        Raises:
            HTTPException: Se algum dado estiver inválido
        """
        filters = []
        if exclude_usuario_id is not None:
            filters.append(Usuario.usuario_id != exclude_usuario_id)

        # Verifica username
        existing_user = await db.scalar(
            select(Usuario)
            .where(Usuario.username == user_data.username, *filters)
        )
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username já está em uso"
            )

        # Verifica email
        existing_email = await db.scalar(
            select(Usuario)
            .where(Usuario.email_usuario == user_data.email_usuario, *filters)
        )
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email já está em uso"
            )

        # Verifica siape
        existing_siape = await db.scalar(
            select(Usuario)
            .where(Usuario.siape_usuario == user_data.siape_usuario, *filters)
        )
        if existing_siape:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="SIAPE já cadastrado"
            )
        
        if int(user_data.tipo_usuario) <1 or int(user_data.tipo_usuario) > 3:
            raise HTTPException(
                                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tipo de usuário não permitido"
            )

        # Verifica setor (apenas para criação)
        if isinstance(user_data, UsuarioCreate):
            if not await db.get(Setor, user_data.setor_id):
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Setor não encontrado"
                )