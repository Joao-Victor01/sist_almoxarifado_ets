#repositories\item_repository.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from models.item import Item
from schemas.item import ItemCreate, ItemUpdate
from core.security import get_password_hash
from fastapi import HTTPException, status
from datetime import datetime

class ItemRepository:

    @staticmethod
    async def create_item(db: AsyncSession, item_data: ItemCreate, usuario_id: int):


        # Criando o modelo de item 
        new_item = Item(
            nome_item=item_data.nome_item,  
            descricao_item=item_data.descricao_item,
            unidade_medida_item=item_data.unidade_medida_item,
            quantidade_item=item_data.quantidade_item,
            data_entrada_item=item_data.data_entrada_item,
            data_validade_item=item_data.data_validade_item,
            quantidade_minima_item=item_data.quantidade_minima_item,
            categoria_id=item_data.categoria_id,
            auditoria_usuario_id=usuario_id,
            marca_item=item_data.marca_item
        )

        db.add(new_item)
        await db.commit()
        await db.refresh(new_item)
        return new_item



    @staticmethod
    async def get_itens(db: AsyncSession):
        result = await db.execute(select(Item))
        itens = result.scalars().all()
        return itens

    @staticmethod
    async def get_item_by_id(db: AsyncSession, item_id: int):
        result = await ItemRepository.__find_item_by_id(db, item_id)
        return result

    @staticmethod
    async def delete_item(db: AsyncSession, item_id: int):
        result = await ItemRepository.__find_item_by_id(db, item_id)

        if result:
            await db.delete(result)
            await db.commit()
            return {"message": "Item deletado com sucesso"}
        
        return result

    @staticmethod
    async def update_item(db: AsyncSession, item_id: int, item_data: ItemUpdate, usuario_id):

        item = await ItemRepository.__find_item_by_id(db, item_id)
    
        if item:
            if item_data.nome_item:
                item.nome_item = item_data.nome_item

            if item_data.descricao_item:
                item.descricao_item = item_data.descricao_item

            if item_data.quantidade_item:
                item.quantidade_item = item_data.quantidade_item

            if item_data.categoria_id:
                item.categoria_id = item_data.categoria_id

            if item_data.data_validade_item:
                item.data_validade_item = item_data.data_validade_item

            if item_data.data_entrada_item:
                item.data_entrada_item = item_data.data_entrada_item

            if item_data.data_saida_item:
                item.data_saida_item = item_data.data_saida_item

            if item_data.quantidade_minima_item:
                item.quantidade_minima_item = item_data.quantidade_minima_item

            if item_data.marca_item:
                item.marca_item =item_data.marca_item
            
            item.auditoria_usuario_id = usuario_id

        await db.commit()
        await db.refresh(item)
        return item

    
    @staticmethod
    async def __find_item_by_id(db: AsyncSession, item_id:int):
        result = await db.execute(select(Item).where(Item.item_id == item_id))
        item = result.scalars().first()

        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item não encontrado")
        
        return item

