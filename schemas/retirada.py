# schemas/retirada.py
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from models.retirada import StatusEnum
from schemas.item import ItemOut

class ItemRetirada(BaseModel):
    item_id: int
    quantidade_retirada: int

class RetiradaBase(BaseModel):
    setor_id: int
    justificativa: Optional[str] = None
    solicitado_localmente_por: Optional[str] = None

class RetiradaCreate(RetiradaBase):
    itens: List[ItemRetirada]
    is_local_withdrawal: Optional[bool] = False # indica se é uma retirada local
    linked_usuario_id: Optional[int] = None # ID do usuário vinculado (se for retirada local)

class RetiradaUpdateStatus(BaseModel):
    status: StatusEnum
    detalhe_status: Optional[str] = None

class RetiradaItemOut(BaseModel):
    item_id: int
    quantidade_retirada: int
    item: ItemOut

    model_config = {"from_attributes": True}

class RetiradaOut(BaseModel):
    retirada_id: int
    usuario_id: int
    autorizado_por: Optional[int]
    setor_id: int
    status: StatusEnum
    detalhe_status: Optional[str]
    justificativa: Optional[str]
    solicitado_localmente_por: Optional[str]
    data_solicitacao: datetime
    itens: List[RetiradaItemOut]

    model_config = {"from_attributes": True}

class RetiradaPaginated(BaseModel):
    total: int
    page: int
    pages: int
    items: List[RetiradaOut]

    model_config = {"from_attributes": True}

class RetiradaFilterParams(BaseModel):
    status: Optional[int] = None
    solicitante: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None