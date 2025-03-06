# repositories/setor_repository.py
from sqlalchemy.orm import Session
from models.setor import Setor
from schemas.setor import SetorCreate, SetorUpdate
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from fastapi import HTTPException, status

class SetorRepository:

    #persistir um novo setor na base de dados
    @staticmethod
    async def create_setor(db: AsyncSession, setor_data: SetorCreate):
        novo_setor = Setor(
            nome_setor=setor_data.nome_setor,
            descricao_setor=setor_data.descricao_setor
        )
        db.add(novo_setor)
        await db.commit()  
        await db.refresh(novo_setor)  
        return novo_setor  

    #listar todos os setores da base de dados
    @staticmethod
    async def get_setores(db: Session):
        result = await db.execute(select(Setor))
        setores = result.scalars().all()
        return setores

    #filtrar um setor por id
    @staticmethod
    async def get_setor_by_id(db: Session, setor_id: int):
        result = await db.execute(select(Setor).filter(Setor.setor_id == setor_id))
        setor = result.scalars().first()

        if not setor:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Setor não encontrado.")
        
        return setor

    #atualizar dados do setor por id
    @staticmethod
    async def update_setor(db: AsyncSession, setor_id: int, setor_data: SetorUpdate):
        # Busca o setor pelo ID
        result = await db.execute(select(Setor).filter(Setor.setor_id == setor_id))
        setor = result.scalars().first()

        if not setor:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Setor não encontrado.")

        # Atualiza os campos do setor
        setor.nome_setor = setor_data.nome_setor
        setor.descricao_setor = setor_data.descricao_setor

        # Persiste as alterações no banco de dados
        await db.commit()
        await db.refresh(setor)

        return setor

    #deletar setor por id
    @staticmethod
    async def delete_setor(db: AsyncSession, setor_id: int):
        # Busca o setor pelo ID
        result = await db.execute(select(Setor).filter(Setor.setor_id == setor_id))
        setor = result.scalars().first()

        if not setor:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Setor não encontrado.")

        # Remove o setor do banco de dados
        await db.delete(setor)
        await db.commit()

        return setor