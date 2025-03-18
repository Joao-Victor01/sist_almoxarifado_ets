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
    async def create_item(db: AsyncSession, item_data: ItemCreate, current_user):
        try:
            nome_normalizado = normalize_name(item_data.nome_item)
            item_data.data_entrada_item = datetime.now()
            item_data.nome_item = nome_normalizado

    
            ItemService._validate_item_fields(item_data)

            #  Verifica se o item já existe antes de criar um novo
            item_existente = await ItemService.__find_item_by_name(db, nome_normalizado)
            if item_existente and item_existente.categoria_id == item_data.categoria_id:
                return await ItemService._increment_existing_item(db, item_existente, item_data.quantidade_item)

            #  Criar novo item no banco
            return await ItemRepository.create_item(db, item_data, current_user.usuario_id)

        except IntegrityError as e:
            await db.rollback()
            ItemService._handle_integrity_error(e)

        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Erro ao criar o item: {str(e)}"
            )

    @staticmethod
    async def get_itens(db: AsyncSession):
        return await ItemRepository.get_itens(db)

    @staticmethod
    async def get_item_by_id(db: AsyncSession, item_id: int):
        return await ItemRepository.get_item_by_id(db, item_id)


    @staticmethod
    async def update_item(db: AsyncSession, item_id: int, item_data: ItemUpdate, current_user):
        nome_normalizado = normalize_name(item_data.nome_item)
        auditoria_usuario = current_user.usuario_id


        item_data.nome_item = nome_normalizado
        return await ItemRepository.update_item(db, item_id, item_data, auditoria_usuario)

    @staticmethod
    async def delete_item(db: AsyncSession, item_id: int):
        return await ItemRepository.delete_item(db, item_id)
    
#_________________________________________________________________________________________________________#
    #FUNÇÕES AUXILIARES DE VALIDAÇÕES E EXCEÇÕES   
    
    @staticmethod
    async def __find_item_by_name(db: AsyncSession, item_name:str):
        result = await db.execute(select(Item).where(Item.nome_item == item_name))
        item = result.scalars().first()
        
        return item
    
    @staticmethod
    def _validate_item_fields(item_data: ItemCreate):
        """ Valida campos obrigatórios para reduzir repetições. """
        missing_fields = []

        if not item_data.nome_item or item_data.nome_item.strip() == "":
            missing_fields.append("nome_item")
        if not item_data.descricao_item or item_data.descricao_item.strip() == "":
            missing_fields.append("descricao_item")
        if not item_data.unidade_medida_item or item_data.unidade_medida_item.strip() == "":
            missing_fields.append("unidade_medida_item")
        if not item_data.quantidade_item or item_data.quantidade_item <= 0:
            missing_fields.append("quantidade_item (deve ser maior que zero)")
        if not item_data.categoria_id:
            missing_fields.append("categoria_id")

        if missing_fields:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Campos obrigatórios ausentes ou inválidos: {', '.join(missing_fields)}"
            )

    @staticmethod
    async def _increment_existing_item(db: AsyncSession, item_existente: Item, quantidade: int):
        """ Se o item já existe, apenas incrementa a quantidade no banco. """
        item_existente.quantidade_item += quantidade
        item_existente.data_entrada_item = datetime.now()
        await db.commit()
        await db.refresh(item_existente)
        return item_existente


    @staticmethod
    def _handle_integrity_error(e: IntegrityError):
        """ Trata erros de integridade para mensagens mais amigáveis. """
        error_message = str(e.orig)
        if "fk_item_categoria" in error_message:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Categoria do item não encontrada no banco de dados."
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao criar o item. Verifique os dados e tente novamente."
        )
