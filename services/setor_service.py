# services/setor_service.py
from sqlalchemy.orm import Session
from schemas.setor import SetorCreate, SetorUpdate
from repositories.setor_repository import SetorRepository

class SetorService:
    @staticmethod
    def create_setor(db: Session, setor_data: SetorCreate):
        return SetorRepository.create_setor(db, setor_data)

    @staticmethod
    def get_setores(db: Session):
        return SetorRepository.get_setores(db)

    @staticmethod
    def get_setor_by_id(db: Session, setor_id: int):
        return SetorRepository.get_setor_by_id(db, setor_id)

    @staticmethod
    def update_setor(db: Session, setor_id: int, setor_data: SetorUpdate):
        return SetorRepository.update_setor(db, setor_id, setor_data)

    @staticmethod
    def delete_setor(db: Session, setor_id: int):
        return SetorRepository.delete_setor(db, setor_id)

