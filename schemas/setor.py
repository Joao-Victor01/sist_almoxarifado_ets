# schemas/setor.py
from pydantic import BaseModel
from typing import Optional

class SetorBase(BaseModel):
    nome_setor: str
    descricao_setor: Optional[str] = None

class SetorCreate(SetorBase):
    pass

class SetorUpdate(SetorBase):
    pass

class SetorOut(SetorBase):
    setor_id: int

    class Config:
        from_attributes = True