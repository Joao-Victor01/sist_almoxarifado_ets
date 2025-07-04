#models\retirada_item.py

from sqlalchemy import Column, Integer, ForeignKey
from sqlalchemy.orm import relationship
from core.configs import settings

class RetiradaItem(settings.DBBaseModel):
    __tablename__ = "retirada_item"

    retirada_id = Column(Integer, ForeignKey("retirada.retirada_id"), primary_key=True)
    item_id = Column(Integer, ForeignKey("item.item_id"), primary_key=True)
    quantidade_retirada = Column(Integer, nullable=False)

    retirada = relationship("Retirada", back_populates="itens")
    item = relationship("Item")
