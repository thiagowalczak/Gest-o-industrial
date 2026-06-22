"""Registro de auditoria das ações realizadas pelo painel (criação, edição, exclusão)."""
from __future__ import annotations
from typing import Optional
from sqlalchemy.orm import Session

from db.local_db import LogAtividade


def registrar_log(db: Session, empresa_id: int, usuario_id: int, acao: str, modulo: str, detalhes: Optional[str] = None) -> None:
    """Adiciona um LogAtividade à sessão (não comita — o caller comita junto com a operação principal)."""
    db.add(LogAtividade(
        empresa_id=empresa_id,
        usuario_id=usuario_id,
        acao=acao,
        modulo=modulo,
        detalhes=detalhes,
    ))
