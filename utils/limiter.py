# utils/limiter.py
from datetime import datetime, timedelta
from typing import Dict, Union
from fastapi import HTTPException, status
from utils.logger import logger

# Cache em memória para armazenar o último timestamp de uma requisição de criação de usuário
# Chave: ID do usuário ou IP da requisição (se não houver usuário logado)
# Valor: Objeto datetime da última requisição
last_request_timestamps: Dict[Union[int, str], datetime] = {}
COOLDOWN_PERIOD_SECONDS = 2  # 2 segundos de cooldown

def check_user_creation_cooldown(requester_id: Union[int, str]):
    """
    Verifica se o usuário (ou IP) pode realizar uma nova requisição de criação de usuário.
    Levanta HTTPException se estiver em cooldown.
    """
    now = datetime.now()
    last_request_time = last_request_timestamps.get(requester_id)

    if last_request_time and (now - last_request_time) < timedelta(seconds=COOLDOWN_PERIOD_SECONDS):
        logger.warning(f"Requisição de criação de usuário de '{requester_id}' bloqueada por cooldown.")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS, # 429 Too Many Requests
            detail=f"Por favor, aguarde {COOLDOWN_PERIOD_SECONDS} segundos antes de tentar novamente."
        )
    
    # Atualiza o timestamp da última requisição
    last_request_timestamps[requester_id] = now
    logger.debug(f"Cooldown para '{requester_id}' atualizado para {now}")

# Implementar posteriormente: Tarefa para limpar o cache de timestamps antigos se ele crescer muito
