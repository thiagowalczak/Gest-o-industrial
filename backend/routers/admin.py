from __future__ import annotations
import io
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from db.local_db import get_db, Usuario
from routers.auth import get_usuario_atual
from services.excel_utils import gerar_modelo_excel

router = APIRouter(prefix="/admin", tags=["Administração"])

EXCEL_MEDIA_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

MODELOS = {
    "financeiro": {
        "arquivo": "modelo-financeiro.xlsx",
        "colunas": [
            "Número do Título", "Código (Cliente/Fornecedor)", "Nome (Cliente/Fornecedor)",
            "Data de Emissão", "Data de Vencimento", "Valor", "Saldo",
        ],
        "exemplos": [
            ["NF-1001", "00123", "Empresa Exemplo Ltda", "01/06/2026", "30/06/2026", 1500.00, 1500.00],
        ],
    },
    "estoque": {
        "arquivo": "modelo-estoque.xlsx",
        "colunas": [
            "Código do Produto", "Descrição do Produto", "Depósito", "Quantidade",
            "Custo Unitário", "Unidade", "Grupo", "Estoque Mínimo", "Ponto de Reposição",
        ],
        "exemplos": [
            ["MAT-001", "Parafuso sextavado M8", "01", 500, 0.35, "UN", "Matéria-Prima", 100, 150],
        ],
    },
    "producao": {
        "arquivo": "modelo-producao.xlsx",
        "colunas": [
            "Número da Ordem", "Item", "Código do Produto", "Descrição do Produto",
            "Quantidade Prevista", "Quantidade Produzida", "Data Início", "Data Término", "Situação",
        ],
        "exemplos": [
            ["OP-2026-001", "01", "PROD-100", "Suporte metálico tipo A", 1000, 0, "10/06/2026", "20/06/2026", "A"],
        ],
    },
    "compras": {
        "arquivo": "modelo-compras.xlsx",
        "colunas": [
            "Número do Pedido", "Item", "Código do Produto", "Descrição do Produto",
            "Quantidade", "Preço Unitário", "Valor Total", "Data de Entrega",
            "Código do Fornecedor", "Nome do Fornecedor",
        ],
        "exemplos": [
            ["PC-2026-001", "01", "MAT-001", "Parafuso sextavado M8", 1000, 0.35, 350.00, "25/06/2026", "00456", "Fornecedor Exemplo Ltda"],
        ],
    },
}


@router.get("/modelo/{tipo}")
def baixar_modelo(tipo: str, db: Session = Depends(get_db), usuario: Usuario = Depends(get_usuario_atual)):
    config = MODELOS.get(tipo)
    if not config:
        raise HTTPException(404, "Modelo não encontrado")

    conteudo = gerar_modelo_excel(config["colunas"], config["exemplos"])
    return StreamingResponse(
        io.BytesIO(conteudo),
        media_type=EXCEL_MEDIA_TYPE,
        headers={"Content-Disposition": f'attachment; filename="{config["arquivo"]}"'},
    )
