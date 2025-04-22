from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from core.configs import settings
from contextlib import asynccontextmanager
from sqlalchemy.ext.asyncio import async_session
from typing import AsyncGenerator


# Criar engine assíncrona
engine = create_async_engine(settings.DATABASE_URL, echo=False)

# Criar sessão assíncrona
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
    class_=AsyncSession,
    bind=engine
)

# Função para obter sessão do banco de dados para usuarios
async def get_session():
    async with SessionLocal() as session:
        yield session



# Função para obter sessão do banco de dados para o scheduler
@asynccontextmanager
async def get_session_scheduler() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        yield session
