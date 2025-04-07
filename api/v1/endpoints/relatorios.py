#api\v1\endpoints\relatorios.py

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import get_session
from services.relatorio_service import RelatorioService
from fastapi.responses import FileResponse
from datetime import datetime
import os

router = APIRouter()

@router.get("/relatorios/quantidade-itens/")
async def gerar_relatorio(
    filtro_categoria: str = Query(None, description="Filtrar por categoria"),
    filtro_produto: str = Query(None, description="Filtrar por produto"),
    formato: str = Query("csv", description="Formato do relatório (csv, xlsx)"),
    db: AsyncSession = Depends(get_session)
):
    try:
        # Garanta que o RelatorioService retorna o caminho do arquivo
        caminho_arquivo = await RelatorioService.gerar_relatorio_quantidade_itens(
            db, filtro_categoria, filtro_produto, formato
        )

        if not caminho_arquivo or not os.path.exists(str(caminho_arquivo)):
            raise HTTPException(
                status_code=404,
                detail="Arquivo de relatório não foi gerado corretamente"
            )

        return FileResponse(
            path=str(caminho_arquivo),
            filename=os.path.basename(str(caminho_arquivo)),
            media_type="application/octet-stream"
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao processar requisição: {str(e)}"
        )
    
@router.get("/relatorios/entrada-itens/")
async def gerar_relatorio_entrada(
    data_inicio: datetime = Query(..., description="Data inicial (YYYY-MM-DD)"),
    data_fim: datetime = Query(..., description="Data final (YYYY-MM-DD)"),
    formato: str = Query("csv", description="Formato do relatório (csv, xlsx)"),
    db: AsyncSession = Depends(get_session)
):
    try:
        caminho_arquivo = await RelatorioService.gerar_relatorio_entrada_itens(
            db, data_inicio, data_fim, formato
        )
        
        # Verificar se o arquivo foi gerado
        if not caminho_arquivo or not os.path.exists(str(caminho_arquivo)):
            raise HTTPException(
                status_code=404,
                detail="Arquivo de relatório não foi gerado corretamente"
            )

        # Retornar o arquivo gerado
        return FileResponse(
            path=str(caminho_arquivo),
            filename=os.path.basename(str(caminho_arquivo)),
            media_type="application/octet-stream"
        )
    
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao processar requisição: {str(e)}"
        )
    
    
@router.get("/relatorios/retiradas-setor/")
async def gerar_relatorio_retiradas_setor(
    setor_id: int = Query(..., description="ID do Setor"),
    data_inicio: datetime = Query(..., description="Data inicial (YYYY-MM-DD)"),
    data_fim: datetime = Query(..., description="Data final (YYYY-MM-DD)"),
    formato: str = Query("csv", description="Formato do relatório (csv, xlsx)"),
    db: AsyncSession = Depends(get_session)
):
    try:
        caminho_arquivo = await RelatorioService.gerar_relatorio_retiradas_setor(
            db, setor_id, data_inicio, data_fim, formato
        )

        # se o caminho é válido
        if not caminho_arquivo or not os.path.exists(str(caminho_arquivo)):
            raise HTTPException(
                status_code=404,
                detail="Arquivo de relatório não foi gerado corretamente"
            )

        return FileResponse(
            path=str(caminho_arquivo),
            filename=os.path.basename(str(caminho_arquivo)),
            media_type="application/octet-stream"
        )

    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

@router.get('/relatorios/retiradas-usuario/')
async def gerar_relatorio_retiradas_usuario(
    usuario_id: int = Query(..., description="ID do usuário"),
    data_inicio: datetime = Query(..., description="Data inicial (YYYY-MM-DD)"),
    data_fim: datetime = Query(..., description="Data final (YYYY-MM-DD)"),
    formato: str = Query('csv', description="Formato do relatório (csv, xlsx)"),
    db: AsyncSession = Depends(get_session),
):
    try:
        caminho = await RelatorioService.gerar_relatorio_retiradas_usuario(
            db, usuario_id, data_inicio, data_fim, formato
        )
        
        return FileResponse(
            path=caminho,
            filename=os.path.basename(caminho),
            media_type="application/octet-stream"
        )
    
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao processar requisição: {str(e)}"
        )