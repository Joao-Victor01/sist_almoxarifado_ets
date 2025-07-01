#frontend\routes\home.py

from fastapi import APIRouter, Request, Cookie
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from jwt import decode, PyJWTError
from core.configs import settings
from .deps import require_user_type, get_current_user_type


router = APIRouter()
templates = Jinja2Templates(directory="frontend/templates")

@router.get("/", response_class=HTMLResponse)
async def home(request: Request, access_token: str | None = Cookie(None)):

    if access_token:
        try:
            payload = decode(
                access_token,
                settings.JWT_SECRET,
                algorithms=[settings.ALGORITHM]
            )
            tipo = payload.get("tipo_usuario")
            if tipo == 1:
                return RedirectResponse("/dashboardServidor", status_code=303)
            elif tipo == 2:
                return RedirectResponse("/dashboardAlmoxarifado", status_code=303)
            elif tipo == 3:
                return RedirectResponse("/dashboardDirecao", status_code=303)
        except PyJWTError:
            pass  # Cookie inválido ou expirado

    return templates.TemplateResponse("index.html", {"request": request})

# Dashboard Almoxarifado — apenas tipo 2
@router.get(
    "/dashboardAlmoxarifado",
    response_class=HTMLResponse,
    dependencies=[require_user_type(2)],
)
async def dashboard_almoxarifado(request: Request):
    return templates.TemplateResponse("dashboardAlmoxarifado.html", {"request": request})

# Dashboard Servidor — apenas tipo 1
@router.get(
    "/dashboardServidor",
    response_class=HTMLResponse,
    dependencies=[require_user_type(1)],
)
async def dashboard_servidor(request: Request):
    return templates.TemplateResponse("dashboardServidor.html", {"request": request})

# Dashboard Direção — apenas tipo 3
@router.get(
    "/dashboardDirecao",
    response_class=HTMLResponse,
    dependencies=[require_user_type(3)],
)
async def dashboard_direcao(request: Request):
    return templates.TemplateResponse("dashboardDirecao.html", {"request": request})