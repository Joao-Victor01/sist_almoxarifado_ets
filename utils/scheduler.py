# utils/scheduler.py

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from services.alerta_service import AlertaService
from core.database import get_session_scheduler
from core.configs import settings 
import os
from datetime import datetime, timedelta

scheduler = AsyncIOScheduler()

async def tarefa_diaria():
    async with get_session_scheduler() as db:
        print("Verificando validade e estoque dos itens...")
        await AlertaService.generate_daily_alerts(db)

async def tarefa_limpar_relatorios():
    print("Iniciando tarefa de limpeza de relatórios antigos...")
    pasta_relatorios = settings.PASTA_RELATORIOS
    dias_retencao = settings.REPORT_RETENTION_DAYS
    
    # Calcula a data de corte: arquivos mais antigos que esta data serão deletados
    data_corte = datetime.now() - timedelta(days=dias_retencao)

    for nome_arquivo in os.listdir(pasta_relatorios):
        caminho_arquivo = os.path.join(pasta_relatorios, nome_arquivo)
        
        # Verifica se é um arquivo (e não um diretório)
        if os.path.isfile(caminho_arquivo):
            try:
                # Obtém a data da última modificação do arquivo
                timestamp_modificacao = os.path.getmtime(caminho_arquivo)
                data_modificacao = datetime.fromtimestamp(timestamp_modificacao)

                if data_modificacao < data_corte:
                    os.remove(caminho_arquivo)
                    print(f"Relatório antigo removido: {nome_arquivo}")
            except Exception as e:
                print(f"Erro ao tentar remover o arquivo {nome_arquivo}: {e}")
    print("Tarefa de limpeza de relatórios concluída.")

