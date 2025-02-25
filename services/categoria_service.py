# services/categoria_service.py
from sqlalchemy.orm import Session
from schemas.categoria import CategoriaCreate, CategoriaUpdate
from repositories.categoria_repository import CategoriaRepository

class CategoriaService:
    @staticmethod
    def create_categoria(db: Session, categoria_data: CategoriaCreate):
        return CategoriaRepository.create_categoria(db, categoria_data)

    @staticmethod
    def get_categorias(db: Session):
        return CategoriaRepository.get_categorias(db)

    @staticmethod
    def get_categoria_by_id(db: Session, categoria_id: int):
        return CategoriaRepository.get_categoria_by_id(db, categoria_id)

    @staticmethod
    def update_categoria(db: Session, categoria_id: int, categoria_data: CategoriaUpdate):
        return CategoriaRepository.update_categoria(db, categoria_id, categoria_data)

    @staticmethod
    def delete_categoria(db: Session, categoria_id: int):
        return CategoriaRepository.delete_categoria(db, categoria_id)
