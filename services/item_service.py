from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from models.item import Item
from schemas.item import ItemCreate, ItemUpdate
from repositories.item_repository import ItemRepository
from fastapi import HTTPException

class ItemService:
    @staticmethod
    async def create_item(db: AsyncSession, item_data: ItemCreate):
        return await ItemRepository.create_item(db, item_data)

    @staticmethod
    async def get_itens(db: AsyncSession):
        return await ItemRepository.get_itens(db)

    @staticmethod
    async def get_item_by_id(db: AsyncSession, item_id: int):
        item = await ItemRepository.get_item_by_id(db, item_id)
        if not item:
            raise HTTPException(status_code=404, detail="Item não encontrado")
        return item

    @staticmethod
    async def update_item(db: AsyncSession, item_id: int, item_data: ItemUpdate):
        item = await ItemRepository.get_item_by_id(db, item_id)
        if not item:
            raise HTTPException(status_code=404, detail="Item não encontrado")

        return await ItemRepository.update_item(db, item_id, item_data)

    @staticmethod
    async def delete_item(db: AsyncSession, item_id: int):
        item = await ItemRepository.get_item_by_id(db, item_id)
        if not item:
            raise HTTPException(status_code=404, detail="Item não encontrado")

        return await ItemRepository.delete_item(db, item_id)
