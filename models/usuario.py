from sqlalchemy import Column, Integer, String, ForeignKey
from core.configs import settings

class Usuario(settings.DBBaseModel):
    __tablename__ = "usuario"

    usuario_id = Column(Integer, primary_key=True, index=True)
    siape_usuario = Column(Integer, unique=True, nullable=True)
    nome_usuario = Column(String(100), nullable=False)
    tipo_usuario = Column(Integer, nullable=False)
    email_usuario = Column(String(100), unique=True, nullable=False)
    senha_usuario = Column(String(64), nullable=False)
    setor_id = Column(Integer, ForeignKey("setor.setor_id"), nullable=False)
