# repositories/categoria_repository.py
from sqlalchemy.orm import Session
from models.categoria import Categoria
from schemas.categoria import CategoriaCreate, CategoriaUpdate

class CategoriaRepository:

    @staticmethod
    #cadastrar categoria
    def create_categoria(db: Session, categoria: CategoriaCreate):
        nova_categoria = Categoria(
            nome_categoria=categoria.nome_categoria,
            descricao_categoria=categoria.descricao_categoria
        )
        db.add(nova_categoria)
        db.commit()
        db.refresh(nova_categoria)
        return nova_categoria

    @staticmethod
    #listar categorias
    def get_categorias(db: Session):
        return db.query(Categoria).all()

    @staticmethod
    #filtar categoria por ID
    def get_categoria_by_id(db: Session, categoria_id: int):
        return db.query(Categoria).filter(Categoria.categoria_id == categoria_id).first()

    @staticmethod
    #atualizar categoria
    def update_categoria(db: Session, categoria_id: int, categoria_data: CategoriaUpdate):
        categoria = db.query(Categoria).filter(Categoria.categoria_id == categoria_id).first()
        if categoria:
            categoria.nome_categoria = categoria_data.nome_categoria
            categoria.descricao_categoria = categoria_data.descricao_categoria
            db.commit()
            db.refresh(categoria)
        return categoria

    @staticmethod
    #deletar categoria
    def delete_categoria(db: Session, categoria_id: int):
        categoria = db.query(Categoria).filter(Categoria.categoria_id == categoria_id).first()
        if categoria:
            db.delete(categoria)
            db.commit()
        return categoria