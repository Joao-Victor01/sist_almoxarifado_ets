# services/setor_service.py
from sqlalchemy.orm import Session
from sqlalchemy.future import select
from schemas.setor import SetorCreate, SetorUpdate
from repositories.setor_repository import SetorRepository
from models.setor import Setor
from fastapi import HTTPException, status

class SetorService:
    """Adicionar lógica para só permitir deletar um setor se não tiver nenhum usuário associado a ele"""
    @staticmethod
    async def create_setor(db: Session, setor_data: SetorCreate):

        result = await SetorRepository.create_setor(db, setor_data)
        return result

    @staticmethod
    async def get_setores(db: Session):
        result = await SetorRepository.get_setores(db)
        return result

    @staticmethod
    async def get_setor_by_id(db: Session, setor_id: int):
        result = await SetorRepository.get_setor_by_id(db, setor_id)
        return result

    @staticmethod
    async def update_setor(db: Session, setor_id: int, setor_data: SetorUpdate):
        result = await SetorRepository.update_setor(db, setor_id, setor_data)
        return result

    @staticmethod
    async def delete_setor(db: Session, setor_id: int):
        result = await SetorRepository.delete_setor(db, setor_id)
        return result
    
    @staticmethod
    async def create_root_setor(db:Session):
        existing_setor = await db.execute(select(Setor))
        if existing_setor.scalars().first() is not None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="O sistema já possui setores cadastrados"
            )

        setor_root = SetorCreate(
            nome_setor="Setor Root",
            descricao_setor="Setor criado apenas para início do sistema"
        )
        return await SetorRepository.create_setor(db, setor_root)
        

