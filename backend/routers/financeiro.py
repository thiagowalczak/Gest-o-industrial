from __future__ import annotations
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from db.local_db import get_db, Usuario, TituloFinanceiro
from routers.auth import get_usuario_atual
from services.dados_service import listar_titulos, titulo_dict
from services.excel_utils import ler_linhas, converter_data

router = APIRouter(prefix="/financeiro", tags=["Financeiro"])


class TituloBody(BaseModel):
    tipo: str  # receber | pagar
    titulo: str
    contraparte_codigo: Optional[str] = None
    contraparte_nome: Optional[str] = None
    emissao: Optional[str] = None
    vencimento: str
    valor: float = 0
    saldo: Optional[float] = None
    tipo_doc: str = "NF"


MAPA_COLUNAS = {
    "titulo": "titulo",
    "numero": "titulo",
    "documento": "titulo",
    "codigo": "contraparte_codigo",
    "codigo do cliente": "contraparte_codigo",
    "codigo do fornecedor": "contraparte_codigo",
    "cliente": "contraparte_nome",
    "fornecedor": "contraparte_nome",
    "nome": "contraparte_nome",
    "razao social": "contraparte_nome",
    "emissao": "emissao",
    "data de emissao": "emissao",
    "vencimento": "vencimento",
    "data de vencimento": "vencimento",
    "valor": "valor",
    "saldo": "saldo",
    "tipo": "tipo_doc",
    "tipo de documento": "tipo_doc",
}


def _resumo(titulos):
    hoje = datetime.now().strftime("%Y%m%d")
    total = sum(t.saldo or 0 for t in titulos)
    vencidos = [t for t in titulos if (t.vencimento or "99991231") < hoje]
    return {
        "titulos": [titulo_dict(t) for t in titulos],
        "total": total,
        "quantidade": len(titulos),
        "vencidos": len(vencidos),
        "valor_vencido": sum(t.saldo or 0 for t in vencidos),
    }


@router.get("/contas-receber")
def contas_receber(dias: int = 60, usuario: Usuario = Depends(get_usuario_atual), db: Session = Depends(get_db)):
    return _resumo(listar_titulos(db, usuario.empresa_id, "receber", dias))


@router.get("/contas-pagar")
def contas_pagar(dias: int = 60, usuario: Usuario = Depends(get_usuario_atual), db: Session = Depends(get_db)):
    return _resumo(listar_titulos(db, usuario.empresa_id, "pagar", dias))


@router.get("/fluxo-caixa")
def fluxo_caixa(dias: int = 60, usuario: Usuario = Depends(get_usuario_atual), db: Session = Depends(get_db)):
    receber = listar_titulos(db, usuario.empresa_id, "receber", dias)
    pagar = listar_titulos(db, usuario.empresa_id, "pagar", dias)
    total_receber = sum(t.saldo or 0 for t in receber)
    total_pagar = sum(t.saldo or 0 for t in pagar)
    return {
        "total_entradas": total_receber,
        "total_saidas": total_pagar,
        "saldo_previsto": total_receber - total_pagar,
        "superavit": total_receber > total_pagar,
    }


@router.post("/titulos", status_code=201)
def criar_titulo(body: TituloBody, db: Session = Depends(get_db), usuario: Usuario = Depends(get_usuario_atual)):
    if body.tipo not in ("receber", "pagar"):
        raise HTTPException(400, "Tipo deve ser 'receber' ou 'pagar'")
    dados = body.dict()
    if dados.get("saldo") is None:
        dados["saldo"] = dados["valor"]
    titulo = TituloFinanceiro(empresa_id=usuario.empresa_id, **dados)
    db.add(titulo)
    db.commit()
    db.refresh(titulo)
    return titulo_dict(titulo)


@router.put("/titulos/{titulo_id}")
def atualizar_titulo(titulo_id: int, body: TituloBody, db: Session = Depends(get_db), usuario: Usuario = Depends(get_usuario_atual)):
    titulo = db.query(TituloFinanceiro).filter(TituloFinanceiro.id == titulo_id, TituloFinanceiro.empresa_id == usuario.empresa_id).first()
    if not titulo:
        raise HTTPException(404, "Título não encontrado")
    dados = body.dict()
    if dados.get("saldo") is None:
        dados["saldo"] = dados["valor"]
    for campo, valor in dados.items():
        setattr(titulo, campo, valor)
    db.commit()
    return titulo_dict(titulo)


@router.delete("/titulos/{titulo_id}")
def remover_titulo(titulo_id: int, db: Session = Depends(get_db), usuario: Usuario = Depends(get_usuario_atual)):
    titulo = db.query(TituloFinanceiro).filter(TituloFinanceiro.id == titulo_id, TituloFinanceiro.empresa_id == usuario.empresa_id).first()
    if not titulo:
        raise HTTPException(404, "Título não encontrado")
    db.delete(titulo)
    db.commit()
    return {"mensagem": "Título removido"}


@router.post("/importar-excel")
async def importar_excel(
    file: UploadFile = File(...),
    tipo: str = Query("receber", description="receber ou pagar"),
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_atual),
):
    if tipo not in ("receber", "pagar"):
        raise HTTPException(400, "O parâmetro 'tipo' deve ser 'receber' ou 'pagar'")
    if not file.filename.endswith((".xlsx", ".xls", ".csv")):
        raise HTTPException(400, "Envie um arquivo Excel (.xlsx) ou CSV (.csv)")

    conteudo = await file.read()
    linhas = ler_linhas(conteudo, MAPA_COLUNAS, nome_arquivo=file.filename)

    criados = 0
    for linha in linhas:
        titulo_num = str(linha.get("titulo") or "").strip()
        if not titulo_num:
            continue
        valor = float(linha.get("valor") or 0)
        saldo = linha.get("saldo")
        saldo = float(saldo) if saldo not in (None, "") else valor

        db.add(TituloFinanceiro(
            empresa_id=usuario.empresa_id,
            tipo=tipo,
            titulo=titulo_num,
            contraparte_codigo=str(linha.get("contraparte_codigo") or "").strip() or None,
            contraparte_nome=str(linha.get("contraparte_nome") or "").strip() or None,
            emissao=converter_data(linha.get("emissao")),
            vencimento=converter_data(linha.get("vencimento")),
            valor=valor,
            saldo=saldo,
            tipo_doc=str(linha.get("tipo_doc") or "NF").strip(),
        ))
        criados += 1

    db.commit()
    return {"criados": criados, "total_linhas": len(linhas), "tipo": tipo}
