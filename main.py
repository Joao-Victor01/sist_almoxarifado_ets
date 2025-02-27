from fastapi import FastAPI
from core.configs import settings
from api.v1.endpoints import categoria, setor, usuario, auth
import uvicorn

app = FastAPI(
    title="Sistema de Gerenciamento de Almoxarifado",
    description="API para gerenciar o estoque e retirada de materiais",
    version="1.0.0"
)

# Incluindo os endpoints
app.include_router(auth.router, prefix=f"{settings.API_STR}auth", tags=["Autenticação"])
app.include_router(categoria.router, prefix=f"{settings.API_STR}categorias", tags=["Categorias"])
app.include_router(setor.router, prefix=f"{settings.API_STR}setores", tags=["Setores"])
app.include_router(usuario.router, prefix=f"{settings.API_STR}usuarios", tags=["Usuários"])

@app.get("/")
async def root():
    return {"message": "API do Sistema de Almoxarifado rodando!"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
