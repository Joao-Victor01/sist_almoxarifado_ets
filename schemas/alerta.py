
from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional

class AlertaBase (BaseModel):
    tipo_alerta: int
    item_id: int
    data_alerta: datetime
    mensagem_alerta: str
    visualizado: bool = False
    ignorar_novos: bool = False 

class AlertaOut (AlertaBase):
    alerta_id: int

    class Config:
        from_attributes = True

# schema para paginação
class PaginatedAlertas(BaseModel):
    page: int
    size: int
    total: int # Total de alertas no banco
    total_pages: int # Total de páginas
    items: List[AlertaOut]

    model_config = {
        'from_attributes': True
    }