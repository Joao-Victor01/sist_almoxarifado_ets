from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


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
    status: int
    detalhe_status: Optional[str] = None  # Explicação da autorização/negação

class RetiradaOut(RetiradaBase):
    retirada_id: int
    usuario_id: int
    autorizado_por: Optional[int] = None
    status: int
    detalhe_status: Optional[str] = None
    data_solicitacao: datetime

    class Config:
        from_attributes = True
