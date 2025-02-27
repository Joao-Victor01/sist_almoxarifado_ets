from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from core.configs import settings

# Criar engine assíncrona
engine = create_async_engine(settings.DATABASE_URL, echo=True)

# Criar sessão assíncrona
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
    class_=AsyncSession,
    bind=engine
)

# Função para obter sessão do banco de dados
async def get_session():
    async with SessionLocal() as session:
        yield session
