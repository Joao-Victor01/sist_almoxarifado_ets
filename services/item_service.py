from datetime import datetime 
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from schemas.item import ItemCreate, ItemUpdate
from repositories.item_repository import ItemRepository
from fastapi import HTTPException, status
from utils.normalizar_texto import normalize_name
from models.item import Item

class ItemService:
    @staticmethod
    async def create_item(db: AsyncSession, item_data: ItemCreate):

        try:
            nome_normalizado = normalize_name(item_data.nome_item)

            item_existente = await ItemService.__find_item_by_name(db, nome_normalizado)

            if item_existente and item_existente.categoria_id == item_data.categoria_id:
                item_existente.quantidade_item += item_data.quantidade_item
                item_existente.data_entrada_item = datetime.now()
                await db.commit()
                await db.refresh(item_existente)
                return item_existente
            

            # Validações dos campos obrigatórios
            if not item_data.nome_item  or item_data.nome_item.strip() == "":
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
            
            if not item_data.quantidade_item or item_data.quantidade_item <=0:
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
            item_data.nome_item = nome_normalizado
            

            # Cria o item no banco de dados
            return await ItemRepository.create_item(db, item_data)

        except IntegrityError as e:
            await db.rollback()  # Garante que a transação seja revertida
            if "fk_item_categoria" in str(e.orig):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Categoria do item não encontrada no banco de dados."
                )

            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro ao criar o item. Verifique os dados e tente novamente."
            )
    @staticmethod
    async def get_itens(db: AsyncSession):
        return await ItemRepository.get_itens(db)

    @staticmethod
    async def get_item_by_id(db: AsyncSession, item_id: int):
        return await ItemRepository.get_item_by_id(db, item_id)


    @staticmethod
    async def update_item(db: AsyncSession, item_id: int, item_data: ItemUpdate):
        nome_normalizado = normalize_name(item_data.nome_item)
        item_data.nome_item = nome_normalizado
        return await ItemRepository.update_item(db, item_id, item_data)

    @staticmethod
    async def delete_item(db: AsyncSession, item_id: int):
        return await ItemRepository.delete_item(db, item_id)
    
    
    @staticmethod
    async def __find_item_by_name(db: AsyncSession, item_name:str):
        result = await db.execute(select(Item).where(Item.nome_item == item_name))
        item = result.scalars().first()
        
        return item
