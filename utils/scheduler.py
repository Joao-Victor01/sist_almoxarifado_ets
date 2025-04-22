from apscheduler.schedulers.asyncio import AsyncIOScheduler
from services.alerta_service import AlertaService
from core.database import get_session_scheduler

scheduler = AsyncIOScheduler()

async def tarefa_diaria():
    async with get_session_scheduler() as db:
        print("Verificando validade e estoque dos itens...")
        await AlertaService.generate_daily_alerts(db)

scheduler.add_job(tarefa_diaria, "cron", hour=6)
