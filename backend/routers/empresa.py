from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional
from db.local_db import get_db, Usuario, Empresa
from routers.auth import get_usuario_atual, requer_admin
from services.auth_service import hash_senha

router = APIRouter(prefix="/empresa", tags=["Empresa"])


class EmpresaUpdate(BaseModel):
    nome: Optional[str] = None
    cnpj: Optional[str] = None


class EmpresaCreate(BaseModel):
    nome: str
    cnpj: Optional[str] = None
    plano: str = "trial"
    admin_nome: str
    admin_email: EmailStr
    admin_matricula: str
    admin_senha: str
    admin_cargo: Optional[str] = None


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


@router.post("/", status_code=201)
def criar_empresa(data: EmpresaCreate, db: Session = Depends(get_db), admin: Usuario = Depends(requer_admin)):
    if db.query(Usuario).filter(Usuario.email == data.admin_email).first():
        raise HTTPException(400, "E-mail já cadastrado")

    empresa = Empresa(nome=data.nome, cnpj=data.cnpj, plano=data.plano)
    db.add(empresa)
    db.commit()
    db.refresh(empresa)

    novo_admin = Usuario(
        empresa_id=empresa.id,
        nome=data.admin_nome,
        email=data.admin_email,
        matricula=data.admin_matricula,
        senha_hash=hash_senha(data.admin_senha),
        setor="admin",
        cargo=data.admin_cargo,
        admin=True,
    )
    db.add(novo_admin)
    db.commit()

    return _empresa_dict(db, empresa)
