from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import get_session
from utils.relatorio_itens import gerar_relatorio_quantidade_itens
from fastapi.responses import FileResponse

router = APIRouter()

@router.get("/relatorios/quantidade-itens/")
async def gerar_relatorio(
    filtro_categoria: str = Query(None, description="Filtrar por categoria"),
    filtro_produto: str = Query(None, description="Filtrar por produto"),
    formato: str = Query("csv", description="Formato do relatório (csv, excel, pdf)"),
    db: AsyncSession = Depends(get_session)
):
    """
    Gera o relatório de quantidade de itens, com opção de filtragem por categoria ou produto.
    O relatório pode ser exportado nos formatos CSV, Excel ou PDF.
    """

    caminho_arquivo = await gerar_relatorio_quantidade_itens(db, filtro_categoria, filtro_produto, formato)

    # Retorna o arquivo para download
    return FileResponse(path=caminho_arquivo, filename=caminho_arquivo.split("\\")[-1], media_type="application/octet-stream")
