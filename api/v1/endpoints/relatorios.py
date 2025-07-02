from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.responses import FileResponse
from datetime import datetime
import os
from core.database import get_session
from services.relatorio_service import RelatorioService
from core.security import direcao_ou_almoxarifado
from utils.logger import logger

router = APIRouter()


@router.get("/relatorios/quantidade-itens/")
async def gerar_relatorio_quantidade(
    filtro_categoria: str = Query(None),
    filtro_produto: str = Query(None),
    formato: str = Query("csv"),
    db: AsyncSession = Depends(get_session),
    current_user=Depends(direcao_ou_almoxarifado)
):
    try:
        logger.info(
            f"Usuário {current_user.usuario_id} solicitou relatório quantidade-itens "
            f"(categoria={filtro_categoria}, produto={filtro_produto}, formato={formato})"
        )
        caminho = await RelatorioService.gerar_relatorio_quantidade_itens(
            db, filtro_categoria, filtro_produto, formato
        )
        if not caminho or not os.path.exists(str(caminho)):
            logger.warning("Arquivo de relatório quantidade-itens não encontrado após geração")
            raise HTTPException(status_code=404, detail="Relatório não gerado")
        logger.info(f"Relatório quantidade-itens gerado em: {caminho}")
        return FileResponse(
            path=str(caminho),
            filename=os.path.basename(str(caminho)),
            media_type="application/octet-stream"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao gerar relatório quantidade-itens: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro ao gerar relatório")


@router.get("/relatorios/entrada-itens/")
async def gerar_relatorio_entrada(
    data_inicio: datetime = Query(...),
    data_fim: datetime = Query(...),
    formato: str = Query("csv"),
    db: AsyncSession = Depends(get_session),
    current_user=Depends(direcao_ou_almoxarifado)
):
    try:
        logger.info(
            f"Usuário {current_user.usuario_id} solicitou relatório entrada-itens "
            f"(de={data_inicio.date()}, até={data_fim.date()}, formato={formato})"
        )
        caminho = await RelatorioService.gerar_relatorio_entrada_itens(
            db, data_inicio, data_fim, formato
        )
        if not caminho or not os.path.exists(str(caminho)):
            logger.warning("Arquivo de relatório entrada-itens não encontrado após geração")
            raise HTTPException(status_code=404, detail="Relatório não gerado")
        logger.info(f"Relatório entrada-itens gerado em: {caminho}")
        return FileResponse(
            path=str(caminho),
            filename=os.path.basename(str(caminho)),
            media_type="application/octet-stream"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao gerar relatório entrada-itens: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro ao gerar relatório")



@router.get("/relatorios/retiradas-setor/")
async def gerar_relatorio_retiradas_setor(
    setor_id: int = Query(...),
    data_inicio: datetime = Query(...),
    data_fim: datetime = Query(...),
    formato: str = Query("csv"),
    db: AsyncSession = Depends(get_session),
    current_user=Depends(direcao_ou_almoxarifado)
):
    try:
        logger.info(
            f"Usuário {current_user.usuario_id} solicitou relatório retiradas-setor "
            f"(setor_id={setor_id}, de={data_inicio.date()}, até={data_fim.date()}, formato={formato})"
        )
        caminho = await RelatorioService.gerar_relatorio_retiradas_setor(
            db, setor_id, data_inicio, data_fim, formato
        )
        if not caminho or not os.path.exists(str(caminho)):
            logger.warning("Arquivo de relatório retiradas-setor não encontrado após geração")
            raise HTTPException(status_code=404, detail="Relatório não gerado")
        logger.info(f"Relatório retiradas-setor gerado em: {caminho}")
        return FileResponse(path=str(caminho), filename=os.path.basename(str(caminho)), media_type="application/octet-stream")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao gerar relatório retiradas-setor: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro ao gerar relatório")


@router.get("/relatorios/retiradas-usuario/")
async def gerar_relatorio_retiradas_usuario(
    usuario_id: int = Query(...),
    data_inicio: datetime = Query(...),
    data_fim: datetime = Query(...),
    formato: str = Query("csv"),
    db: AsyncSession = Depends(get_session),
    current_user=Depends(direcao_ou_almoxarifado)
):
    try:
        logger.info(
            f"Usuário {current_user.usuario_id} solicitou relatório retiradas-usuario "
            f"(usuario_id={usuario_id}, de={data_inicio.date()}, até={data_fim.date()}, formato={formato})"
        )
        caminho = await RelatorioService.gerar_relatorio_retiradas_usuario(
            db, usuario_id, data_inicio, data_fim, formato
        )
        if not caminho or not os.path.exists(str(caminho)):
            logger.warning("Arquivo de relatório retiradas-usuario não encontrado após geração")
            raise HTTPException(status_code=404, detail="Relatório não gerado")
        logger.info(f"Relatório retiradas-usuario gerado em: {caminho}")
        return FileResponse(path=str(caminho), filename=os.path.basename(str(caminho)), media_type="application/octet-stream")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao gerar relatório retiradas-usuario: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro ao gerar relatório")
