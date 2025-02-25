#core\configs.py

from sqlalchemy.ext.declarative import declarative_base
from core.config_loader import ConfigLoader
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import pytz

class Settings:
    API_STR = "/api/almoxarifado/"

    # Banco de Dados
    DATABASE_URL = ConfigLoader.get("DATABASE_URL", required=True)
    engine = create_engine(DATABASE_URL) 
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    DBBaseModel = declarative_base()

    # Autenticação
    JWT_SECRET = ConfigLoader.get("JWT_SECRET", required=True)
    ALGORITHM = ConfigLoader.get("ALGORITHM")
    ACCESS_TOKEN_EXPIRE_MINUTES = int(ConfigLoader.get("ACCESS_TOKEN_EXPIRE_MINUTES"))

    # Timezone
    BRASILIA_TIMEZONE = pytz.timezone("America/Sao_Paulo")

settings = Settings()

# Configuração do Banco de Dados
engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
