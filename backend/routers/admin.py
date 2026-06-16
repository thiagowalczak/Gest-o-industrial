from __future__ import annotations
import io
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from db.local_db import get_db, Usuario
from routers.auth import get_usuario_atual
from services.excel_utils import gerar_modelo_excel, gerar_csv, formatar_data_br
from services.dados_service import listar_estoque, listar_producao, listar_compras, listar_titulos_todos

router = APIRouter(prefix="/admin", tags=["Administração"])

EXCEL_MEDIA_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
CSV_MEDIA_TYPE = "text/csv; charset=utf-8"

MODELOS = {
    "financeiro": {
        "arquivo": "modelo-financeiro.xlsx",
        "colunas": [
            "Tipo", "Número do Título", "Código (Cliente/Fornecedor)", "Nome (Cliente/Fornecedor)",
            "Data de Emissão", "Data de Vencimento", "Valor", "Saldo",
        ],
        "exemplos": [
            ["receber", "NF-1001", "00123", "Cliente Exemplo Ltda", "01/06/2026", "30/06/2026", 1500.00, 1500.00],
            ["pagar", "NF-2001", "00456", "Fornecedor Exemplo Ltda", "01/06/2026", "15/06/2026", 800.00, 800.00],
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


def _csv_response(colunas: list[str], linhas: list[list], nome_arquivo: str) -> StreamingResponse:
    conteudo = gerar_csv(colunas, linhas)
    return StreamingResponse(
        io.BytesIO(conteudo),
        media_type=CSV_MEDIA_TYPE,
        headers={"Content-Disposition": f'attachment; filename="{nome_arquivo}"'},
    )


@router.get("/exportar/financeiro")
def exportar_financeiro(db: Session = Depends(get_db), usuario: Usuario = Depends(get_usuario_atual)):
    receber = listar_titulos_todos(db, usuario.empresa_id, "receber")
    pagar = listar_titulos_todos(db, usuario.empresa_id, "pagar")
    todos = receber + pagar
    todos.sort(key=lambda t: (t.vencimento or "", t.tipo))
    colunas = ["Tipo", "Número do Título", "Código (Cliente/Fornecedor)", "Nome (Cliente/Fornecedor)", "Data de Emissão", "Data de Vencimento", "Valor", "Saldo"]
    linhas = [
        [t.tipo, t.titulo, t.contraparte_codigo, t.contraparte_nome, formatar_data_br(t.emissao), formatar_data_br(t.vencimento), t.valor or 0, t.saldo or 0]
        for t in todos
    ]
    return _csv_response(colunas, linhas, "financeiro.csv")


@router.get("/exportar/estoque")
def exportar_estoque(db: Session = Depends(get_db), usuario: Usuario = Depends(get_usuario_atual)):
    itens = listar_estoque(db, usuario.empresa_id)
    colunas = ["Código do Produto", "Descrição do Produto", "Depósito", "Quantidade", "Custo Unitário", "Unidade", "Grupo", "Estoque Mínimo", "Ponto de Reposição"]
    linhas = [
        [i.codigo, i.descricao, i.deposito, i.quantidade or 0, i.custo_medio or 0, i.unidade, i.grupo, i.estoque_minimo or 0, i.ponto_reposicao or 0]
        for i in itens
    ]
    return _csv_response(colunas, linhas, "estoque.csv")


@router.get("/exportar/producao")
def exportar_producao(db: Session = Depends(get_db), usuario: Usuario = Depends(get_usuario_atual)):
    ordens = listar_producao(db, usuario.empresa_id)
    colunas = ["Número da Ordem", "Item", "Código do Produto", "Descrição do Produto", "Quantidade Prevista", "Quantidade Produzida", "Data Início", "Data Término", "Situação"]
    linhas = [
        [o.numero, o.item, o.produto, o.descricao, o.quantidade_prevista or 0, o.quantidade_produzida or 0, formatar_data_br(o.data_inicio), formatar_data_br(o.data_fim), o.situacao]
        for o in ordens
    ]
    return _csv_response(colunas, linhas, "producao.csv")


@router.get("/exportar/compras")
def exportar_compras(db: Session = Depends(get_db), usuario: Usuario = Depends(get_usuario_atual)):
    pedidos = listar_compras(db, usuario.empresa_id)
    colunas = ["Número do Pedido", "Item", "Código do Produto", "Descrição do Produto", "Quantidade", "Preço Unitário", "Valor Total", "Data de Entrega", "Código do Fornecedor", "Nome do Fornecedor"]
    linhas = [
        [p.numero, p.item, p.produto, p.descricao, p.quantidade or 0, p.preco_unitario or 0, p.valor_total or 0, formatar_data_br(p.data_entrega), p.fornecedor, p.nome_fornecedor]
        for p in pedidos
    ]
    return _csv_response(colunas, linhas, "compras.csv")
