#models\item.py

from sqlalchemy import Column, Integer, String, Date, ForeignKey, TIMESTAMP, DateTime
from datetime import datetime
from core.configs import settings

class Item(settings.DBBaseModel):
    __tablename__ = "item"

    item_id = Column(Integer, primary_key=True, index=True)
    nome_item = Column(String(256), nullable=False)
    descricao_item = Column(String(255), nullable=False)
    unidade_medida_item = Column(String(50), nullable=False)
    quantidade_item = Column(Integer, nullable=False)
    data_entrada_item = Column(DateTime, nullable=False, default=datetime.now)
    data_saida_item = Column(TIMESTAMP, nullable=True)
    data_validade_item = Column(Date, nullable=True)
    quantidade_minima_item = Column(Integer, nullable=True)
    categoria_id = Column(Integer, ForeignKey("categoria.categoria_id"), nullable=False)
    auditoria_usuario_id = Column(Integer, ForeignKey("usuario.usuario_id"), nullable=False) 
    marca_item = Column(String(200), nullable=True)
    nome_item_original = Column(String(256), nullable=False)





