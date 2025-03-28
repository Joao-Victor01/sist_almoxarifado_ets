from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload
from models.item import Item
from schemas.item import ItemCreate, ItemUpdate
from fastapi import HTTPException, status

class ItemRepository:

    @staticmethod
    async def create_item(db: AsyncSession, item_data: ItemCreate, usuario_id: int):
        new_item = Item(
            **item_data.model_dump(),  # Usa o dicionário diretamente
            auditoria_usuario_id=usuario_id
        )
        db.add(new_item)
        await db.commit()
        await db.refresh(new_item)
        return new_item

    @staticmethod
    async def get_itens(db: AsyncSession):
        result = await db.execute(select(Item).options(joinedload(Item.categoria)))
        return result.scalars().all()

    @staticmethod
    async def get_item_by_id(db: AsyncSession, item_id: int):
        return await ItemRepository.__first_or_404(db, item_id)

    @staticmethod
    async def get_item_by_name(db: AsyncSession, item_name: str):
        return await ItemRepository.__first_or_404(db, Item.nome_item == item_name, "Item não encontrado")

    @staticmethod
    async def get_item_by_categoria_id(db: AsyncSession, categoria_id: int):
        return await ItemRepository.__first_or_404(db, Item.categoria_id == categoria_id, "Nenhum item encontrado para essa categoria")

    @staticmethod
    async def delete_item(db: AsyncSession, item_id: int):
        item = await ItemRepository.__first_or_404(db, item_id)
        await db.delete(item)
        await db.commit()
        return {"message": "Item deletado com sucesso"}

    @staticmethod
    async def update_item(db: AsyncSession, item_id: int, item_data: ItemUpdate, usuario_id: int):
        item = await ItemRepository.__first_or_404(db, item_id)

        for key, value in item_data.dict(exclude_unset=True).items():
            setattr(item, key, value)

        item.auditoria_usuario_id = usuario_id
        await db.commit()
        await db.refresh(item)
        return item

    @staticmethod
    async def __first_or_404(db: AsyncSession, *filters, message="Item não encontrado"):
        result = await db.execute(select(Item).where(*filters))
        item = result.scalars().first()
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=message)
        return item
