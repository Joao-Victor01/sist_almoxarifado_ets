#utils\relatorio_itens.py

import os
import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from fastapi import HTTPException
from core.configs import Settings
from models.item import Item
from models.categoria import Categoria
from utils.normalizar_texto import normalize_name
from services.categoria_service import CategoriaService
from services.export_strategy import CSVExportStrategy, XLSXExportStrategy


PASTA_RELATORIOS = Settings.PASTA_RELATORIOS

def get_pasta_relatorios():
    return os.getenv("PASTA_RELATORIOS", r"C:\Users\Victor\Desktop\projeto_almoxarifado\relatorios")

os.makedirs(get_pasta_relatorios(), exist_ok=True)

def gerar_dataframe_items(dados):
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
        if 'Marca' in df.columns:
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
                df.to_excel(writer, index=False, sheet_name='Relatorio Items')  
                worksheet = writer.sheets['Relatorio Items']  
                for col in worksheet.columns:  
                    max_length = max(len(str(cell.value)) for cell in col)  
                    adjusted_width = max(15, max_length + 2)  
                    worksheet.column_dimensions[col[0].column_letter].width = adjusted_width  
        else:  
            raise ValueError("Formato inválido. Use: csv ou xlsx")  
        return caminho_arquivo  
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao salvar relatorio: {str(e)}")

@staticmethod
async def gerar_relatorio_quantidade_itens(
    session: AsyncSession,
    filtro_categoria: str = None,
    filtro_produto: str = None,
    formato: str = "csv"
):
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
            categorias = await CategoriaService.get_categorias_like(session, filtro_categoria)
            categoria_ids = [c.categoria_id for c in categorias]
            if categoria_ids:
                query = query.where(Item.categoria_id.in_(categoria_ids))
            else:
                # Retorna um DataFrame vazio com as colunas corretas
                return pd.DataFrame(columns=["ID_Categoria", "Nome_Categoria", "Produto", "Quantidade", "Marca", "Data_Validade"])

        if filtro_produto:
            produto_normalizado = normalize_name(filtro_produto)
            query = query.where(Item.nome_item.ilike(f"%{produto_normalizado}%"))

        result = await session.execute(query)
        dados = result.mappings().all()

        # Gera um DataFrame mesmo se os dados estiverem vazios
        df = pd.DataFrame(dados, columns=["ID_Categoria", "Nome_Categoria", "Produto", "Quantidade", "Marca", "Data_Validade"])

        if not df.empty:
            df['Produto'] = df['Produto'].str.title().str.replace(r"([a-z])([A-Z])", r"\1 \2", regex=True)
            if 'Marca' in df.columns:
                df['Marca'] = df['Marca'].str.title()
            if 'Data_Validade' in df.columns:
                df['Data_Validade'] = pd.to_datetime(df['Data_Validade']).dt.strftime('%d/%m/%Y')

        caminho_arquivo = os.path.join(PASTA_RELATORIOS, f"relatorio_quantidade_itens.{formato}")

        if formato == "csv":
            export_strategy = CSVExportStrategy()
        elif formato == "xlsx":
            export_strategy = XLSXExportStrategy()
        else:
            raise HTTPException(
                status_code=400,
                detail="Formato inválido. Use: csv ou xlsx"
            )
        export_strategy.export(df, caminho_arquivo)

        return caminho_arquivo

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao gerar relatório: {str(e)}"
        )
