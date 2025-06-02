# services/item/validator.py

from fastapi import HTTPException, status
from schemas.item import ItemCreate, ItemUpdate


class ItemValidator:
    @staticmethod
    def validate_on_create(item_data: ItemCreate) -> None:
        missing_fields = []

        if not item_data.nome_item or not item_data.nome_item.strip():
            missing_fields.append("nome_item")
        if not item_data.descricao_item or not item_data.descricao_item.strip():
            missing_fields.append("descricao_item")
        if not item_data.unidade_medida_item or not item_data.unidade_medida_item.strip():
            missing_fields.append("unidade_medida_item")
        if item_data.quantidade_item is None or item_data.quantidade_item <= 0:
            missing_fields.append("quantidade_item (deve ser maior que zero)")
        if item_data.categoria_id is None:
            missing_fields.append("categoria_id")

        if missing_fields:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Campos obrigatórios ausentes ou inválidos: {', '.join(missing_fields)}",
            )

    @staticmethod
    def validate_on_update(item_data: ItemUpdate) -> None:
        # Em update, só validamos se vierem campos específicos
        if item_data.quantidade_item is not None and item_data.quantidade_item <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="quantidade_item (deve ser maior que zero)",
            )

        # Se vier nome_item, verifica não vir vazio
        if item_data.nome_item is not None and not item_data.nome_item.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="nome_item não pode ser vazio",
            )