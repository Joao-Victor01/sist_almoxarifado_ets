#schemas\retirada.py

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
    itens: List[ItemRetirada]  # Lista de itens da retirada


class RetiradaUpdateStatus(BaseModel):
    status: StatusEnum
    detalhe_status: Optional[str] = None  # Explicação da autorização/negação

class RetiradaItemOut(BaseModel):
    item_id: int
    quantidade_retirada: int
    item: ItemOut

    class Config:
        orm_mode = True

class RetiradaOut(BaseModel):
    retirada_id: int
    usuario_id: int
    autorizado_por: Optional[int] = None
    setor_id: int
    status: StatusEnum
    detalhe_status: Optional[str] = None
    justificativa: Optional[str] = None
    solicitado_localmente_por: Optional[str] = None
    data_solicitacao: datetime
    itens: List[RetiradaItemOut]

    class Config:
        orm_mode = True
