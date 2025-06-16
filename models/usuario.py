#models\usuario.py

from sqlalchemy import Column, Integer, String, ForeignKey, Boolean
from core.configs import settings
from enum import IntEnum

class RoleEnum(IntEnum):
    USUARIO_GERAL = 1
    USUARIO_ALMOXARIFADO = 2
    USUARIO_DIRECAO = 3


class Usuario(settings.DBBaseModel):
    __tablename__ = "usuario"

    usuario_id = Column(Integer, primary_key=True, index=True)
    siape_usuario = Column(Integer, unique=True, nullable=True)
    nome_usuario = Column(String(100), nullable=False)
    tipo_usuario = Column(Integer, nullable=False)
    email_usuario = Column(String(100), unique=True, nullable=False)
    senha_usuario = Column(String(256), nullable=False)
    setor_id = Column(Integer, ForeignKey("setor.setor_id"), nullable=False)
    username = Column(String(100), nullable=False)
    is_active     = Column(Boolean, nullable=False, default=True)  

