#schemas\item.py
from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime


class ItemBase(BaseModel):
    nome_item: str
    descricao_item: str
    quantidade_item: int
    categoria_id: int
    data_validade_item: date

class ItemCreate(BaseModel):
    nome_item: str = Field(..., min_length=1, max_length=100)
    descricao_item: str = Field(..., min_length=1, max_length=500)
    unidade_medida_item: str = Field(..., min_length=1, max_length=50)
    quantidade_item: int = Field(..., gt=0)  # Quantidade deve ser maior que 0
    categoria_id: int = Field(..., gt=0)  # ID da categoria deve ser maior que 0
    data_validade_item: Optional[datetime] = None
    quantidade_minima_item: Optional[int] = Field(None, gt=0)
    data_entrada_item: Optional[datetime] = None  # Será preenchido automaticamente

class ItemUpdate(BaseModel):
    
    nome_item: Optional[str] = None
    descricao_item: Optional[str] = None
    quantidade_item: Optional[int] = None
    categoria_id: Optional[int] = None
    data_validade_item: Optional[date] = None
    data_entrada_item: Optional[datetime] = None
    data_saida_item: Optional[datetime] = None
    quantidade_minima_item: Optional[datetime] = None

class ItemOut(ItemBase):
    item_id: int

    class Config:
        from_attributes = True