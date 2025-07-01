#schemas/usuario.py
from pydantic import BaseModel, EmailStr
from typing import Optional

class UsuarioBase (BaseModel):
    nome_usuario: str
    email_usuario: EmailStr
    tipo_usuario: int
    setor_id: int
    username: str
    siape_usuario: Optional[str] = None 

class UsuarioCreate (UsuarioBase):
    nome_usuario: str
    siape_usuario: Optional [str] = None
    tipo_usuario: int
    senha_usuario: str
    email_usuario: EmailStr
    setor_id: int
    username: str

class UsuarioUpdate (BaseModel):
    nome_usuario: Optional [str] = None
    siape_usuario: Optional[str] = None 
    tipo_usuario: Optional [int] = None
    senha_usuario: Optional [str] = None
    email_usuario: Optional [EmailStr] = None
    setor_id: Optional [int] = None
    username: Optional [str] = None

class UsuarioOut (UsuarioBase):
    usuario_id: int

    class Config:
        from_attributes = True

# SCHEMA PARA REDEFINIÇÃO DE SENHA SIMPLES
class UsuarioResetPasswordSimple(BaseModel):
    username_or_email: str
    new_password: str

# SCHEMA PARA CHECAGEM DE USUÁRIO PARA REDEFINIÇÃO DE SENHA
class UsuarioCheckForReset(BaseModel):
    username_or_email: str
