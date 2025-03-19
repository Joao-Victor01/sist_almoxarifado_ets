from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from models.retirada import Retirada
from models.retirada_item import RetiradaItem
from schemas.retirada import RetiradaCreate, RetiradaUpdateStatus
from fastapi import HTTPException, status
from models.item import Item

class RetiradaRepository:

    @staticmethod
    async def solicitar_retirada(db: AsyncSession, retirada_data: RetiradaCreate, usuario_id: int):
        nova_retirada = Retirada(
            usuario_id=usuario_id,
            setor_id=retirada_data.setor_id,
            status=1,
            solicitado_localmente_por=retirada_data.solicitado_localmente_por,
            justificativa=retirada_data.justificativa
        )
        
        db.add(nova_retirada)
        await db.flush()  # Gera o ID da retirada sem fazer commit

        for item in retirada_data.itens:
            retirada_item = RetiradaItem(
                retirada_id=nova_retirada.retirada_id,
                item_id=item.item_id,
                quantidade_retirada=item.quantidade_retirada
            )
            db.add(retirada_item)

        await db.commit()
        await db.refresh(nova_retirada)
        return nova_retirada

    @staticmethod
    async def atualizar_status(db: AsyncSession, retirada_id: int, status_data: RetiradaUpdateStatus, admin_id: int):
        result = await db.execute(select(Retirada).where(Retirada.retirada_id == retirada_id))
        retirada = result.scalars().first()

        if not retirada:
            raise HTTPException(status_code=404, detail="Retirada não encontrada")

        if status_data.status == 3:
            for item in retirada.itens:
                item_existente = await db.execute(select(Item).where(Item.item_id == item.item_id))
                item_model = item_existente.scalars().first()
                if item_model and item_model.quantidade_item >= item.quantidade_retirada:
                    item_model.quantidade_item -= item.quantidade_retirada
                else:
                    raise HTTPException(status_code=400, detail="Estoque insuficiente para concluir a retirada")

        retirada.status = status_data.status
        retirada.detalhe_status = status_data.detalhe_status
        retirada.autorizado_por = admin_id

        await db.commit()
        await db.refresh(retirada)

        return retirada
