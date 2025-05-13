# services/categoria_service.py
from schemas.categoria import CategoriaCreate, CategoriaUpdate, PaginatedCategorias, CategoriaOut
from repositories.categoria_repository import CategoriaRepository
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from utils.normalizar_texto import normalize_name
import math


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
            db: Sessão async do SQLAlchemy
            termo_busca: String com o termo a ser buscado (ex: "papel")
            
        Returns:
            Lista de objetos Categoria que correspondem à busca
        """
        termo_normalizado = normalize_name(termo_busca)
        
        # Obtém o resultado da query (ainda não consumido)
        result = await CategoriaRepository.get_categoria_by_name_like(db, termo_normalizado)
        
        # Converte para lista de objetos Categoria
        categorias = result.scalars().all()
        
        if not categorias:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Nenhuma categoria encontrada com o termo fornecido"
            )
        
        return categorias

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
    
    #função para retorno de categorias paginadas
    @staticmethod
    async def get_categorias_paginated(
        db: AsyncSession,
        page: int,
        size: int
    ) -> PaginatedCategorias:
        # validação de tamanho
        allowed = [5, 10, 25, 50, 100]
        if size not in allowed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"size deve ser um de {allowed}"
            )
        if page < 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="page deve ser >= 1"
            )

        # conta total de categorias
        total = await CategoriaRepository.count_categorias(db)
        offset = (page - 1) * size
        itens = await CategoriaRepository.get_categorias_paginated(db, offset, size)

        # converte para DTO
        items_out = [CategoriaOut.model_validate(i) for i in itens]

        # calcula total de páginas
        total_pages = math.ceil(total / size) if total > 0 else 1

        return PaginatedCategorias(
            page=page,
            size=size,
            total=total,
            total_pages=total_pages,
            items=items_out
        )
    
    @staticmethod
    async def search_categorias_paginated(
        db: AsyncSession,
        nome_categoria: str | None,
        page: int,
        size: int
    ) -> PaginatedCategorias:
        # validações (idênticas a get_categorias_paginated)
        allowed = [5, 10, 25, 50, 100]
        if size not in allowed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"size deve ser um de {allowed}"
            )
        if page < 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="page deve ser >= 1"
            )

        # normaliza e traduz nome_categoria em IDs
        nome_norm = normalize_name(nome_categoria) if nome_categoria else None
        categoria_ids = None
        if nome_categoria:
            nome_cat_norm = normalize_name(nome_categoria)
            categoria_ids = await CategoriaRepository.find_categoria_ids_by_name(db, nome_cat_norm)

        # conta total de itens filtrados
        total = await CategoriaRepository.count_filtered_categorias(
            db, categoria_ids=categoria_ids, nome_categoria_normalizado=nome_norm
        )

        # calcula offset e traz só a página
        offset = (page - 1) * size
        categorias = await CategoriaRepository.get_filtered_categorias_paginated(
            db, categoria_ids=categoria_ids,
            nome_categorias_normalizado=nome_norm,
            offset=offset, limit=size
        )

        categorias_out = [CategoriaOut.model_validate(i) for i in categorias]
        total_pages = math.ceil(total / size) if total > 0 else 1

        return PaginatedCategorias(
            page=page, size=size,
            total=total, total_pages=total_pages,
            items=categorias_out
        )
