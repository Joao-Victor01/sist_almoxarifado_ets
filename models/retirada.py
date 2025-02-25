#models\retirada.py

from sqlalchemy import Column, Integer, ForeignKey, TIMESTAMP
from core.configs import settings

class Retirada(settings.DBBaseModel):
    __tablename__ = "retirada"

    retirada_id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuario.usuario_id"), nullable=False)
    setor_id = Column(Integer, ForeignKey("setor.setor_id"), nullable=False)
    data_retirada = Column(TIMESTAMP, nullable=False)
