# services\export_strategy.py

from abc import ABC, abstractmethod
import pandas as pd

class ExportStrategy(ABC):
    @abstractmethod
    def export(self, df: pd.DataFrame, file_path: str):
        pass

class CSVExportStrategy(ExportStrategy):
    def export(self, df: pd.DataFrame, file_path: str):
        # Para CSV, usar encoding='utf-8-sig' que adiciona BOM
        # Isso ajuda o Excel a reconhecer UTF-8 automaticamente ao abrir o CSV
        df.to_csv(file_path, index=False, sep=';', encoding='utf-8-sig')

class XLSXExportStrategy(ExportStrategy):
    def export(self, df: pd.DataFrame, file_path: str):
        with pd.ExcelWriter(file_path, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Relatorio Items')
            worksheet = writer.sheets['Relatorio Items']
            # col_widths = [15, 30, 40, 15, 20] # Remova ou ajuste esta linha se não for mais útil
            # Para XLSX, openpyxl já lida bem com UTF-8, mas ajustes de largura são bons.
            for col in worksheet.columns:
                max_length = 0
                column = [cell for cell in col] # Garante que 'column' é uma lista iterável de células
                try:
                    max_length = max(len(str(cell.value)) for cell in column)
                except ValueError: # Trata caso de coluna vazia ou com valores não-str
                    pass
                # Ajuste para uma largura mínima razoável
                adjusted_width = max(len(str(column[0].value)) if column and column[0].value else 10, max_length + 2)
                worksheet.column_dimensions[column[0].column_letter].width = adjusted_width