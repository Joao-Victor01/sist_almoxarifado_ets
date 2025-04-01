#api\v1\endpoints\relatorios.py

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import get_session
from services.relatorio_service import RelatorioService
from fastapi.responses import FileResponse
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