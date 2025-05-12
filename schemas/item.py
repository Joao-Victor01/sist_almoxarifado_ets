#schemas\item.py
from pydantic import BaseModel
from datetime import date, datetime
from typing import List, Optional


class ItemBase(BaseModel):
    nome_item: str
    descricao_item: str
    quantidade_item: int
    categoria_id: int
    data_validade_item: Optional[date] = None
    auditoria_usuario_id: Optional[int] = None
    data_validade_item: Optional[datetime] = None
    quantidade_minima_item: Optional[int] = None
    marca_item: Optional[str] = None



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
    marca_item: Optional[str] = None

class ItemUpdate(BaseModel):
    
    nome_item: Optional[str] = None
    descricao_item: Optional[str] = None
    quantidade_item: Optional[int] = None
    categoria_id: Optional[int] = None
    data_validade_item: Optional[date] = None
    data_entrada_item: Optional[datetime] = None
    data_saida_item: Optional[datetime] = None
    quantidade_minima_item: Optional[int] = None
    marca_item: Optional[str] = None


class ItemOut(ItemBase):
    item_id: int
    nome_item: str
    descricao_item: str
    quantidade_item: int
    categoria_id: int
    data_validade_item: Optional[date] = None
    auditoria_usuario_id: Optional[int] = None
    data_validade_item: Optional[datetime] = None
    quantidade_minima_item: Optional[int] = None
    marca_item: Optional[str] = None
    unidade_medida_item: str
    data_entrada_item: Optional[datetime] = None



    class Config:
        from_attributes = True

class PaginatedItems(BaseModel):
    page: int
    size: int
    total: int           # total de itens no banco
    total_pages: int     # total de páginas (ceil(total/size))
    items: List[ItemOut]

    model_config = {
        'from_attributes': True
    }