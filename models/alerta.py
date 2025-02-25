from sqlalchemy import Column, Integer, ForeignKey, TIMESTAMP
from core.configs import settings

class Alerta(settings.DBBaseModel):
    __tablename__ = "alerta"

    alerta_id = Column(Integer, primary_key=True, index=True)
    tipo_alerta = Column(Integer, nullable=False)
    item_id = Column(Integer, ForeignKey("item.item_id"), nullable=False)
    data_alerta = Column(TIMESTAMP, nullable=False)
