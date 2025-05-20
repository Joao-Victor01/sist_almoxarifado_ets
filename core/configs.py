from sqlalchemy.ext.declarative import declarative_base
from core.config_loader import ConfigLoader
import pytz
from pathlib import Path

class Settings:
    API_STR = "/api/almoxarifado"
    
    # Banco de Dados
    DATABASE_URL = ConfigLoader.get("DATABASE_URL", required=True)
    DBBaseModel = declarative_base()

    # Autenticação
    JWT_SECRET = ConfigLoader.get("JWT_SECRET", required=True)
    ALGORITHM = ConfigLoader.get("ALGORITHM")
    ACCESS_TOKEN_EXPIRE_MINUTES = int(ConfigLoader.get("ACCESS_TOKEN_EXPIRE_MINUTES"))

    # Timezone
    BRASILIA_TIMEZONE = pytz.timezone("America/Sao_Paulo")

    # Files (caminho relativo à raiz do projeto)
    PROJECT_ROOT = Path(__file__).resolve().parent.parent  # Ajustar o .parent conforme estrutura do projeto
    PASTA_RELATORIOS = PROJECT_ROOT / "relatorios"
    PASTA_RELATORIOS.mkdir(exist_ok=True)  # Cria a pasta se não existir


settings = Settings()