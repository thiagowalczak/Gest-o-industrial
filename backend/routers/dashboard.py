from __future__ import annotations
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from db.local_db import get_db, AlertaEstoque, Usuario
from services.dados_service import resumo_dashboard, buscar_alertas_pendentes
from routers.auth import requer_painel_central

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/resumo")
def resumo(db: Session = Depends(get_db), usuario: Usuario = Depends(requer_painel_central)):
    dados = resumo_dashboard(db, usuario.empresa_id)
    alertas = buscar_alertas_pendentes(db, usuario.empresa_id)
    dados["alertas_estoque"] = len(alertas)
    dados["status_protheus"] = {"status": "online", "mensagem": "Sistema operando normalmente"}
    dados["modo_demo"] = False
    return dados


@router.get("/status")
def status_sistema(db: Session = Depends(get_db), usuario: Usuario = Depends(requer_painel_central)):
    return {
        "protheus": {"status": "online", "mensagem": "Sistema operando normalmente"},
        "modo_demo": False,
        "usuarios_ativos": db.query(Usuario).filter(Usuario.empresa_id == usuario.empresa_id, Usuario.ativo == True).count(),
        "alertas_pendentes": db.query(AlertaEstoque).filter_by(empresa_id=usuario.empresa_id, status="pendente").count(),
    }
