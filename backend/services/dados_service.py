"""
Serviço central de dados do SaaS.

Cada empresa (tenant) tem seus próprios registros de estoque, pedidos de
compra, títulos financeiros e ordens de produção, todos isolados pelo
campo empresa_id. Esses dados são cadastrados manualmente pela equipe ou
importados via planilha Excel (ver routers/dados.py).
"""
from __future__ import annotations
from datetime import datetime, timedelta
from typing import List
from sqlalchemy.orm import Session

from db.local_db import ItemEstoque, PedidoCompra, TituloFinanceiro, OrdemProducao, AlertaEstoque

STATUS_FECHADOS = {"encerrado", "encerrada", "cancelado", "cancelada", "e", "c", "concluido", "concluida", "finalizado", "finalizada"}

SITUACOES_PRODUCAO = {
    "A": "Aguardando",
    "L": "Liberada",
    "P": "Em Produção",
    "E": "Encerrada",
    "C": "Cancelada",
}


# ── ESTOQUE ────────────────────────────────────────────────────────────────────
def item_estoque_dict(i: ItemEstoque) -> dict:
    return {
        "id": i.id,
        "codigo": i.codigo,
        "descricao": i.descricao,
        "deposito": i.deposito,
        "quantidade": i.quantidade or 0,
        "custo_medio": i.custo_medio or 0,
        "unidade": i.unidade,
        "grupo": i.grupo,
        "estoque_minimo": i.estoque_minimo or 0,
        "ponto_reposicao": i.ponto_reposicao or 0,
        "alerta": bool((i.estoque_minimo or 0) > 0 and (i.quantidade or 0) <= (i.estoque_minimo or 0)),
    }


def listar_estoque(db: Session, empresa_id: int) -> List[ItemEstoque]:
    return db.query(ItemEstoque).filter(ItemEstoque.empresa_id == empresa_id).order_by(ItemEstoque.descricao).all()


# ── COMPRAS ────────────────────────────────────────────────────────────────────
def pedido_compra_dict(p: PedidoCompra) -> dict:
    return {
        "id": p.id,
        "numero": p.numero,
        "item": p.item,
        "produto": p.produto,
        "descricao": p.descricao,
        "quantidade": p.quantidade or 0,
        "preco_unitario": p.preco_unitario or 0,
        "valor_total": p.valor_total or 0,
        "data_entrega": p.data_entrega,
        "fornecedor": p.fornecedor,
        "nome_fornecedor": p.nome_fornecedor,
        "status": p.status,
    }


def listar_compras(db: Session, empresa_id: int, somente_abertos: bool = True) -> List[PedidoCompra]:
    q = db.query(PedidoCompra).filter(PedidoCompra.empresa_id == empresa_id)
    pedidos = q.order_by(PedidoCompra.data_entrega).all()
    if somente_abertos:
        pedidos = [p for p in pedidos if (p.status or "").strip().lower() not in STATUS_FECHADOS]
    return pedidos


def aplicar_compra_no_estoque_e_financeiro(db: Session, empresa_id: int, pedido: PedidoCompra) -> None:
    """
    Reflete um pedido de compra recém-criado no estoque (entrada do produto e
    quantidade) e no financeiro (novo título a pagar com o valor do pedido).
    """
    codigo = (pedido.produto or "").strip()
    quantidade_compra = pedido.quantidade or 0

    if codigo:
        item = db.query(ItemEstoque).filter(ItemEstoque.empresa_id == empresa_id, ItemEstoque.codigo == codigo).first()
        if item:
            qtd_atual = item.quantidade or 0
            custo_atual = item.custo_medio or 0
            nova_qtd = qtd_atual + quantidade_compra
            if nova_qtd > 0:
                item.custo_medio = round((qtd_atual * custo_atual + quantidade_compra * (pedido.preco_unitario or 0)) / nova_qtd, 4)
            item.quantidade = nova_qtd
        else:
            db.add(ItemEstoque(
                empresa_id=empresa_id,
                codigo=codigo,
                descricao=pedido.descricao or codigo,
                quantidade=quantidade_compra,
                custo_medio=pedido.preco_unitario or 0,
            ))

    hoje = datetime.utcnow().strftime("%Y%m%d")
    db.add(TituloFinanceiro(
        empresa_id=empresa_id,
        tipo="pagar",
        titulo=pedido.numero,
        contraparte_codigo=pedido.fornecedor,
        contraparte_nome=pedido.nome_fornecedor,
        emissao=hoje,
        vencimento=pedido.data_entrega or hoje,
        valor=pedido.valor_total or 0,
        saldo=pedido.valor_total or 0,
        tipo_doc="NF",
    ))


# ── FINANCEIRO ─────────────────────────────────────────────────────────────────
def titulo_dict(t: TituloFinanceiro) -> dict:
    return {
        "id": t.id,
        "titulo": t.titulo,
        "cliente": t.contraparte_codigo,
        "fornecedor": t.contraparte_codigo,
        "nome_cliente": t.contraparte_nome,
        "nome_fornecedor": t.contraparte_nome,
        "emissao": t.emissao,
        "vencimento": t.vencimento,
        "valor": t.valor or 0,
        "saldo": t.saldo or 0,
        "tipo": t.tipo_doc,
    }


