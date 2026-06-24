from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional
from db.local_db import get_db, Usuario, OrdemProducao, PedidoCompra, ImportacaoLog, MaterialOrdemProducao, ItemEstoque
from routers.auth import get_usuario_atual
from services.dados_service import (
    listar_producao, ordem_producao_dict, SITUACOES_PRODUCAO,
    listar_compras, pedido_compra_dict, aplicar_compra_no_estoque_e_financeiro,
    listar_materiais_ordem, material_ordem_dict, aplicar_consumo_materiais, calcular_consumo_materiais,
)
from services.excel_utils import ler_linhas, converter_data, validar_tamanho_arquivo
from services.log_service import registrar_log

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


class SituacaoBody(BaseModel):
    situacao: str


class MaterialOrdemBody(BaseModel):
    item_codigo: str
    quantidade_por_unidade: float = Field(gt=0)


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
def ordens(todas: bool = False, usuario: Usuario = Depends(get_usuario_atual), db: Session = Depends(get_db)):
    ordens = listar_producao(db, usuario.empresa_id, somente_abertas=not todas)
    return {"ordens": [ordem_producao_dict(o) for o in ordens], "total": len(ordens)}


@router.get("/resumo")
def resumo(usuario: Usuario = Depends(get_usuario_atual), db: Session = Depends(get_db)):
    todas = listar_producao(db, usuario.empresa_id, somente_abertas=False)
    # Exclui canceladas do cálculo de eficiência
    ativas = [o for o in todas if (o.situacao or "").strip().upper() != "C"]

    por_situacao = {}
    for o in todas:
        sit = SITUACOES.get((o.situacao or "").strip(), "Outro")
        por_situacao[sit] = por_situacao.get(sit, 0) + 1

    total_previsto = sum(o.quantidade_prevista or 0 for o in ativas)
    total_produzido = sum(o.quantidade_produzida or 0 for o in ativas)

    return {
        "por_situacao": por_situacao,
        "total_ordens": len(todas),
        "total_previsto": total_previsto,
        "total_produzido": total_produzido,
        "eficiencia": round((total_produzido / total_previsto * 100) if total_previsto > 0 else 0, 1),
    }


@router.post("/ordens", status_code=201)
def criar_ordem(body: OrdemProducaoBody, db: Session = Depends(get_db), usuario: Usuario = Depends(get_usuario_atual)):
    ordem = OrdemProducao(empresa_id=usuario.empresa_id, **body.dict())
    db.add(ordem)
    registrar_log(db, usuario.empresa_id, usuario.id, "Criou ordem de produção", "producao", f"{ordem.numero} — {ordem.descricao}")
    db.commit()
    db.refresh(ordem)
    return ordem_producao_dict(ordem)


@router.patch("/ordens/{ordem_id}/situacao")
def atualizar_situacao(ordem_id: int, body: SituacaoBody, db: Session = Depends(get_db), usuario: Usuario = Depends(get_usuario_atual)):
    if body.situacao not in ("A", "L", "P", "E", "C"):
        raise HTTPException(400, "Situação inválida. Use: A, L, P, E ou C")
    ordem = db.query(OrdemProducao).filter(OrdemProducao.id == ordem_id, OrdemProducao.empresa_id == usuario.empresa_id).first()
    if not ordem:
        raise HTTPException(404, "Ordem não encontrada")
    situacao_anterior = (ordem.situacao or "").strip().upper()
    produzida_anterior = ordem.quantidade_produzida or 0
    ordem.situacao = body.situacao
    if body.situacao == "E":
        # Encerrada → sempre 100% produzido
        ordem.quantidade_produzida = ordem.quantidade_prevista or 0
    elif situacao_anterior == "E":
        # Saindo de Encerrada → reseta produzido para refletir estado real
        ordem.quantidade_produzida = 0
    aplicar_consumo_materiais(db, usuario.empresa_id, ordem.id, produzida_anterior, ordem.quantidade_produzida or 0)
    registrar_log(db, usuario.empresa_id, usuario.id, f"Alterou situação da ordem para {SITUACOES.get(body.situacao, body.situacao)}", "producao", ordem.numero)
    db.commit()
    return ordem_producao_dict(ordem)


@router.put("/ordens/{ordem_id}")
def atualizar_ordem(ordem_id: int, body: OrdemProducaoBody, db: Session = Depends(get_db), usuario: Usuario = Depends(get_usuario_atual)):
    ordem = db.query(OrdemProducao).filter(OrdemProducao.id == ordem_id, OrdemProducao.empresa_id == usuario.empresa_id).first()
    if not ordem:
        raise HTTPException(404, "Ordem não encontrada")
    produzida_anterior = ordem.quantidade_produzida or 0
    for campo, valor in body.dict().items():
        setattr(ordem, campo, valor)
    aplicar_consumo_materiais(db, usuario.empresa_id, ordem.id, produzida_anterior, ordem.quantidade_produzida or 0)
    registrar_log(db, usuario.empresa_id, usuario.id, "Atualizou ordem de produção", "producao", f"{ordem.numero} — {ordem.descricao}")
    db.commit()
    return ordem_producao_dict(ordem)


