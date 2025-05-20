#utils\relatorio_itens.py

import os
import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from core.configs import Settings
from services.categoria_service import CategoriaService
from services.export_strategy import CSVExportStrategy, XLSXExportStrategy
from services.item_service import ItemService



def get_pasta_relatorios() -> str:
    """Retorna o caminho absoluto para a pasta de relatórios"""
    return str(Settings.PASTA_RELATORIOS)

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
        # 1. Buscar categorias (se houver filtro)
        categoria_ids = []
        if filtro_categoria:
            categorias = await CategoriaService.get_categorias_like(session, filtro_categoria)
            categoria_ids = [c.categoria_id for c in categorias]

        # 2. Buscar itens com filtros usando o ItemService
        itens = await ItemService.get_itens_filtrados(
            session,
            categoria_ids=categoria_ids,
            nome_produto=filtro_produto
        )

        # 3. Gerar DataFrame formatado
        df = formatar_dataframe_relatorio(itens)

        # 4. Exportar relatório
        caminho_arquivo = os.path.join(get_pasta_relatorios(), f"relatorio_quantidade_itens.{formato}")        
        export_strategy = CSVExportStrategy() if formato == "csv" else XLSXExportStrategy()
        export_strategy.export(df, caminho_arquivo)

        return caminho_arquivo

    except HTTPException as e:
        raise e  # Repassa exceções HTTP específicas
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao gerar relatório: {str(e)}"
        )


def formatar_dados_relatorio(itens: list[tuple]):
    return [{
        "ID_Categoria": item.categoria_id,
        "Nome_Categoria": nome_categoria,  
        "Produto": item.nome_item.title(),
        "Quantidade": item.quantidade_item,
        "Data_Validade": item.data_validade_item.strftime('%d/%m/%Y') if item.data_validade_item else None
    } for item, nome_categoria in itens]  

def formatar_dataframe_relatorio(dados: list):
    if not dados:
        return pd.DataFrame(columns=["ID_Categoria", "Nome_Categoria", "Produto", "Quantidade", "Marca", "Data_Validade"])

    df = pd.DataFrame(dados)
    if not df.empty:
        df['Produto'] = df['Produto'].str.title()
        if 'Marca' in df.columns:
            df['Marca'] = df['Marca'].str.title()
        if 'Data_Validade' in df.columns:
            df['Data_Validade'] = pd.to_datetime(df['Data_Validade']).dt.strftime('%d/%m/%Y')
    return df