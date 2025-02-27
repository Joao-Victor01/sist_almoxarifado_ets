from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import get_session
from schemas.setor import SetorCreate, SetorUpdate, SetorOut
from services.setor_service import SetorService
from typing import List

router = APIRouter(prefix="/setores")

@router.post("/", response_model=SetorOut)
def create_setor(setor: SetorCreate, db: AsyncSession = Depends(get_session)):
    return SetorService.create_setor(db, setor)

@router.get("/", response_model=List[SetorOut])
def get_setores(db: AsyncSession = Depends(get_session)):
    return SetorService.get_setores(db)

@router.get("/{setor_id}", response_model=SetorOut)
def get_setor_by_id(setor_id: int, db: AsyncSession = Depends(get_session)):
    setor = SetorService.get_setor_by_id(db, setor_id)
    if not setor:
        raise HTTPException(status_code=404, detail="Setor não encontrado")
    return setor

@router.put("/{setor_id}", response_model=SetorOut)
def update_setor(setor_id: int, setor: SetorUpdate, db: AsyncSession = Depends(get_session)):
    updated_setor = SetorService.update_setor(db, setor_id, setor)
    if not updated_setor:
        raise HTTPException(status_code=404, detail="Setor não encontrado")
    return updated_setor

@router.delete("/{setor_id}")
def delete_setor(setor_id: int, db: AsyncSession = Depends(get_session)):
    deleted_setor = SetorService.delete_setor(db, setor_id)
    if not deleted_setor:
        raise HTTPException(status_code=404, detail="Setor não encontrado")
    return {"message": "Setor deletado com sucesso"}