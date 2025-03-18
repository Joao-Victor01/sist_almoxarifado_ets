#models\retirada.py

from sqlalchemy import Column, Integer, ForeignKey, String, DateTime
from sqlalchemy.orm import relationship
from core.configs import settings
from datetime import datetime

class Retirada(settings.DBBaseModel):
    __tablename__ = "retirada"

    retirada_id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuario.usuario_id"), nullable=False)  # Quem solicitou
    autorizado_por = Column(Integer, ForeignKey("usuario.usuario_id"), nullable=False)  # Quem autorizou
    solicitado_localmente_por = Column(String(255), nullable=True)  # Nome de quem solicitou pessoalmente
    item_id = Column(Integer, ForeignKey("item.item_id"), nullable=False)
    quantidade_retirada = Column(Integer, nullable=False)
    data_retirada = Column(DateTime, default=datetime.now)
    setor_id = Column(Integer, ForeignKey("setor.setor_id"), nullable=False)


    usuario = relationship("Usuario", foreign_keys=[usuario_id])
    admin = relationship("Usuario", foreign_keys=[autorizado_por])
