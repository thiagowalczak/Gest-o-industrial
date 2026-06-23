from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional
from db.local_db import get_db, Usuario, Empresa
from routers.auth import get_usuario_atual, requer_admin, requer_super_admin
from services.auth_service import hash_senha
from services.log_service import registrar_log

PLANOS_VALIDOS = ("trial", "basico", "pro")


class EmpresaGerenciar(BaseModel):
    plano: Optional[str] = None
    ativo: Optional[bool] = None

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
        "onboarding_concluido": bool(empresa.onboarding_concluido),
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

    registrar_log(db, admin.empresa_id, admin.id, "Atualizou dados da empresa", "empresa", empresa.nome)
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
    registrar_log(db, admin.empresa_id, admin.id, "Cadastrou nova empresa", "empresa", empresa.nome)
    db.commit()

    return _empresa_dict(db, empresa)


@router.post("/onboarding/concluir")
def concluir_onboarding(db: Session = Depends(get_db), admin: Usuario = Depends(requer_admin)):
    empresa = db.query(Empresa).filter(Empresa.id == admin.empresa_id).first()
    if not empresa:
        raise HTTPException(404, "Empresa não encontrada")
    empresa.onboarding_concluido = True
    db.commit()
    return _empresa_dict(db, empresa)


# ── GESTÃO DE CLIENTES (plataforma) ───────────────────────────────────────────
# Como o autocadastro fica bloqueado (só o dono da plataforma cadastra empresas
# clientes), a cobrança é manual — o controle de ativo/plano abaixo substitui
# a necessidade de um gateway de pagamento automático.
@router.get("/todas")
def listar_todas_empresas(db: Session = Depends(get_db), super_admin: Usuario = Depends(requer_super_admin)):
    empresas = db.query(Empresa).order_by(Empresa.criado_em.desc()).all()
    return [_empresa_dict(db, e) for e in empresas]


@router.put("/{empresa_id}/gerenciar")
def gerenciar_empresa(empresa_id: int, data: EmpresaGerenciar, db: Session = Depends(get_db), super_admin: Usuario = Depends(requer_super_admin)):
    empresa = db.query(Empresa).filter(Empresa.id == empresa_id).first()
    if not empresa:
        raise HTTPException(404, "Empresa não encontrada")
    if data.plano is not None and data.plano not in PLANOS_VALIDOS:
        raise HTTPException(400, f"Plano inválido. Opções: {PLANOS_VALIDOS}")

    for campo, valor in data.dict(exclude_none=True).items():
        setattr(empresa, campo, valor)

    acao = f"Alterou plano/status da empresa {empresa.nome}"
    detalhes = f"plano={empresa.plano}, ativo={empresa.ativo}"
    registrar_log(db, super_admin.empresa_id, super_admin.id, acao, "empresa", detalhes)
    db.commit()
    return _empresa_dict(db, empresa)
