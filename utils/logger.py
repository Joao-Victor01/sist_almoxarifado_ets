# utils/logger.py
import logging
from logging.handlers import TimedRotatingFileHandler
from pathlib import Path
from core.configs import settings

# Diretório de logs: <projeto_root>/logs
LOG_DIR = settings.PROJECT_ROOT / "logs"
LOG_DIR.mkdir(exist_ok=True)

# Handler que gira o arquivo todo dia à meia‑noite e adiciona sufixo YYYY‑MM‑DD.txt
handler = TimedRotatingFileHandler(
    filename=LOG_DIR / "app.log",
    when="midnight",
    interval=1,
    encoding="utf-8",
    backupCount=30,             # opcional: manter 30 dias
    utc=False
)
handler.suffix = "%Y-%m-%d.txt"

# Formato de log
formatter = logging.Formatter(
    "%(asctime)s %(levelname)s [%(name)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
handler.setFormatter(formatter)

# Logger da aplicação
logger = logging.getLogger("almoxarifado")
logger.setLevel(logging.INFO)    # ou DEBUG
logger.addHandler(handler)

# propagar logs do Uvicorn/FastAPI:
for uv in ("uvicorn", "uvicorn.error", "uvicorn.access"):
    uvlog = logging.getLogger(uv)
    uvlog.handlers.clear()
    uvlog.addHandler(handler)
    uvlog.setLevel(logging.INFO)
