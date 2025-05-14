#services\item_service.py

from datetime import datetime 
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from schemas.item import ItemCreate, ItemUpdate
from repositories.item_repository import ItemRepository
from repositories.categoria_repository import CategoriaRepository
from fastapi import HTTPException, status
from utils.normalizar_texto import normalize_name
from models.item import Item
from schemas.item import PaginatedItems, ItemOut
import math


class ItemService:
    
    @staticmethod
    async def create_item(db: AsyncSession, item_data: ItemCreate, current_user):
        try:
            ItemService._validate_item_fields(item_data)
            
            nome_original = item_data.nome_item.strip()
            nome_normalizado = normalize_name(nome_original)

            # Prepara os dados do item
            dados_item = item_data.model_dump()
            dados_item.update({
                "nome_item_original": nome_original,
                "nome_item": nome_normalizado,
                "auditoria_usuario_id": current_user.usuario_id,
                "data_entrada_item": dados_item.get('data_entrada_item') or datetime.now()
            })

            # Verifica se já existe um item idêntico
            existing_item = await ItemService._find_item(
                db=db,
                item_name=nome_normalizado,
                validade=dados_item.get('data_validade_item'),
                categoria_id=dados_item['categoria_id'],
                marca_item=dados_item.get('marca_item')
            )

            if existing_item:
                # Incrementa a quantidade no item existente
                return await ItemService._increment_existing_item(
                    db=db,
                    item_existente=existing_item,
                    quantidade=dados_item['quantidade_item'],
                    item_data=item_data  # Passa os dados para atualizar outros campos
                )
            else:
                # Cria novo item
                item = await ItemRepository.create_item(db, dados_item)
                return item

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
    async def get_itens_name_or_categoria_ilike(db: AsyncSession,
        nome_produto: str = None,
        nome_categoria: str = None
        )-> list[Item]:
        """
        Encapsula a lógica de normalização e chama o repositório.
        Retorna lista de Item (fazendo filtro por nome do produto e/ou por categoria).
        """
        # normaliza termo de busca de produto, se informado
        nome_produto_normalizado = normalize_name(nome_produto) if nome_produto else None

        # obtém lista de categoria_ids via nome de categoria parcial, se informado
        categoria_ids = None
        if nome_categoria:
            nome_cat_norm = normalize_name(nome_categoria)
            categoria_ids = await CategoriaRepository.find_categoria_ids_by_name(db, nome_cat_norm)

        # busca no repositório (retorna tuplas (Item, nome_categoria))
        resultados = await ItemRepository.get_itens_filtrados(
            db,
            categoria_ids=categoria_ids,
            nome_produto_normalizado=nome_produto_normalizado
        )

        itens = [item for item, _nome_cat in resultados]
        if not itens:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Nenhum item encontrado para os critérios de busca"
            )
        
        return itens
    
    
    @staticmethod
    async def search_items_paginated(
        db: AsyncSession,
        nome_produto: str | None,
        nome_categoria: str | None,
        page: int,
        size: int
    ) -> PaginatedItems:
        # validações idênticas a get_items_paginated
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

        # normaliza e traduz nome_categoria em IDs
        nome_norm = normalize_name(nome_produto) if nome_produto else None
        categoria_ids = None
        if nome_categoria:
            nome_cat_norm = normalize_name(nome_categoria)
            categoria_ids = await CategoriaRepository.find_categoria_ids_by_name(db, nome_cat_norm)

        # conta total de itens filtrados
        total = await ItemRepository.count_filtered_items(
            db, categoria_ids=categoria_ids, nome_produto_normalizado=nome_norm
        )

        # calcula offset e traz só a página
        offset = (page - 1) * size
        itens = await ItemRepository.get_filtered_items_paginated(
            db, categoria_ids=categoria_ids,
            nome_produto_normalizado=nome_norm,
            offset=offset, limit=size
        )

        items_out = [ItemOut.model_validate(i) for i in itens]
        total_pages = math.ceil(total / size) if total > 0 else 1

        return PaginatedItems(
            page=page, size=size,
            total=total, total_pages=total_pages,
            items=items_out
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
        item = await ItemRepository.get_item_by_id(db, item_id)
        valores_atualizados = item_data.model_dump(exclude_unset=True)

        # Normaliza o nome se fornecido
        if 'nome_item' in valores_atualizados:
            novo_nome_original = valores_atualizados['nome_item'].strip()
            nome_normalizado = normalize_name(novo_nome_original)
            valores_atualizados['nome_item_original'] = novo_nome_original
            valores_atualizados['nome_item'] = nome_normalizado

        # Prepara os novos valores para verificação
        novo_nome = valores_atualizados.get('nome_item', item.nome_item)
        nova_marca = valores_atualizados.get('marca_item', item.marca_item)
        nova_validade = valores_atualizados.get('data_validade_item', item.data_validade_item)
        nova_categoria = valores_atualizados.get('categoria_id', item.categoria_id)

        # Busca por itens idênticos com os novos valores
        existing_item = await ItemService._find_item(
            db=db,
            item_name=novo_nome,
            validade=nova_validade,
            categoria_id=nova_categoria,
            marca_item=nova_marca
        )

        # Se encontrar um item diferente, mescla
        if existing_item and existing_item.item_id != item.item_id:
            # Transfere a quantidade
            existing_item.quantidade_item += item.quantidade_item
            
            # Atualiza campos adicionais se necessário
            for field in ['quantidade_minima_item', 'data_validade_item', 'marca_item']:
                if field in valores_atualizados:
                    setattr(existing_item, field, valores_atualizados[field])
            
            # Deleta o item original
            await db.delete(item)
            await db.commit()
            await db.refresh(existing_item)
            return existing_item
        else:
            # Atualiza normalmente se não houver duplicata
            for key, value in valores_atualizados.items():
                setattr(item, key, value)
            item.auditoria_usuario_id = current_user.usuario_id
            await db.commit()
            await db.refresh(item)
            return item

    @staticmethod
    async def delete_item(db: AsyncSession, item_id: int):
        return await ItemRepository.delete_item(db, item_id)
    
    #função para retorno de itens paginados
    @staticmethod
    async def get_items_paginated(
        db: AsyncSession,
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

        # conta total de itens
        total = await ItemRepository.count_items(db)
        offset = (page - 1) * size
        itens = await ItemRepository.get_items_paginated(db, offset, size)

        # converte para DTO
        items_out = [ItemOut.model_validate(i) for i in itens]

        # calcula total de páginas
        total_pages = math.ceil(total / size) if total > 0 else 1

        return PaginatedItems(
            page=page,
            size=size,
            total=total,
            total_pages=total_pages,
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