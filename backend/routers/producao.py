from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from db.local_db import get_db, Usuario, OrdemProducao, PedidoCompra
from routers.auth import get_usuario_atual
from services.dados_service import (
    listar_producao, ordem_producao_dict, SITUACOES_PRODUCAO,
    listar_compras, pedido_compra_dict, aplicar_compra_no_estoque_e_financeiro,
)
from services.excel_utils import ler_linhas, converter_data

router = APIRouter(prefix="/producao", tags=["Produção"])

SITUACOES = SITUACOES_PRODUCAO


class OrdemProducaoBody(BaseModel):
    numero: str
    item: str = "01"
    produto: Optional[str] = None
    descricao: Optional[str] = None
    quantidade_prevista: float = 0
    quantidade_produzida: float = 0
    data_inicio: Optional[str] = None
    data_fim: Optional[str] = None
    situacao: str = "A"


class PedidoCompraBody(BaseModel):
    numero: str
    item: str = "01"
    produto: Optional[str] = None
    descricao: Optional[str] = None
    quantidade: float = 0
    preco_unitario: float = 0
    valor_total: Optional[float] = None
    data_entrega: Optional[str] = None
    fornecedor: Optional[str] = None
    nome_fornecedor: Optional[str] = None


MAPA_COLUNAS_PRODUCAO = {
    "numero": "numero",
    "numero da ordem": "numero",
    "ordem": "numero",
    "item": "item",
    "codigo do produto": "produto",
    "produto": "produto",
    "descricao": "descricao",
    "descricao do produto": "descricao",
    "quantidade prevista": "quantidade_prevista",
    "qtd prevista": "quantidade_prevista",
    "quantidade produzida": "quantidade_produzida",
    "qtd produzida": "quantidade_produzida",
    "data de inicio": "data_inicio",
    "data inicio": "data_inicio",
    "data de termino": "data_fim",
    "data de fim": "data_fim",
    "data fim": "data_fim",
    "situacao": "situacao",
    "status": "situacao",
}

MAPA_COLUNAS_COMPRAS = {
    "numero do pedido": "numero",
    "numero": "numero",
    "pedido": "numero",
    "item": "item",
    "codigo do produto": "produto",
    "produto": "produto",
    "descricao do produto": "descricao",
    "descricao": "descricao",
    "quantidade": "quantidade",
    "qtd": "quantidade",
    "preco unitario": "preco_unitario",
    "preco": "preco_unitario",
    "valor unitario": "preco_unitario",
    "valor total": "valor_total",
    "total": "valor_total",
    "data de entrega": "data_entrega",
    "data entrega": "data_entrega",
    "entrega": "data_entrega",
    "codigo do fornecedor": "fornecedor",
    "fornecedor": "fornecedor",
    "nome do fornecedor": "nome_fornecedor",
    "razao social": "nome_fornecedor",
}


# ── ORDENS DE PRODUÇÃO ───────────────────────────────────────────────────────
@router.get("/ordens")
def ordens(usuario: Usuario = Depends(get_usuario_atual), db: Session = Depends(get_db)):
    ordens = listar_producao(db, usuario.empresa_id)
    return {"ordens": [ordem_producao_dict(o) for o in ordens], "total": len(ordens)}


@router.get("/resumo")
def resumo(usuario: Usuario = Depends(get_usuario_atual), db: Session = Depends(get_db)):
    ordens = listar_producao(db, usuario.empresa_id)
    por_situacao = {}
    for o in ordens:
        sit = SITUACOES.get((o.situacao or "").strip(), "Outro")
        por_situacao[sit] = por_situacao.get(sit, 0) + 1

    total_previsto = sum(o.quantidade_prevista or 0 for o in ordens)
    total_produzido = sum(o.quantidade_produzida or 0 for o in ordens)

    return {
        "por_situacao": por_situacao,
        "total_ordens": len(ordens),
        "total_previsto": total_previsto,
        "total_produzido": total_produzido,
        "eficiencia": round((total_produzido / total_previsto * 100) if total_previsto > 0 else 0, 1),
    }


@router.post("/ordens", status_code=201)
def criar_ordem(body: OrdemProducaoBody, db: Session = Depends(get_db), usuario: Usuario = Depends(get_usuario_atual)):
    ordem = OrdemProducao(empresa_id=usuario.empresa_id, **body.dict())
    db.add(ordem)
    db.commit()
    db.refresh(ordem)
    return ordem_producao_dict(ordem)


@router.put("/ordens/{ordem_id}")
def atualizar_ordem(ordem_id: int, body: OrdemProducaoBody, db: Session = Depends(get_db), usuario: Usuario = Depends(get_usuario_atual)):
    ordem = db.query(OrdemProducao).filter(OrdemProducao.id == ordem_id, OrdemProducao.empresa_id == usuario.empresa_id).first()
    if not ordem:
        raise HTTPException(404, "Ordem não encontrada")
    for campo, valor in body.dict().items():
        setattr(ordem, campo, valor)
    db.commit()
    return ordem_producao_dict(ordem)


@router.delete("/ordens/{ordem_id}")
def remover_ordem(ordem_id: int, db: Session = Depends(get_db), usuario: Usuario = Depends(get_usuario_atual)):
    ordem = db.query(OrdemProducao).filter(OrdemProducao.id == ordem_id, OrdemProducao.empresa_id == usuario.empresa_id).first()
    if not ordem:
        raise HTTPException(404, "Ordem não encontrada")
    db.delete(ordem)
    db.commit()
    return {"mensagem": "Ordem removida"}


