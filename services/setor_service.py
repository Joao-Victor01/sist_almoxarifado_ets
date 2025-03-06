# services/setor_service.py
from sqlalchemy.orm import Session
from schemas.setor import SetorCreate, SetorUpdate
from repositories.setor_repository import SetorRepository

class SetorService:
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

