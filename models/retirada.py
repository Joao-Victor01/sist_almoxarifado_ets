from sqlalchemy import Column, Integer, ForeignKey, String, DateTime, Enum, Text
from sqlalchemy.orm import relationship
from core.configs import settings
from datetime import datetime

class Retirada(settings.DBBaseModel):
    __tablename__ = "retirada"

    retirada_id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuario.usuario_id"), nullable=False)  # Quem solicitou
    autorizado_por = Column(Integer, ForeignKey("usuario.usuario_id"), nullable=True)  # Quem autorizou
    solicitado_localmente_por = Column(String(255), nullable=True)  # Nome de quem solicitou pessoalmente
    setor_id = Column(Integer, ForeignKey("setor.setor_id"), nullable=False)
    status = Column(Integer, default=1, nullable=False)
    detalhe_status = Column(Text, nullable=True)  # Explicação do almoxarifado para autorização/negação
    justificativa = Column(Text, nullable=True)  # Justificativa do usuário
    data_solicitacao = Column(DateTime, default=datetime.now)

    usuario = relationship("Usuario", foreign_keys=[usuario_id])
    admin = relationship("Usuario", foreign_keys=[autorizado_por])

    itens = relationship("RetiradaItem", back_populates="retirada")