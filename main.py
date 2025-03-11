#main.py
from fastapi import FastAPI
from core.configs import settings
from api.v1.endpoints import categoria, setor, usuario, auth
from api.v1.endpoints.categoria import router as categoria_router
from api.v1.endpoints.setor import router as setor_router
from api.v1.endpoints.usuario import router as usuario_router
from api.v1.endpoints.auth import router as auth_router
import uvicorn

app = FastAPI(
    title="Sistema de Gerenciamento de Almoxarifado",
    description="API para gerenciar o estoque e retirada de materiais",
    version="1.0.0"
)

# Incluindo os endpoints
app.include_router(setor_router, prefix=settings.API_STR, tags=['Gerenciamento de Setores'])
app.include_router(categoria_router, prefix=settings.API_STR, tags=['Gerenciamento de Categorias'])
app.include_router(usuario_router, prefix=settings.API_STR, tags=['Gerenciamento de Usuários'])
app.include_router(auth_router, prefix=settings.API_STR, tags=['Autenticação de Usuários'])


@app.get("/")
async def root():
    return {"message": "API do Sistema de Almoxarifado rodando!"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=True)
