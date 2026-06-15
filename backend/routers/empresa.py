from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from db.local_db import get_db, Usuario, Empresa
from routers.auth import get_usuario_atual, requer_admin

router = APIRouter(prefix="/empresa", tags=["Empresa"])


class EmpresaUpdate(BaseModel):
    nome: Optional[str] = None
    cnpj: Optional[str] = None


def _empresa_dict(db: Session, empresa: Empresa) -> dict:
    total_funcionarios = db.query(Usuario).filter(Usuario.empresa_id == empresa.id, Usuario.ativo == True).count()
    return {
        "id": empresa.id,
        "nome": empresa.nome,
        "cnpj": empresa.cnpj,
        "plano": empresa.plano,
        "ativo": empresa.ativo,
        "criado_em": empresa.criado_em,
        "total_funcionarios": total_funcionarios,
    }


@router.get("/")
def obter_empresa(db: Session = Depends(get_db), usuario: Usuario = Depends(get_usuario_atual)):
    empresa = db.query(Empresa).filter(Empresa.id == usuario.empresa_id).first()
    if not empresa:
        raise HTTPException(404, "Empresa não encontrada")
    return _empresa_dict(db, empresa)


@router.put("/")
def atualizar_empresa(data: EmpresaUpdate, db: Session = Depends(get_db), admin: Usuario = Depends(requer_admin)):
    empresa = db.query(Empresa).filter(Empresa.id == admin.empresa_id).first()
    if not empresa:
        raise HTTPException(404, "Empresa não encontrada")

    for campo, valor in data.dict(exclude_none=True).items():
        setattr(empresa, campo, valor)

    db.commit()
    return _empresa_dict(db, empresa)
