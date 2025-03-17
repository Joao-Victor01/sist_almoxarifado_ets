import unicodedata
import re

def normalize_name(name: str) -> str:
    """Normaliza o nome do item removendo acentos (exceto 'ç'), caracteres especiais e espaços."""
    if not name:
        return ""

    # Mantém apenas caracteres alfanuméricos e 'ç', removendo acentos de outras letras
    name = unicodedata.normalize('NFKD', name)  # Separa letras de acentos
    name = ''.join(char for char in name if char.isalnum() or char in "çÇ")  # Remove caracteres especiais, mantendo 'ç'

    # Converte para uppercase e remove espaços
    return name.upper()