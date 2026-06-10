from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from db.local_db import get_db, Usuario, ItemEstoque
from routers.auth import get_usuario_atual
from services.dados_service import (
    listar_estoque, item_estoque_dict,
    verificar_estoque_minimo, buscar_alertas_pendentes, resolver_alerta,
)
from services.excel_utils import ler_linhas

router = APIRouter(prefix="/estoque", tags=["Estoque"])


class ItemEstoqueBody(BaseModel):
    codigo: str
    descricao: str
    deposito: Optional[str] = None
    quantidade: float = 0
    custo_medio: float = 0
    unidade: Optional[str] = None
    grupo: Optional[str] = None
    estoque_minimo: float = 0
    ponto_reposicao: float = 0


class ConfigEstoqueBody(BaseModel):
    produto_codigo: str
    estoque_minimo: float
    ponto_reposicao: float = 0
    quantidade_reposicao: float = 0  # mantido por compatibilidade, não persistido


MAPA_COLUNAS = {
    "codigo": "codigo",
    "codigo do produto": "codigo",
    "descricao": "descricao",
    "descricao do produto": "descricao",
    "deposito": "deposito",
    "quantidade": "quantidade",
    "qtd": "quantidade",
    "custo medio": "custo_medio",
    "custo unitario": "custo_medio",
    "unidade": "unidade",
    "um": "unidade",
    "grupo": "grupo",
    "estoque minimo": "estoque_minimo",
    "ponto de reposicao": "ponto_reposicao",
}


@router.get("/")
def listar(usuario: Usuario = Depends(get_usuario_atual), db: Session = Depends(get_db)):
    itens = listar_estoque(db, usuario.empresa_id)
    return {"itens": [item_estoque_dict(i) for i in itens], "total": len(itens)}


@router.post("/", status_code=201)
def criar(body: ItemEstoqueBody, db: Session = Depends(get_db), usuario: Usuario = Depends(get_usuario_atual)):
    if db.query(ItemEstoque).filter(ItemEstoque.empresa_id == usuario.empresa_id, ItemEstoque.codigo == body.codigo).first():
        raise HTTPException(400, "Já existe um item com este código")
    item = ItemEstoque(empresa_id=usuario.empresa_id, **body.dict())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item_estoque_dict(item)


@router.put("/{item_id}")
def atualizar(item_id: int, body: ItemEstoqueBody, db: Session = Depends(get_db), usuario: Usuario = Depends(get_usuario_atual)):
    item = db.query(ItemEstoque).filter(ItemEstoque.id == item_id, ItemEstoque.empresa_id == usuario.empresa_id).first()
    if not item:
        raise HTTPException(404, "Item não encontrado")
    for campo, valor in body.dict().items():
        setattr(item, campo, valor)
    db.commit()
    return item_estoque_dict(item)


@router.delete("/{item_id}")
def remover(item_id: int, db: Session = Depends(get_db), usuario: Usuario = Depends(get_usuario_atual)):
    item = db.query(ItemEstoque).filter(ItemEstoque.id == item_id, ItemEstoque.empresa_id == usuario.empresa_id).first()
    if not item:
        raise HTTPException(404, "Item não encontrado")
    db.delete(item)
    db.commit()
    return {"mensagem": "Item removido"}


@router.get("/alertas")
def alertas(db: Session = Depends(get_db), usuario: Usuario = Depends(get_usuario_atual)):
    alertas = buscar_alertas_pendentes(db, usuario.empresa_id)
    return [
        {
            "id": a.id,
            "produto_codigo": a.produto_codigo,
            "produto_descricao": a.produto_descricao,
            "estoque_atual": a.estoque_atual,
            "estoque_minimo": a.estoque_minimo,
            "criado_em": a.criado_em,
        }
        for a in alertas
    ]


@router.post("/verificar-minimos")
def verificar_minimos(db: Session = Depends(get_db), usuario: Usuario = Depends(get_usuario_atual)):
    novos_alertas = verificar_estoque_minimo(db, usuario.empresa_id)
    return {"novos_alertas": len(novos_alertas), "alertas": novos_alertas}


@router.post("/alertas/{alerta_id}/resolver")
def resolver(alerta_id: int, db: Session = Depends(get_db), usuario: Usuario = Depends(get_usuario_atual)):
    if not resolver_alerta(db, usuario.empresa_id, alerta_id):
        raise HTTPException(404, "Alerta não encontrado")
    return {"mensagem": "Alerta resolvido"}


@router.post("/configurar")
def configurar_minimo(body: ConfigEstoqueBody, db: Session = Depends(get_db), usuario: Usuario = Depends(get_usuario_atual)):
    item = db.query(ItemEstoque).filter(ItemEstoque.empresa_id == usuario.empresa_id, ItemEstoque.codigo == body.produto_codigo).first()
    if not item:
        raise HTTPException(404, "Produto não encontrado no estoque. Cadastre o item primeiro.")
    item.estoque_minimo = body.estoque_minimo
    item.ponto_reposicao = body.ponto_reposicao
    db.commit()
    return {"mensagem": "Configuração salva", "id": item.id}


@router.post("/importar-excel")
async def importar_excel(file: UploadFile = File(...), db: Session = Depends(get_db), usuario: Usuario = Depends(get_usuario_atual)):
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(400, "Envie um arquivo Excel (.xlsx)")

    conteudo = await file.read()
    linhas = ler_linhas(conteudo, MAPA_COLUNAS)

    criados, atualizados = 0, 0
    for linha in linhas:
        codigo = str(linha.get("codigo") or "").strip()
        if not codigo:
            continue
        item = db.query(ItemEstoque).filter(ItemEstoque.empresa_id == usuario.empresa_id, ItemEstoque.codigo == codigo).first()
        dados = {
            "codigo": codigo,
            "descricao": str(linha.get("descricao") or "").strip(),
            "deposito": str(linha.get("deposito") or "").strip() or None,
            "quantidade": float(linha.get("quantidade") or 0),
            "custo_medio": float(linha.get("custo_medio") or 0),
            "unidade": str(linha.get("unidade") or "").strip() or None,
            "grupo": str(linha.get("grupo") or "").strip() or None,
            "estoque_minimo": float(linha.get("estoque_minimo") or 0),
            "ponto_reposicao": float(linha.get("ponto_reposicao") or 0),
        }
        if item:
            for k, v in dados.items():
                setattr(item, k, v)
            atualizados += 1
        else:
            db.add(ItemEstoque(empresa_id=usuario.empresa_id, **dados))
            criados += 1

    db.commit()
    return {"criados": criados, "atualizados": atualizados, "total_linhas": len(linhas)}


@router.get("/produto/{codigo}")
def produto(codigo: str, db: Session = Depends(get_db), usuario: Usuario = Depends(get_usuario_atual)):
    item = db.query(ItemEstoque).filter(ItemEstoque.empresa_id == usuario.empresa_id, ItemEstoque.codigo == codigo).first()
    if not item:
        raise HTTPException(404, "Produto não encontrado")
    return item_estoque_dict(item)
