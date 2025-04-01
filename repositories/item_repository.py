from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from models.item import Item
from models.categoria import Categoria
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
        result = await db.execute(select(Item))
        return result.scalars().all()

    @staticmethod
    async def get_item_by_id(db: AsyncSession, item_id: int):
        result = await db.execute(select(Item).where(Item.item_id == item_id))
        return result.scalars().first()
        

    @staticmethod
    async def get_item_by_name(db: AsyncSession, item_name: str):
        result = await db.execute(select(Item).where(Item.nome_item == item_name))
        return result.scalars().first()

    @staticmethod
    async def get_item_by_categoria_id(db: AsyncSession, categoria_id: int):
        result = await db.execute(select(Item).where(Item.categoria_id == categoria_id))
        return result.scalars().all()
    

    @staticmethod
    async def get_itens_filtrados(
        db: AsyncSession,
        categoria_ids: list[int] = None,
        nome_produto_normalizado: str = None
    ):
        """
        Busca itens com JOIN na tabela Categoria e aplica filtros.
        Retorna tuplas (Item, nome_categoria).
        """
        query = (
            select(Item, Categoria.nome_categoria)
            .join(Categoria, Item.categoria_id == Categoria.categoria_id)
        )

        if categoria_ids:
            query = query.where(Item.categoria_id.in_(categoria_ids))
        
        if nome_produto_normalizado:
            query = query.where(Item.nome_item.ilike(f"%{nome_produto_normalizado}%"))

        result = await db.execute(query)
        return result.all()

    @staticmethod
    async def delete_item(db: AsyncSession, item_id: int):
        item = await ItemRepository.__first_or_404(db, item_id)
        await db.delete(item)
        await db.commit()
        return {"message": "Item deletado com sucesso"}

    @staticmethod
    async def update_item(db: AsyncSession, item_id: int, item_data: ItemUpdate, usuario_id: int):
        item = await ItemRepository.__first_or_404(db, item_id)

        for key, value in item_data.model_dump(exclude_unset=True).items():
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
