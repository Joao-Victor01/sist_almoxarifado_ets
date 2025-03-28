#services\export_strategy.py

from abc import ABC, abstractmethod
import pandas as pd

class ExportStrategy(ABC):
    @abstractmethod
    def export(self, df: pd.DataFrame, file_path: str):
        pass

class CSVExportStrategy(ExportStrategy):
    def export(self, df: pd.DataFrame, file_path: str):
        df.to_csv(file_path, index=False, sep=';', encoding='utf-8')

class XLSXExportStrategy(ExportStrategy):
    def export(self, df: pd.DataFrame, file_path: str):
        with pd.ExcelWriter(file_path, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Relatório Itens')
            worksheet = writer.sheets['Relatório Itens']
            col_widths = [15, 30, 40, 15, 20]  # Ajuste para XLSX
            for i, column in enumerate(worksheet.columns):
                max_length = max(len(str(cell.value)) for cell in column)
                adjusted_width = max(col_widths[i], max_length + 2)
                worksheet.column_dimensions[column[0].column_letter].width = adjusted_width
