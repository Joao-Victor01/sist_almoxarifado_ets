# schemas/categoria.py
from pydantic import BaseModel
from typing import Optional

class CategoriaBase(BaseModel):
    nome_categoria: str
    descricao_categoria: Optional[str] = None

class CategoriaCreate(CategoriaBase):
    pass

class CategoriaUpdate(CategoriaBase):
    pass

class CategoriaOut(CategoriaBase):
    categoria_id: int

    class Config:
        from_attributes = True
