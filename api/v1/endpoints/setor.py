#api\v1\endpoints\setor.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import get_session
from schemas.setor import SetorCreate, SetorUpdate, SetorOut
from services.setor_service import SetorService
from typing import List
from fastapi import status
from core.security import usuario_direcao, todos_usuarios

router = APIRouter(prefix="/setores")

#post setor
@router.post("/", response_model=SetorOut, status_code=status.HTTP_201_CREATED)
async def create_setor(setor: SetorCreate, 
                       db: AsyncSession = Depends(get_session), 
                       current_user=Depends(usuario_direcao)):
    novo_setor = await SetorService.create_setor(db, setor)  
    return novo_setor

#get setores
@router.get("/", response_model=List[SetorOut], status_code=status.HTTP_200_OK,)
async def get_setores(db: AsyncSession = Depends(get_session), 
                      current_user=Depends(todos_usuarios)):
    setores = await SetorService.get_setores(db) 
    return setores

#get setor pelo id
@router.get("/{setor_id}", response_model=SetorOut, status_code=status.HTTP_200_OK)
async def get_setor_by_id(setor_id: int, 
                          db: AsyncSession = Depends(get_session),
                          current_user=Depends(todos_usuarios)):
    setor = await SetorService.get_setor_by_id(db, setor_id)
    if not setor:
        raise HTTPException(status_code=404, detail="Setor não encontrado")
    return setor

#put setor - atualizar setor por ID 
@router.put("/{setor_id}", response_model=SetorOut, status_code=status.HTTP_200_OK)
async def update_setor(setor_id: int, 
                       setor: SetorUpdate, 
                       db: AsyncSession = Depends(get_session),
                       current_user=Depends(usuario_direcao)):
    updated_setor = await SetorService.update_setor(db, setor_id, setor)
    if not updated_setor:
        raise HTTPException(status_code=404, detail="Setor não encontrado")
    return updated_setor

#deletar setor
@router.delete("/{setor_id}", status_code=status.HTTP_200_OK)
async def delete_setor(setor_id: int, 
                       db: AsyncSession = Depends(get_session),
                       current_user=Depends(usuario_direcao)):
    deleted_setor = await SetorService.delete_setor(db, setor_id)
    if not deleted_setor:
        raise HTTPException(status_code=404, detail="Setor não encontrado")
    return {"message": "Setor deletado com sucesso"}