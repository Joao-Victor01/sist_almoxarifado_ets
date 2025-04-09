from fastapi import APIRouter, Request, Depends
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from core.database import get_session
from models.item import Item

import os

router = APIRouter()

# Templates
templates = Jinja2Templates(directory="frontend/templates")

@router.get("/", response_class=HTMLResponse)
async def home(request: Request, db: AsyncSession = Depends(get_session)):
    result = await db.execute(select(Item))
    itens = result.scalars().all()
    return templates.TemplateResponse("index.html", {"request": request, "itens": itens})

@router.get("/dashboardAlmoxarifado", response_class=HTMLResponse)
async def dashboard(request: Request):
    return templates.TemplateResponse("dashboardAlmoxarifado.html", {"request": request})
