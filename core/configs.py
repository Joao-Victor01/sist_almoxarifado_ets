from sqlalchemy.ext.declarative import declarative_base
from core.config_loader import ConfigLoader
import pytz
from pathlib import Path

class Settings:
    API_STR: str = "/api/almoxarifado"

    # Banco de Dados
    DATABASE_URL: str = ConfigLoader.get("DATABASE_URL", required=True)
    DBBaseModel = declarative_base()

    # Autenticação
    JWT_SECRET: str = ConfigLoader.get("JWT_SECRET", required=True)
    ALGORITHM: str = ConfigLoader.get("ALGORITHM")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(ConfigLoader.get("ACCESS_TOKEN_EXPIRE_MINUTES"))

    # Timezone
    BRASILIA_TIMEZONE = pytz.timezone("America/Sao_Paulo")

    # Files (caminho relativo à raiz do projeto)
    PROJECT_ROOT: Path = Path(__file__).resolve().parent.parent # Ajustar o parent conforme estrutura do projeto
    PASTA_RELATORIOS: Path = PROJECT_ROOT / "relatorios"
    PASTA_RELATORIOS.mkdir(exist_ok=True) # Cria a pasta se não existir.

    #configuração para retenção de relatórios (em dias)
    REPORT_RETENTION_DAYS: int = int(ConfigLoader.get("REPORT_RETENTION_DAYS", default=30))

settings = Settings()
