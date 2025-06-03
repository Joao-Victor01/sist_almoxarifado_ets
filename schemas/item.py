# schemas/item.py

from pydantic import BaseModel, Field
from datetime import date, datetime
from typing import List, Optional

class ItemBase(BaseModel):
    nome_item: str
    descricao_item: str
    quantidade_item: int
    categoria_id: int
    data_validade_item: Optional[date] = None
    quantidade_minima_item: Optional[int] = None
    marca_item: Optional[str] = None

class ItemCreate(BaseModel):
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
    unidade_medida_item: Optional[str] = None
    ativo: Optional[bool] = None #  para permitir atualização do status ativo/inativo

class ItemOut(ItemBase):
    item_id: int
    nome_item: str # Nome normalizado Apenas para lógica interna
    descricao_item: str
    quantidade_item: int
    categoria_id: int
    data_validade_item: Optional[date] = None
    auditoria_usuario_id: int
    quantidade_minima_item: Optional[int] = None
    marca_item: Optional[str] = None
    unidade_medida_item: str
    data_entrada_item: Optional[datetime] = None
    nome_item_original: str # nome original conforme enviado pelo usuário Exibição no front
    ativo: bool #  para soft delete

    class Config:
        from_attributes = True

class PaginatedItems(BaseModel):
    page: int
    size: int
    total: int # total de itens no banco
    total_pages: int # total de páginas (ceil(total/size))
    items: List[ItemOut]

    model_config = {
        'from_attributes': True
    }

# Schema para o resultado do upload em massa
class BulkItemUploadResult(BaseModel):
    total_items_processed: int
    items_created: int
    items_updated: int
    errors: List[dict] = [] # Lista de dicionários com {"row": <número da linha>, "error": <mensagem de erro>}

    model_config = {
        'from_attributes': True
    }
