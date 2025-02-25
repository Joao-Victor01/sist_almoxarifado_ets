#models\setor.py

from sqlalchemy import Column, Integer, String
from core.configs import settings

class Setor(settings.DBBaseModel):
    __tablename__ = "setor"

    setor_id = Column(Integer, primary_key=True, index=True)
    nome_setor = Column(String(100), nullable=False)
    descricao_setor = Column(String(255), nullable=True)
