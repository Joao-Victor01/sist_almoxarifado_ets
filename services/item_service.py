from datetime import datetime 
from sqlalchemy.ext.asyncio import AsyncSession
from schemas.item import ItemCreate, ItemUpdate
from repositories.item_repository import ItemRepository
from fastapi import HTTPException, status

class ItemService:
    @staticmethod
    async def create_item(db: AsyncSession, item_data: ItemCreate):
        # Validações dos campos obrigatórios
        if not item_data.nome_item or item_data.nome_item.strip() == "":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="O campo 'nome_item' é obrigatório."
            )
        
        if not item_data.descricao_item or item_data.descricao_item.strip() == "":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="O campo 'descricao_item' é obrigatório."
            )
        
        if not item_data.unidade_medida_item or item_data.unidade_medida_item.strip() == "":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="O campo 'unidade_medida_item' é obrigatório."
            )
        
        if not item_data.quantidade_item:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="O campo 'quantidade_item' é obrigatório."
            )
        
        if not item_data.categoria_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="O campo 'categoria_id' é obrigatório."
            )

        # Adiciona a data de entrada automaticamente
        item_data.data_entrada_item = datetime.now()

        # Cria o item no banco de dados
        return await ItemRepository.create_item(db, item_data)

    @staticmethod
    async def get_itens(db: AsyncSession):
        return await ItemRepository.get_itens(db)

    @staticmethod
    async def get_item_by_id(db: AsyncSession, item_id: int):
        return await ItemRepository.get_item_by_id(db, item_id)


    @staticmethod
    async def update_item(db: AsyncSession, item_id: int, item_data: ItemUpdate):
        return await ItemRepository.update_item(db, item_id, item_data)

    @staticmethod
    async def delete_item(db: AsyncSession, item_id: int):
        return await ItemRepository.delete_item(db, item_id)