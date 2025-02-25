# api/v1/endpoints/setor.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from core.database import SessionLocal
from schemas.setor import SetorCreate, SetorUpdate, SetorOut
from services.setor_service import SetorService
from typing import List

router = APIRouter(prefix="/setores", tags=["Setores"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/", response_model=SetorOut)
def create_setor(setor: SetorCreate, db: Session = Depends(get_db)):
    return SetorService.create_setor(db, setor)

@router.get("/", response_model=List[SetorOut])
def get_setores(db: Session = Depends(get_db)):
    return SetorService.get_setores(db)

@router.get("/{setor_id}", response_model=SetorOut)
def get_setor_by_id(setor_id: int, db: Session = Depends(get_db)):
    setor = SetorService.get_setor_by_id(db, setor_id)
    if not setor:
        raise HTTPException(status_code=404, detail="Setor não encontrado")
    return setor

@router.put("/{setor_id}", response_model=SetorOut)
def update_setor(setor_id: int, setor: SetorUpdate, db: Session = Depends(get_db)):
    updated_setor = SetorService.update_setor(db, setor_id, setor)
    if not updated_setor:
        raise HTTPException(status_code=404, detail="Setor não encontrado")
    return updated_setor

@router.delete("/{setor_id}")
def delete_setor(setor_id: int, db: Session = Depends(get_db)):
    deleted_setor = SetorService.delete_setor(db, setor_id)
    if not deleted_setor:
        raise HTTPException(status_code=404, detail="Setor não encontrado")
    return {"message": "Setor deletado com sucesso"}