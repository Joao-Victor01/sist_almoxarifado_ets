#schemas\item.py
from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime


class ItemBase(BaseModel):
    nome_item: str
    descricao_item: str
    quantidade_item: int
    categoria_id: int
    data_validade_item: Optional[date] = None
    auditoria_usuario_id: Optional[int] = None
    data_validade_item: Optional[datetime] = None
    quantidade_minima_item: Optional[int] = None


class ItemCreate(BaseModel):
    #    nome_item: str = Field(..., min_length=1, max_length=100)

    nome_item: str 
    descricao_item: str 
    unidade_medida_item: str
    quantidade_item: int 
    categoria_id: int 
    data_validade_item: Optional[datetime] = None
    quantidade_minima_item: Optional[int] = None
    data_entrada_item: Optional[datetime] = None 
    auditoria_usuario_id: Optional[int] = None

class ItemUpdate(BaseModel):
    
    nome_item: Optional[str] = None
    descricao_item: Optional[str] = None
    quantidade_item: Optional[int] = None
    categoria_id: Optional[int] = None
    data_validade_item: Optional[date] = None
    data_entrada_item: Optional[datetime] = None
    data_saida_item: Optional[datetime] = None
    quantidade_minima_item: Optional[int] = None

class ItemOut(ItemBase):
    item_id: int

    class Config:
        from_attributes = True