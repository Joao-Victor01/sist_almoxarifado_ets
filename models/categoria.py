#models\categoria.py

from sqlalchemy import Column, Integer, String
from core.configs import settings

class Categoria(settings.DBBaseModel):
    __tablename__ = "categoria"

    categoria_id = Column(Integer, primary_key=True, index=True)
    nome_categoria = Column(String(50), nullable=False)  # Nome normalizado
    descricao_categoria = Column(String(255), nullable=True)
    nome_original = Column(String(100), nullable=False)  # Original do usuário