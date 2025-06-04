# services/alerta_service.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta
from models.alerta import TipoAlerta
from models.item import Item
from repositories.item_repository import ItemRepository
from repositories.alerta_repository import AlertaRepository
from schemas.alerta import AlertaBase, PaginatedAlertas, AlertaOut
from utils.websocket_endpoints import manager # Importar o manager
from fastapi import HTTPException, status
import math

class AlertaService:
    @staticmethod
    async def generate_daily_alerts(db: AsyncSession):
        # Verificar validade e estoque juntos
        await AlertaService.verificar_validade_itens(db)
        await AlertaService.verificar_estoque_baixo(db)

    @staticmethod
    async def verificar_validade_itens(db: AsyncSession):
        threshold_date = datetime.now() + timedelta(days=60)
        items = await ItemRepository.get_items_expiring_before(db, threshold_date)

        for item in items:
            alerta_existe = await AlertaRepository.alerta_ja_existe(
                db, TipoAlerta.VALIDADE_PROXIMA.value, item.item_id
            )
            if not alerta_existe:
                # Criar o alerta
                novo_alerta = await AlertaRepository.create_alerta(db, AlertaBase(
                    tipo_alerta=TipoAlerta.VALIDADE_PROXIMA.value,
                    mensagem_alerta=f"Item {item.nome_item_original} próximo da validade",
                    item_id=item.item_id,
                    data_alerta=datetime.now()
                ))
                # NOVO: Transmitir o evento de novo alerta via WebSocket (para conexões gerais)
                await manager.broadcast({"type": "new_alert", "alert_id": novo_alerta.alerta_id, "message": novo_alerta.mensagem_alerta})

    @staticmethod
    async def get_alertas(db: AsyncSession):
        result = await AlertaRepository.get_alertas(db)
        if not result:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail="Não foram encontrados alertas na base de dados")
        return result

    @staticmethod
    async def verificar_estoque_baixo(db: AsyncSession, item_id: int = None):
        query = select(Item)
        if item_id:
            query = query.where(Item.item_id == item_id)
        query = query.where(Item.quantidade_item < Item.quantidade_minima_item)
        
        items = await db.execute(query)

        for item in items.scalars():
            alerta_existe = await AlertaRepository.alerta_ja_existe(
                db, TipoAlerta.ESTOQUE_BAIXO.value, item.item_id
            )
            if not alerta_existe:
                # Criar o alerta
                novo_alerta = await AlertaRepository.create_alerta(db, AlertaBase(
                    tipo_alerta=TipoAlerta.ESTOQUE_BAIXO.value,
                    mensagem_alerta=f"Estoque de {item.nome_item_original} abaixo do mínimo",
                    item_id=item.item_id,
                    data_alerta=datetime.now()
                ))
                # NOVO: Transmitir o evento de novo alerta via WebSocket (para conexões gerais)
                await manager.broadcast({"type": "new_alert", "alert_id": novo_alerta.alerta_id, "message": novo_alerta.mensagem_alerta})

    @staticmethod
    async def get_alerta_by_id(db: AsyncSession, alerta_id: int):
        result = await AlertaRepository.get_alerta_by_id(db, alerta_id)
        if not result:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alerta não encontrado")
        return result

    @staticmethod
    async def get_alertas_paginated(
        db: AsyncSession,
        page: int,
        size: int,
        tipo_alerta: int = None,
        search_term: str = None
    ) -> PaginatedAlertas:
        allowed_sizes = [5,10,25,50,100]
        if size not in allowed_sizes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"size deve ser um de {allowed_sizes}"
            )
        if page < 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="page deve ser >= 1"
            )

        total_alertas = await AlertaRepository.count_alertas(db, tipo_alerta, search_term) # Passar fil
        total_pages = math.ceil(total_alertas / size) if total_alertas > 0 else 1
        offset = (page - 1) * size
        alertas_db = await AlertaRepository.get_alertas_paginated(db, offset, size, tipo_alerta, search_term)
        items_out = [AlertaOut.model_validate(alerta) for alerta in alertas_db]

        return PaginatedAlertas(
            page=page,
            size=size,
            total=total_alertas,
            total_pages=total_pages,
            items=items_out
        )

    @staticmethod
    async def mark_alerta_as_ignorar_novos(db: AsyncSession, alerta_id: int):
        alerta = await AlertaRepository.ignorar_alerta(db, alerta_id)
        if not alerta:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alerta não encontrado.")
        return alerta

    @staticmethod
    async def get_unviewed_alerts_count(db: AsyncSession) -> int:
        return await AlertaRepository.count_unviewed_alerts(db)

    @staticmethod
    async def mark_all_alerts_as_viewed(db: AsyncSession):
        await AlertaRepository.mark_all_alerts_as_viewed(db)

    @staticmethod
    async def delete_alerta(db: AsyncSession, alerta_id: int):
        alerta = await AlertaRepository.get_alerta_by_id(db, alerta_id)
        if not alerta:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alerta não encontrado.")
        await AlertaRepository.delete_alerta(db, alerta_id)
        return {"message": "Alerta deletado com sucesso"}
