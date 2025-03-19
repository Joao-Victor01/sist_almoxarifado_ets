#models\alerta.py

from sqlalchemy import Column, Integer, ForeignKey, TIMESTAMP
from core.configs import settings
from datetime import datetime
from enum import Enum

class TipoAlerta(Enum):
    ESTOQUE_BAIXO = 1
    VALIDADE_PROXIMA = 2

class Alerta(settings.DBBaseModel):
    __tablename__ = "alerta"

    alerta_id = Column(Integer, primary_key=True, index=True)
    tipo_alerta = Column(Integer, nullable=False)
    item_id = Column(Integer, ForeignKey("item.item_id"), nullable=False)
    data_alerta = Column(TIMESTAMP, nullable=False, default=datetime.now)