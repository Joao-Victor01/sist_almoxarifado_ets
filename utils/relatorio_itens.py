from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import pandas as pd
from models.item import Item
from utils.normalizar_texto import normalize_name
import os
from fastapi.responses import FileResponse

# Caminho fixo para salvar os relatórios
PASTA_RELATORIOS = r"C:\Users\Victor\Desktop\projeto_almoxarifado\relatorios"

# Garante que a pasta de relatórios existe
os.makedirs(PASTA_RELATORIOS, exist_ok=True)

async def gerar_relatorio_quantidade_itens(session: AsyncSession, filtro_categoria: str = None, filtro_produto: str = None, formato: str = "csv"):
    query = select(Item.categoria_id, Item.nome_item, Item.quantidade_item)

    # Aplicar filtros
    if filtro_categoria:
        filtro_categoria_normalizado = normalize_name(filtro_categoria)
        query = query.filter(Item.categoria == filtro_categoria_normalizado)
        
    if filtro_produto:
        filtro_produto_normalizado = normalize_name(filtro_produto)
        query = query.filter(Item.nome_item == filtro_produto_normalizado)

    result = await session.execute(query)
    dados = result.all()  

    df = pd.DataFrame(dados, columns=["Categoria", "Produto", "Quantidade"])

    # Nome do arquivo e caminho completo
    arquivo_nome = f"relatorio_quantidade_itens.{formato}"
    caminho_arquivo = os.path.join(PASTA_RELATORIOS, arquivo_nome)

    # Gerar arquivo no formato correto
    if formato == "csv":
        df.to_csv(caminho_arquivo, index=False)
    elif formato == "excel":
        df.to_excel(caminho_arquivo, index=False)
    elif formato == "pdf":
        from fpdf import FPDF
        pdf = FPDF()
        pdf.add_page()
        pdf.set_font("Arial", size=12)
        for _, row in df.iterrows():
            pdf.cell(200, 10, txt=f"{row['Categoria']} - {row['Produto']}: {row['Quantidade']}", ln=True)
        pdf.output(caminho_arquivo)

    return caminho_arquivo
