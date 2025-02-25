# repositories/setor_repository.py
from sqlalchemy.orm import Session
from models.setor import Setor
from schemas.setor import SetorCreate, SetorUpdate

class SetorRepository:
    @staticmethod
    def create_setor(db: Session, setor: SetorCreate):
        novo_setor = Setor(
            nome_setor=setor.nome_setor,
            descricao_setor=setor.descricao_setor
        )
        db.add(novo_setor)
        db.commit()
        db.refresh(novo_setor)
        return novo_setor

    @staticmethod
    def get_setores(db: Session):
        return db.query(Setor).all()

    @staticmethod
    def get_setor_by_id(db: Session, setor_id: int):
        return db.query(Setor).filter(Setor.setor_id == setor_id).first()

    @staticmethod
    def update_setor(db: Session, setor_id: int, setor_data: SetorUpdate):
        setor = db.query(Setor).filter(Setor.setor_id == setor_id).first()
        if setor:
            setor.nome_setor = setor_data.nome_setor
            setor.descricao_setor = setor_data.descricao_setor
            db.commit()
            db.refresh(setor)
        return setor

    @staticmethod
    def delete_setor(db: Session, setor_id: int):
        setor = db.query(Setor).filter(Setor.setor_id == setor_id).first()
        if setor:
            db.delete(setor)
            db.commit()
        return setor