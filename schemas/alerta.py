#schemas\alerta.py
from pydantic import BaseModel
from datetime import datetime


class AlertaBase(BaseModel):
    tipo_alerta: int
    item_id: int
    data_alerta: datetime

class AlertaOut(AlertaBase):
    alerta_id: int

    class Config:
        from_attributes = True