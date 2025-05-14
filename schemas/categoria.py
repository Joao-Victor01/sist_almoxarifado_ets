# schemas/categoria.py
from pydantic import BaseModel
from typing import List, Optional

class CategoriaBase(BaseModel):
    nome_categoria: str  
    descricao_categoria: Optional[str] = None

class CategoriaCreate(CategoriaBase):
    pass

class CategoriaOut(CategoriaBase):
    categoria_id: int
    nome_original: str  # Campo para armazenar o nome original (derivado de nome_categoria)
    nome_categoria: str  # Campo normalizado

    class Config:
        from_attributes = True

class CategoriaUpdate(BaseModel):
    nome_categoria: Optional[str] = None  
    descricao_categoria: Optional[str] = None

class PaginatedCategorias(BaseModel):
    page: int
    size: int
    total: int           # total de categorias no banco
    total_pages: int     # total de páginas (ceil(total/size))
    items: List[CategoriaOut]

    model_config = {
        'from_attributes': True
    }