def listar_titulos(db: Session, empresa_id: int, tipo: str, dias: int = 60) -> List[TituloFinanceiro]:
    data_limite = (datetime.now() + timedelta(days=dias)).strftime("%Y%m%d")
    return (
        db.query(TituloFinanceiro)
        .filter(
            TituloFinanceiro.empresa_id == empresa_id,
            TituloFinanceiro.tipo == tipo,
            TituloFinanceiro.saldo > 0,
            TituloFinanceiro.vencimento <= data_limite,
        )
        .order_by(TituloFinanceiro.vencimento)
        .all()
    )


# ── PRODUÇÃO ───────────────────────────────────────────────────────────────────
def ordem_producao_dict(o: OrdemProducao) -> dict:
    prevista = o.quantidade_prevista or 0
    produzida = o.quantidade_produzida or 0
    return {
        "id": o.id,
        "numero": o.numero,
        "item": o.item,
        "produto": o.produto,
        "descricao": o.descricao,
        "quantidade_prevista": prevista,
        "quantidade_produzida": produzida,
        "saldo_produzir": prevista - produzida,
        "data_inicio": o.data_inicio,
        "data_fim": o.data_fim,
        "situacao": o.situacao,
        "situacao_descricao": SITUACOES_PRODUCAO.get((o.situacao or "").strip(), o.situacao),
        "percentual_concluido": round((produzida / prevista * 100) if prevista > 0 else 0, 1),
    }


def listar_producao(db: Session, empresa_id: int, somente_abertas: bool = True) -> List[OrdemProducao]:
    ordens = db.query(OrdemProducao).filter(OrdemProducao.empresa_id == empresa_id).order_by(OrdemProducao.data_fim).all()
    if somente_abertas:
        ordens = [o for o in ordens if (o.situacao or "").strip().upper() not in ("E", "C")]
    return ordens


# ── DASHBOARD ──────────────────────────────────────────────────────────────────
def resumo_dashboard(db: Session, empresa_id: int) -> dict:
    estoque = listar_estoque(db, empresa_id)
    pedidos = listar_compras(db, empresa_id)
    receber = listar_titulos(db, empresa_id, "receber", 30)
    pagar = listar_titulos(db, empresa_id, "pagar", 30)
    producao = listar_producao(db, empresa_id)

    total_receber = sum(t.saldo or 0 for t in receber)
    total_pagar = sum(t.saldo or 0 for t in pagar)

    return {
        "financeiro": {
            "total_receber_30d": total_receber,
            "total_pagar_30d": total_pagar,
            "saldo_previsto": total_receber - total_pagar,
            "titulos_receber": len(receber),
            "titulos_pagar": len(pagar),
        },
        "estoque": {
            "total_itens": len(estoque),
            "valor_total": sum((i.quantidade or 0) * (i.custo_medio or 0) for i in estoque),
        },
        "compras": {
            "pedidos_abertos": len(pedidos),
            "valor_total_pedidos": sum(p.valor_total or 0 for p in pedidos),
        },
        "producao": {
            "ordens_abertas": len(producao),
            "quantidade_prevista": sum(o.quantidade_prevista or 0 for o in producao),
            "quantidade_produzida": sum(o.quantidade_produzida or 0 for o in producao),
        },
    }


# ── ALERTAS DE ESTOQUE ───────────────────────────────────────────────────────────
def verificar_estoque_minimo(db: Session, empresa_id: int) -> list[dict]:
    itens = listar_estoque(db, empresa_id)
    novos = []
    for item in itens:
        minimo = item.estoque_minimo or 0
        if minimo <= 0:
            continue
        quantidade = item.quantidade or 0
        if quantidade <= minimo:
            existente = db.query(AlertaEstoque).filter(
                AlertaEstoque.empresa_id == empresa_id,
                AlertaEstoque.produto_codigo == item.codigo,
                AlertaEstoque.status == "pendente",
            ).first()
            if not existente:
                alerta = AlertaEstoque(
                    empresa_id=empresa_id,
                    produto_codigo=item.codigo,
                    produto_descricao=item.descricao,
                    estoque_atual=quantidade,
                    estoque_minimo=minimo,
                )
                db.add(alerta)
                novos.append({
                    "codigo": item.codigo,
                    "descricao": item.descricao,
                    "estoque_atual": quantidade,
                    "estoque_minimo": minimo,
                })
    db.commit()
    return novos


def buscar_alertas_pendentes(db: Session, empresa_id: int) -> list[AlertaEstoque]:
    return (
        db.query(AlertaEstoque)
        .filter(AlertaEstoque.empresa_id == empresa_id, AlertaEstoque.status == "pendente")
        .order_by(AlertaEstoque.criado_em.desc())
        .all()
    )


def resolver_alerta(db: Session, empresa_id: int, alerta_id: int) -> bool:
    alerta = db.query(AlertaEstoque).filter(AlertaEstoque.id == alerta_id, AlertaEstoque.empresa_id == empresa_id).first()
    if not alerta:
        return False
    alerta.status = "resolvido"
    alerta.resolvido_em = datetime.utcnow()
    db.commit()
    return True