@router.delete("/ordens/limpar-tudo")
def limpar_ordens(db: Session = Depends(get_db), usuario: Usuario = Depends(get_usuario_atual)):
    removidos = db.query(OrdemProducao).filter(
        OrdemProducao.empresa_id == usuario.empresa_id
    ).delete(synchronize_session=False)
    registrar_log(db, usuario.empresa_id, usuario.id, "Limpou todas as ordens de produção", "producao", f"{removidos} ordem(ns) removida(s)")
    db.commit()
    return {"removidos": removidos}


@router.delete("/ordens/{ordem_id}")
def remover_ordem(ordem_id: int, db: Session = Depends(get_db), usuario: Usuario = Depends(get_usuario_atual)):
    ordem = db.query(OrdemProducao).filter(OrdemProducao.id == ordem_id, OrdemProducao.empresa_id == usuario.empresa_id).first()
    if not ordem:
        raise HTTPException(404, "Ordem não encontrada")
    registrar_log(db, usuario.empresa_id, usuario.id, "Removeu ordem de produção", "producao", f"{ordem.numero} — {ordem.descricao}")
    db.delete(ordem)
    db.commit()
    return {"mensagem": "Ordem removida"}


@router.post("/ordens/importar-excel")
async def importar_ordens_excel(file: UploadFile = File(...), db: Session = Depends(get_db), usuario: Usuario = Depends(get_usuario_atual)):
    if not file.filename.endswith((".xlsx", ".xls", ".csv")):
        raise HTTPException(400, "Envie um arquivo Excel (.xlsx) ou CSV (.csv)")

    conteudo = await file.read()
    validar_tamanho_arquivo(conteudo)
    linhas = ler_linhas(conteudo, MAPA_COLUNAS_PRODUCAO, nome_arquivo=file.filename)

    log = ImportacaoLog(empresa_id=usuario.empresa_id, modulo="producao", nome_arquivo=file.filename)
    db.add(log)
    db.flush()

    criados = 0
    for linha in linhas:
        numero = str(linha.get("numero") or "").strip()
        if not numero:
            continue
        db.add(OrdemProducao(
            empresa_id=usuario.empresa_id,
            importacao_id=log.id,
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

    log.total_registros = criados
    db.commit()
    return {"criados": criados, "total_linhas": len(linhas)}


# ── MATERIAIS DA ORDEM (ficha técnica / BOM) ──────────────────────────────────
@router.get("/consumo-materiais")
def consumo_materiais(usuario: Usuario = Depends(get_usuario_atual), db: Session = Depends(get_db)):
    return calcular_consumo_materiais(db, usuario.empresa_id)


@router.get("/ordens/{ordem_id}/materiais")
def materiais_ordem(ordem_id: int, usuario: Usuario = Depends(get_usuario_atual), db: Session = Depends(get_db)):
    ordem = db.query(OrdemProducao).filter(OrdemProducao.id == ordem_id, OrdemProducao.empresa_id == usuario.empresa_id).first()
    if not ordem:
        raise HTTPException(404, "Ordem não encontrada")
    return [material_ordem_dict(m) for m in listar_materiais_ordem(db, usuario.empresa_id, ordem_id)]


@router.post("/ordens/{ordem_id}/materiais", status_code=201)
def adicionar_material_ordem(ordem_id: int, body: MaterialOrdemBody, db: Session = Depends(get_db), usuario: Usuario = Depends(get_usuario_atual)):
    ordem = db.query(OrdemProducao).filter(OrdemProducao.id == ordem_id, OrdemProducao.empresa_id == usuario.empresa_id).first()
    if not ordem:
        raise HTTPException(404, "Ordem não encontrada")
    item = db.query(ItemEstoque).filter(ItemEstoque.empresa_id == usuario.empresa_id, ItemEstoque.codigo == body.item_codigo).first()
    if not item:
        raise HTTPException(404, "Item não encontrado no estoque")

    material = MaterialOrdemProducao(
        empresa_id=usuario.empresa_id,
        ordem_id=ordem_id,
        item_codigo=item.codigo,
        descricao=item.descricao,
        quantidade_por_unidade=body.quantidade_por_unidade,
    )
    db.add(material)
    registrar_log(db, usuario.empresa_id, usuario.id, "Adicionou material à ordem de produção", "producao", f"{ordem.numero}: {item.codigo} — {item.descricao}")
    db.commit()
    db.refresh(material)
    return material_ordem_dict(material)


@router.put("/ordens/{ordem_id}/materiais/{material_id}")
def atualizar_material_ordem(ordem_id: int, material_id: int, body: MaterialOrdemBody, db: Session = Depends(get_db), usuario: Usuario = Depends(get_usuario_atual)):
    material = db.query(MaterialOrdemProducao).filter(
        MaterialOrdemProducao.id == material_id,
        MaterialOrdemProducao.ordem_id == ordem_id,
        MaterialOrdemProducao.empresa_id == usuario.empresa_id,
    ).first()
    if not material:
        raise HTTPException(404, "Material não encontrado nesta ordem")
    material.quantidade_por_unidade = body.quantidade_por_unidade
    db.commit()
    return material_ordem_dict(material)


@router.delete("/ordens/{ordem_id}/materiais/{material_id}")
def remover_material_ordem(ordem_id: int, material_id: int, db: Session = Depends(get_db), usuario: Usuario = Depends(get_usuario_atual)):
    material = db.query(MaterialOrdemProducao).filter(
        MaterialOrdemProducao.id == material_id,
        MaterialOrdemProducao.ordem_id == ordem_id,
        MaterialOrdemProducao.empresa_id == usuario.empresa_id,
    ).first()
    if not material:
        raise HTTPException(404, "Material não encontrado nesta ordem")
    registrar_log(db, usuario.empresa_id, usuario.id, "Removeu material da ordem de produção", "producao", f"{material.item_codigo} — {material.descricao}")
    db.delete(material)
    db.commit()
    return {"mensagem": "Material removido"}


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
    registrar_log(db, usuario.empresa_id, usuario.id, "Criou pedido de compra", "compras", f"{pedido.numero} — {pedido.descricao}")
    db.commit()
    db.refresh(pedido)
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
    registrar_log(db, usuario.empresa_id, usuario.id, "Atualizou pedido de compra", "compras", f"{pedido.numero} — {pedido.descricao}")
    db.commit()
    return pedido_compra_dict(pedido)


@router.delete("/compras/limpar-tudo")
def limpar_compras(db: Session = Depends(get_db), usuario: Usuario = Depends(get_usuario_atual)):
    removidos = db.query(PedidoCompra).filter(
        PedidoCompra.empresa_id == usuario.empresa_id
    ).delete(synchronize_session=False)
    registrar_log(db, usuario.empresa_id, usuario.id, "Limpou todos os pedidos de compra", "compras", f"{removidos} pedido(s) removido(s)")
    db.commit()
    return {"removidos": removidos}


@router.delete("/compras/{pedido_id}")
def remover_pedido_compra(pedido_id: int, db: Session = Depends(get_db), usuario: Usuario = Depends(get_usuario_atual)):
    pedido = db.query(PedidoCompra).filter(PedidoCompra.id == pedido_id, PedidoCompra.empresa_id == usuario.empresa_id).first()
    if not pedido:
        raise HTTPException(404, "Pedido não encontrado")
    registrar_log(db, usuario.empresa_id, usuario.id, "Removeu pedido de compra", "compras", f"{pedido.numero} — {pedido.descricao}")
    db.delete(pedido)
    db.commit()
    return {"mensagem": "Pedido removido"}


@router.post("/compras/{pedido_id}/entregar")
def confirmar_entrega(pedido_id: int, db: Session = Depends(get_db), usuario: Usuario = Depends(get_usuario_atual)):
    pedido = db.query(PedidoCompra).filter(PedidoCompra.id == pedido_id, PedidoCompra.empresa_id == usuario.empresa_id).first()
    if not pedido:
        raise HTTPException(404, "Pedido não encontrado")
    if (pedido.status or "") == "Pedido entregue":
        raise HTTPException(400, "Pedido já foi marcado como entregue")
    pedido.status = "Pedido entregue"
    registrar_log(db, usuario.empresa_id, usuario.id, "Confirmou entrega do pedido de compra", "compras", f"{pedido.numero} — {pedido.descricao}")
    db.commit()
    aplicar_compra_no_estoque_e_financeiro(db, usuario.empresa_id, pedido)
    db.commit()
    return pedido_compra_dict(pedido)


@router.post("/compras/importar-excel")
async def importar_compras_excel(file: UploadFile = File(...), db: Session = Depends(get_db), usuario: Usuario = Depends(get_usuario_atual)):
    if not file.filename.endswith((".xlsx", ".xls", ".csv")):
        raise HTTPException(400, "Envie um arquivo Excel (.xlsx) ou CSV (.csv)")

    conteudo = await file.read()
    validar_tamanho_arquivo(conteudo)
    linhas = ler_linhas(conteudo, MAPA_COLUNAS_COMPRAS, nome_arquivo=file.filename)

    log = ImportacaoLog(empresa_id=usuario.empresa_id, modulo="compras", nome_arquivo=file.filename)
    db.add(log)
    db.flush()

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
            importacao_id=log.id,
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
        criados += 1

    log.total_registros = criados
    db.commit()
    return {"criados": criados, "total_linhas": len(linhas)}
