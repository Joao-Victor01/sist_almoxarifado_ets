# repositories/alerta_repository.py

from sqlalchemy import func, or_, and_ , update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from models.alerta import Alerta
from schemas.alerta import AlertaBase
from fastapi import HTTPException, status
from datetime import datetime

class AlertaRepository:

    @staticmethod
    async def alerta_ja_existe (db, tipo_alerta: int, item_id: int) -> bool:
        result = await db.execute(
            select(Alerta).where(
                Alerta.tipo_alerta == tipo_alerta,
                Alerta.item_id == item_id,
               
                # Um alerta é considerado "existente" e impede a criação de um novo se:
                or_(
                    Alerta.ignorar_novos == True, # Se foi marcado para ignorar novos alertas
                    and_(
                        Alerta.visualizado == False, # OU se não foi visualizado
                        Alerta.ignorar_novos == False # E não foi marcado para ignorar
                    )
                )
            )
        )
        return result.scalars().first() is not None

    @staticmethod
    async def create_alerta (db: AsyncSession, alerta_data: AlertaBase):
        novo_alerta = Alerta(
            tipo_alerta=alerta_data.tipo_alerta,
            item_id=alerta_data.item_id,
            mensagem_alerta=alerta_data.mensagem_alerta,
            data_alerta=datetime.now()
        )
        db.add(novo_alerta)
        await db.commit()
        return novo_alerta

    @staticmethod
    async def get_alertas (db: AsyncSession):
        result = await db.execute(select(Alerta))
        alertas = result.scalars().all()
        return alertas

    @staticmethod
    async def get_alerta_by_id(db: AsyncSession, alerta_id: int) -> Alerta | None:
        result = await db.execute(select(Alerta).where(Alerta.alerta_id == alerta_id))
        return result.scalars().first()

    @staticmethod
    async def count_alertas(
        db: AsyncSession,
        tipo_alerta: int | None = None,
        search_term: str | None = None
    ) -> int:
        query = select(func.count()).select_from(Alerta)

        # Adicionar filtros
        if tipo_alerta is not None:
            query = query.where(Alerta.tipo_alerta == tipo_alerta)

        if search_term:
            # Tentar buscar por mensagem ou por ID do item.
            # Se a busca por item_id for numérica, precisa de tratamento para evitar erro
            try:
                item_id_int = int(search_term)
                query = query.where(
                    (Alerta.mensagem_alerta.ilike(f"%{search_term}%")) |
                    (Alerta.item_id == item_id_int)
                )
            except ValueError:
                # Se não for um ID de item numérico, busca apenas na mensagem
                query = query.where(Alerta.mensagem_alerta.ilike(f"%{search_term}%"))

        result = await db.execute(query)
        return result.scalar_one()

    @staticmethod
    async def get_alertas_paginated(
        db: AsyncSession,
        offset: int,
        limit: int,
        tipo_alerta: int | None = None,
        search_term: str | None = None
    ) -> list[Alerta]:
        query = select(Alerta)

        # Adicionar filtros (mesma lógica de count_alertas)
        if tipo_alerta is not None:
            query = query.where(Alerta.tipo_alerta == tipo_alerta)

        if search_term:
            try:
                item_id_int = int(search_term)
                query = query.where(
                    (Alerta.mensagem_alerta.ilike(f"%{search_term}%")) |
                    (Alerta.item_id == item_id_int)
                )
            except ValueError:
                query = query.where(Alerta.mensagem_alerta.ilike(f"%{search_term}%"))

        query = query.offset(offset).limit(limit).order_by(Alerta.data_alerta.desc())
        result = await db.execute(query)
        return result.scalars().all()

    @staticmethod
    async def delete_alerta (db: AsyncSession, alerta_id: int):
        alerta = await AlertaRepository.get_alerta_by_id(db, alerta_id)
        await db.delete(alerta)
        await db.commit()
        return {"message": "Alerta deletado com sucesso"}

    @staticmethod
    async def ignorar_alerta (db: AsyncSession, alerta_id: int):
        alerta = await AlertaRepository.get_alerta_by_id(db, alerta_id)
        if alerta is None: # Adicionado para tratar o caso de alerta não encontrado
            return None
        alerta.ignorar_novos = True
        await db.commit()
        return alerta

    # Conta alertas não visualizados
    @staticmethod
    async def count_unviewed_alerts(db: AsyncSession) -> int:
        result = await db.execute(select(func.count()).select_from(Alerta).where(Alerta.visualizado == False))
        return result.scalar_one()

    #Marca todos os alertas NÃO visualizados, como visualizados
    @staticmethod
    async def mark_all_alerts_as_viewed (db: AsyncSession):
        # Atualiza todos os alertas que NÃO foram visualizados para visualizado=True
        await db.execute(
            update(Alerta).
            where(Alerta.visualizado == False). # apenas alertas não visualizados
            values(visualizado=True) # definir visualizado como True
        )
        await db.commit()
