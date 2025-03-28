# utils/relatorio_itens.py

import os
import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from fastapi import HTTPException
from models.item import Item
from models.categoria import Categoria
from utils.normalizar_texto import normalize_name
from services.categoria_service import CategoriaService

# Configuração do caminho de relatórios
def get_pasta_relatorios():
    return os.getenv("PASTA_RELATORIOS", r"C:\Users\Victor\Desktop\projeto_almoxarifado\relatorios")

os.makedirs(get_pasta_relatorios(), exist_ok=True)

def gerar_dataframe_itens(dados):
    """
    Cria um DataFrame a partir dos dados obtidos na consulta.
    """
    df = pd.DataFrame(dados)

    if not df.empty:
        # Formatar os nomes dos produtos e marcas
        df['Produto'] = (
            df['Produto']
            .str.title()
            .str.replace(r"([a-z])([A-Z])", r"\1 \2", regex=True)
        )
        df['Marca'] = df['Marca'].str.title()

        # Formatar data (se existir)
        if 'Data_Validade' in df.columns:
            df['Data_Validade'] = pd.to_datetime(df['Data_Validade']).dt.strftime('%d/%m/%Y')

    return df


def salvar_relatorio(df, formato):
    arquivo_nome = f"relatorio_quantidade_itens.{formato}"
    caminho_arquivo = os.path.join(get_pasta_relatorios(), arquivo_nome)

    try:
        if formato == "csv":
            df.to_csv(caminho_arquivo, index=False, sep=';', encoding='utf-8')
        elif formato == "xlsx":
            with pd.ExcelWriter(caminho_arquivo, engine='openpyxl') as writer:
                df.to_excel(writer, index=False, sheet_name='Relatório Itens')
                worksheet = writer.sheets['Relatório Itens']
                for col in worksheet.columns:
                    max_length = max(len(str(cell.value)) for cell in col)
                    adjusted_width = max(15, max_length + 2)
                    worksheet.column_dimensions[col[0].column_letter].width = adjusted_width
        else:
            raise ValueError("Formato inválido. Use: csv ou xlsx")
        return caminho_arquivo
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao salvar relatório: {str(e)}")

async def gerar_relatorio_quantidade_itens(session: AsyncSession, filtro_categoria: str = None, filtro_produto: str = None, formato: str = "csv"):
    try:
        query = select(
            Item.categoria_id.label("ID_Categoria"),
            Categoria.nome_categoria.label("Nome_Categoria"),
            Item.nome_item.label("Produto"),
            Item.quantidade_item.label("Quantidade"),
            Item.marca_item.label("Marca"),
            Item.data_validade_item.label("Data_Validade")
        ).join(Categoria, Item.categoria_id == Categoria.categoria_id)

        if filtro_categoria:
            filtro_normalizado = normalize_name(filtro_categoria)
            categorias = await CategoriaService.get_categorias_like(session, filtro_normalizado)
            if categorias:
                categoria_ids = [c.categoria_id for c in categorias]
                query = query.where(Item.categoria_id.in_(categoria_ids))

        if filtro_produto:
            produto_normalizado = normalize_name(filtro_produto)
            query = query.where(Item.nome_item.ilike(f"%{produto_normalizado}%"))

        result = await session.execute(query)
        dados = result.mappings().all()

        df = gerar_dataframe_itens(dados)
        caminho_arquivo = salvar_relatorio(df, formato)
        return caminho_arquivo

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar relatório: {str(e)}")

