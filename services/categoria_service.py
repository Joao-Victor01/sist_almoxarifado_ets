# services/categoria_service.py
from schemas.categoria import CategoriaCreate, CategoriaUpdate
from repositories.categoria_repository import CategoriaRepository
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from utils.normalizar_texto import normalize_name


class CategoriaService:
    @staticmethod
    async def create_categoria(db: AsyncSession, categoria_data: CategoriaCreate):
        categoria_normalized = normalize_name(categoria_data.nome_categoria)
        categoria_data.nome_categoria = categoria_normalized
        categoria = await CategoriaRepository.create_categoria(db, categoria_data)
        return categoria

    @staticmethod
    async def get_categorias(db: AsyncSession):
        categorias = await CategoriaRepository.get_categorias(db)
        return categorias

    @staticmethod
    async def get_categoria_by_id(db: AsyncSession, categoria_id: int):
        categoria = await CategoriaRepository.get_categoria_by_id(db, categoria_id)
        if not categoria:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Categoria não encontrada")
        return categoria
    
    @staticmethod
    async def get_categoria_by_name(db: AsyncSession, categotia_name: str):
        normalized_name = normalize_name(categotia_name)
        categoria = await CategoriaRepository.get_categoria_by_name(db, normalized_name)
        print(normalized_name)
        if not categoria:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Categoria não encontrada")
        return categoria
    
    @staticmethod
    async def get_categorias_like(db: AsyncSession, termo_busca: str):
        """
        Busca categorias cujos nomes contenham o termo de busca (case-insensitive)
        
        Args:
            session: Sessão async do SQLAlchemy
            termo_busca: String com o termo a ser buscado (ex: "papel")
            
        Returns:
            Lista de objetos Categoria que correspondem à busca
        """
        # Remove espaços extras e normaliza o termo de busca
        termo_normalizado = normalize_name(termo_busca)
        
        # Executa a query com busca parcial case-insensitive
        result = await CategoriaRepository.get_categoria_by_name_like(db, termo_normalizado)

        if not result.scalars().all:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Categoria não encontrada"
            )
        
        return result.scalars().all()

    @staticmethod
    async def update_categoria(db: AsyncSession, categoria_id: int, categoria_data: CategoriaUpdate):
        categoria_normalized = normalize_name(categoria_data.nome_categoria)
        categoria_data.nome_categoria = categoria_normalized
        updated_categoria = await CategoriaRepository.update_categoria(db, categoria_id, categoria_data)
        if not updated_categoria:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Categoria não encontrada")
        return updated_categoria

    @staticmethod
    async def delete_categoria(db: AsyncSession, categoria_id: int):
        result = await CategoriaRepository.delete_categoria(db, categoria_id)
        if not result:
            raise HTTPException(status_code=404, detail="Categoria não encontrada")
        return result
