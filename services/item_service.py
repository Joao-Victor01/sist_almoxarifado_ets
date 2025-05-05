#services\item_service.py

from datetime import datetime 
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from schemas.item import ItemCreate, ItemUpdate
from repositories.item_repository import ItemRepository
from fastapi import HTTPException, status
from utils.normalizar_texto import normalize_name
from models.item import Item
from schemas.item import PaginatedItems, ItemOut

class ItemService:
    
    @staticmethod
    async def create_item(db: AsyncSession, item_data: ItemCreate, current_user):
        try:
            nome_normalizado = normalize_name(item_data.nome_item)
            marca_normalizada = normalize_name(item_data.marca_item)
            item_data.data_entrada_item = datetime.now()
            item_data.nome_item = nome_normalizado
            item_data.marca_item = marca_normalizada

    
            ItemService._validate_item_fields(item_data)


            item_existente = await ItemService._find_item(db, nome_normalizado, 
                                                           item_data.data_validade_item, 
                                                           item_data.categoria_id,
                                                           item_data.marca_item)
            if item_existente and item_existente.marca_item == item_data.marca_item:
                return await ItemService._increment_existing_item(db, item_existente, item_data.quantidade_item, item_data)
            

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
        result = await ItemRepository.get_itens(db)
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Sem itens no banco de dados"
            )
        return result

    @staticmethod
    async def get_item_by_id(db: AsyncSession, item_id: int):
        result = await ItemRepository.get_item_by_id(db, item_id)
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Item não encontrado"
            )
        return result
    
    @staticmethod
    async def get_item_by_categoria_id(db: AsyncSession, categoria_id: int):
        result = await ItemRepository.get_item_by_categoria_id(db, categoria_id)
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Sem itens na categoria selecionada"
                )
        return result
    
    @staticmethod
    async def get_item_by_name(db: AsyncSession, item_name: str):
        normalized_name = normalize_name(item_name)
        result = await ItemRepository.get_item_by_name(db, normalized_name)
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Item não encontrado"
                )
        return result
    

    @staticmethod
    async def get_itens_filtrados(
        db: AsyncSession,
        categoria_ids: list[int] = None,
        nome_produto: str = None
    ):
        """
        Encapsula a lógica de normalização e chama o repositório.
        Retorna lista de tuplas (Item, nome_categoria).
        """
        nome_produto_normalizado = normalize_name(nome_produto) if nome_produto else None
        return await ItemRepository.get_itens_filtrados(
            db, 
            categoria_ids=categoria_ids,
            nome_produto_normalizado=nome_produto_normalizado
        )
    
    @staticmethod
    async def get_itens_por_periodo(
        db: AsyncSession,
        data_inicio: datetime,
        data_fim: datetime
    ):

        result = await ItemRepository.get_itens_por_periodo(db, data_inicio, data_fim)
        return result

    @staticmethod
    async def update_item(db: AsyncSession, item_id: int, item_data: ItemUpdate, current_user):


        nome_normalizado = normalize_name(item_data.nome_item)   
        item_data.nome_item = nome_normalizado
     

        auditoria_usuario_id = current_user.usuario_id
        
        return await ItemRepository.update_item(db, item_id, item_data, auditoria_usuario_id)

    @staticmethod
    async def delete_item(db: AsyncSession, item_id: int):
        return await ItemRepository.delete_item(db, item_id)
    
    #retorna itens paginados
    @staticmethod
    async def get_items_paginated(
        db,
        page: int,
        size: int
    ) -> PaginatedItems:
        # validação de tamanho
        allowed = [5, 10, 25, 50, 100]
        if size not in allowed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"size deve ser um de {allowed}"
            )
        if page < 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="page deve ser >= 1"
            )

        total = await ItemRepository.count_items(db)
        offset = (page - 1) * size
        itens = await ItemRepository.get_items_paginated(db, offset, size)

        # converte para DTO
        items_out = [ItemOut.model_validate(i) for i in itens]

        return PaginatedItems(
            page=page,
            size=size,
            total=total,
            items=items_out
        )
    
#_________________________________________________________________________________________________________#
    #FUNÇÕES AUXILIARES DE VALIDAÇÕES E EXCEÇÕES   
    
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
    async def _increment_existing_item(db: AsyncSession, item_existente: Item, quantidade: int, item_data):
        """ Se o item já existe, apenas incrementa a quantidade no banco. """
        item_existente.quantidade_item += quantidade
        item_existente.data_entrada_item = datetime.now()

        if item_data.data_validade_item:
            item_existente.data_validade_item = item_data.data_validade_item
        if item_data.quantidade_minima_item:
            item_existente.quantidade_minima_item = item_data.quantidade_minima_item
        if item_data.marca_item:
            item_existente.marca_item = item_data.marca_item

        await db.commit()
        await db.refresh(item_existente)
        return item_existente  


    @staticmethod
    def _handle_integrity_error(e: IntegrityError):
        """ Trata erros de integridade dos dados enviados pelo usuário """
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
    
    @staticmethod
    async def _find_item(db: AsyncSession, 
                                               item_name: str, 
                                               validade: datetime, 
                                               categoria_id:int,
                                               marca_item:str):
        result = await db.execute(select(Item).where(
            Item.nome_item == item_name,
            Item.data_validade_item == validade,
            Item.categoria_id == categoria_id,
            Item.marca_item == marca_item 
        ))
        item = result.scalars().first()
        return item