#models\retirada.py

from sqlalchemy import Column, Integer, ForeignKey, String, DateTime, Text, Boolean
from sqlalchemy.orm import relationship
from core.configs import settings
from datetime import datetime
from enum import IntEnum

class StatusEnum(IntEnum):
    PENDENTE = 1
    AUTORIZADA = 2
    CONCLUIDA = 3
    NEGADA = 4


class Retirada(settings.DBBaseModel):
    __tablename__ = "retirada"

    retirada_id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuario.usuario_id"), nullable=False)  # Quem solicitou
    autorizado_por = Column(Integer, ForeignKey("usuario.usuario_id"), nullable=True)  # Quem autorizou
    solicitado_localmente_por = Column(String(255), nullable=True)  # Nome de quem solicitou pessoalmente
    setor_id = Column(Integer, ForeignKey("setor.setor_id"), nullable=False)
    status = Column(Integer, default=StatusEnum.PENDENTE, nullable=False)
    detalhe_status = Column(Text, nullable=True)  # Explicação do almoxarifado para autorização/negação
    justificativa = Column(Text, nullable=True)  # Justificativa do usuário
    data_solicitacao = Column(DateTime, default=datetime.now)
    is_active = Column(Boolean, default=True, nullable=False) # soft delete


    usuario = relationship("Usuario", foreign_keys=[usuario_id])
    admin = relationship("Usuario", foreign_keys=[autorizado_por])

    itens = relationship("RetiradaItem", back_populates="retirada")