@router.post("/ordens/importar-excel")
async def importar_ordens_excel(file: UploadFile = File(...), db: Session = Depends(get_db), usuario: Usuario = Depends(get_usuario_atual)):
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(400, "Envie um arquivo Excel (.xlsx)")

    conteudo = await file.read()
    linhas = ler_linhas(conteudo, MAPA_COLUNAS_PRODUCAO)

    criados = 0
    for linha in linhas:
        numero = str(linha.get("numero") or "").strip()
        if not numero:
            continue
        db.add(OrdemProducao(
            empresa_id=usuario.empresa_id,
            numero=numero,
            item=str(linha.get("item") or "01").strip().zfill(2),
            produto=str(linha.get("produto") or "").strip(),
            descricao=str(linha.get("descricao") or "").strip(),
            quantidade_prevista=float(linha.get("quantidade_prevista") or 0),
            quantidade_produzida=float(linha.get("quantidade_produzida") or 0),
            data_inicio=converter_data(linha.get("data_inicio")),
            data_fim=converter_data(linha.get("data_fim")),
            situacao=str(linha.get("situacao") or "A").strip()[:1].upper() or "A",
        ))
        criados += 1

    db.commit()
    return {"criados": criados, "total_linhas": len(linhas)}


# ── PEDIDOS DE COMPRA ─────────────────────────────────────────────────────────
@router.get("/compras")
def pedidos_compra(usuario: Usuario = Depends(get_usuario_atual), db: Session = Depends(get_db)):
    pedidos = listar_compras(db, usuario.empresa_id)
    return {"pedidos": [pedido_compra_dict(p) for p in pedidos], "total": len(pedidos)}


@router.get("/compras/status")
def status_compras(usuario: Usuario = Depends(get_usuario_atual), db: Session = Depends(get_db)):
    pedidos = listar_compras(db, usuario.empresa_id)
    ultimo = (
        db.query(PedidoCompra)
        .filter(PedidoCompra.empresa_id == usuario.empresa_id)
        .order_by(PedidoCompra.criado_em.desc())
        .first()
    )
    return {
        "total_pedidos": len(pedidos),
        "atualizado_em": ultimo.criado_em.isoformat() if ultimo else None,
    }


@router.post("/compras", status_code=201)
def criar_pedido_compra(body: PedidoCompraBody, db: Session = Depends(get_db), usuario: Usuario = Depends(get_usuario_atual)):
    dados = body.dict()
    if dados.get("valor_total") in (None, 0):
        dados["valor_total"] = round((dados.get("quantidade") or 0) * (dados.get("preco_unitario") or 0), 2)
    pedido = PedidoCompra(empresa_id=usuario.empresa_id, **dados)
    db.add(pedido)
    db.commit()
    db.refresh(pedido)

    aplicar_compra_no_estoque_e_financeiro(db, usuario.empresa_id, pedido)
    db.commit()

    return pedido_compra_dict(pedido)


@router.put("/compras/{pedido_id}")
def atualizar_pedido_compra(pedido_id: int, body: PedidoCompraBody, db: Session = Depends(get_db), usuario: Usuario = Depends(get_usuario_atual)):
    pedido = db.query(PedidoCompra).filter(PedidoCompra.id == pedido_id, PedidoCompra.empresa_id == usuario.empresa_id).first()
    if not pedido:
        raise HTTPException(404, "Pedido não encontrado")
    dados = body.dict()
    if dados.get("valor_total") in (None, 0):
        dados["valor_total"] = round((dados.get("quantidade") or 0) * (dados.get("preco_unitario") or 0), 2)
    for campo, valor in dados.items():
        setattr(pedido, campo, valor)
    db.commit()
    return pedido_compra_dict(pedido)


@router.delete("/compras/{pedido_id}")
def remover_pedido_compra(pedido_id: int, db: Session = Depends(get_db), usuario: Usuario = Depends(get_usuario_atual)):
    pedido = db.query(PedidoCompra).filter(PedidoCompra.id == pedido_id, PedidoCompra.empresa_id == usuario.empresa_id).first()
    if not pedido:
        raise HTTPException(404, "Pedido não encontrado")
    db.delete(pedido)
    db.commit()
    return {"mensagem": "Pedido removido"}


@router.post("/compras/importar-excel")
async def importar_compras_excel(file: UploadFile = File(...), db: Session = Depends(get_db), usuario: Usuario = Depends(get_usuario_atual)):
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(400, "Envie um arquivo Excel (.xlsx)")

    conteudo = await file.read()
    linhas = ler_linhas(conteudo, MAPA_COLUNAS_COMPRAS)

    criados = 0
    for linha in linhas:
        numero = str(linha.get("numero") or "").strip()
        if not numero:
            continue
        quantidade = float(linha.get("quantidade") or 0)
        preco_unitario = float(linha.get("preco_unitario") or 0)
        valor_total = linha.get("valor_total")
        valor_total = float(valor_total) if valor_total not in (None, "") else round(quantidade * preco_unitario, 2)

        pedido = PedidoCompra(
            empresa_id=usuario.empresa_id,
            numero=numero,
            item=str(linha.get("item") or "01").strip().zfill(2),
            produto=str(linha.get("produto") or "").strip(),
            descricao=str(linha.get("descricao") or "").strip(),
            quantidade=quantidade,
            preco_unitario=preco_unitario,
            valor_total=valor_total,
            data_entrega=converter_data(linha.get("data_entrega")),
            fornecedor=str(linha.get("fornecedor") or "").strip(),
            nome_fornecedor=str(linha.get("nome_fornecedor") or linha.get("fornecedor") or "").strip(),
        )
        db.add(pedido)
        aplicar_compra_no_estoque_e_financeiro(db, usuario.empresa_id, pedido)
        criados += 1

    db.commit()
    return {"criados": criados, "total_linhas": len(linhas)}
