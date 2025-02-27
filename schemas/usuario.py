# schemas/usuario.py
from pydantic import BaseModel, EmailStr
from typing import Optional

class UsuarioBase(BaseModel):
    nome_usuario: str
    email_usuario: EmailStr
    tipo_usuario: int
    setor_id: int

class UsuarioCreate(UsuarioBase):
    nome_usuario: str
    siape_usuario: Optional[int] = None
    tipo_usuario: int
    senha_usuario: str
    email_usuario: EmailStr
    setor_id: int

class UsuarioUpdate(BaseModel):
    nome_usuario: Optional[str] = None
    email_usuario: Optional[EmailStr] = None
    tipo_usuario: Optional[int] = None
    setor_id: Optional[int] = None
    senha_usuario: Optional[int] = None

class UsuarioOut(UsuarioBase):
    usuario_id: int

    class Config:
        from_attributes = True