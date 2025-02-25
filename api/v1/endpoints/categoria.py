# api/v1/endpoints/categoria.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from core.database import SessionLocal
from schemas.categoria import CategoriaCreate, CategoriaUpdate, CategoriaOut
from services.categoria_service import CategoriaService
from typing import List

router = APIRouter(prefix="/categorias", tags=["Categorias"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/", response_model=CategoriaOut)
def create_categoria(categoria: CategoriaCreate, db: Session = Depends(get_db)):
    return CategoriaService.create_categoria(db, categoria)

@router.get("/", response_model=List[CategoriaOut])
def get_categorias(db: Session = Depends(get_db)):
    return CategoriaService.get_categorias(db)

@router.get("/{categoria_id}", response_model=CategoriaOut)
def get_categoria_by_id(categoria_id: int, db: Session = Depends(get_db)):
    categoria = CategoriaService.get_categoria_by_id(db, categoria_id)
    if not categoria:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    return categoria

@router.put("/{categoria_id}", response_model=CategoriaOut)
def update_categoria(categoria_id: int, categoria: CategoriaUpdate, db: Session = Depends(get_db)):
    updated_categoria = CategoriaService.update_categoria(db, categoria_id, categoria)
    if not updated_categoria:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    return updated_categoria

@router.delete("/{categoria_id}")
def delete_categoria(categoria_id: int, db: Session = Depends(get_db)):
    deleted_categoria = CategoriaService.delete_categoria(db, categoria_id)
    if not deleted_categoria:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    return {"message": "Categoria deletada com sucesso"}