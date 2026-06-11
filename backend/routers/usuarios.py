from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional
from db.local_db import get_db, Usuario
from services.auth_service import hash_senha
from routers.auth import get_usuario_atual, requer_admin
from datetime import datetime

router = APIRouter(prefix="/usuarios", tags=["Usuários"])

SETORES = ["financeiro", "compras", "estoque", "producao", "admin", "diretoria"]


class UsuarioCreate(BaseModel):
    nome: str
    email: EmailStr
    matricula: str
    senha: str
    setor: str
    cargo: Optional[str] = None
    admin: bool = False


class UsuarioUpdate(BaseModel):
    nome: Optional[str] = None
    email: Optional[EmailStr] = None
    setor: Optional[str] = None
    cargo: Optional[str] = None
    admin: Optional[bool] = None
    ativo: Optional[bool] = None


class SenhaUpdate(BaseModel):
    senha_atual: str
    nova_senha: str


@router.get("/")
def listar_usuarios(db: Session = Depends(get_db), admin: Usuario = Depends(requer_admin)):
    usuarios = db.query(Usuario).filter(Usuario.empresa_id == admin.empresa_id).order_by(Usuario.nome).all()
    return [
        {
            "id": u.id,
            "nome": u.nome,
            "email": u.email,
            "matricula": u.matricula,
            "setor": u.setor,
            "cargo": u.cargo,
            "ativo": u.ativo,
            "admin": u.admin,
            "criado_em": u.criado_em,
            "ultimo_acesso": u.ultimo_acesso,
        }
        for u in usuarios
    ]


@router.post("/", status_code=201)
def criar_usuario(data: UsuarioCreate, db: Session = Depends(get_db), admin: Usuario = Depends(requer_admin)):
    if data.setor not in SETORES:
        raise HTTPException(400, f"Setor inválido. Opções: {SETORES}")

    if db.query(Usuario).filter(Usuario.email == data.email).first():
        raise HTTPException(400, "Email já cadastrado")

    if db.query(Usuario).filter(Usuario.empresa_id == admin.empresa_id, Usuario.matricula == data.matricula).first():
        raise HTTPException(400, "Matrícula já cadastrada")

    usuario = Usuario(
        empresa_id=admin.empresa_id,
        nome=data.nome,
        email=data.email,
        matricula=data.matricula,
        senha_hash=hash_senha(data.senha),
        setor=data.setor,
        cargo=data.cargo,
        admin=data.admin,
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    return {"id": usuario.id, "mensagem": "Usuário criado com sucesso"}


@router.put("/{usuario_id}")
def atualizar_usuario(usuario_id: int, data: UsuarioUpdate, db: Session = Depends(get_db),
                      admin: Usuario = Depends(requer_admin)):
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id, Usuario.empresa_id == admin.empresa_id).first()
    if not usuario:
        raise HTTPException(404, "Usuário não encontrado")

    for campo, valor in data.dict(exclude_none=True).items():
        setattr(usuario, campo, valor)

    db.commit()
    return {"mensagem": "Usuário atualizado"}


@router.delete("/{usuario_id}")
def desativar_usuario(usuario_id: int, db: Session = Depends(get_db), admin: Usuario = Depends(requer_admin)):
    if usuario_id == admin.id:
        raise HTTPException(400, "Não é possível desativar o próprio usuário")
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id, Usuario.empresa_id == admin.empresa_id).first()
    if not usuario:
        raise HTTPException(404, "Usuário não encontrado")
    usuario.ativo = False
    db.commit()
    return {"mensagem": "Usuário desativado"}


@router.post("/{usuario_id}/reativar")
def reativar_usuario(usuario_id: int, db: Session = Depends(get_db), admin: Usuario = Depends(requer_admin)):
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id, Usuario.empresa_id == admin.empresa_id).first()
    if not usuario:
        raise HTTPException(404, "Usuário não encontrado")
    usuario.ativo = True
    db.commit()
    return {"mensagem": "Usuário reativado"}


@router.post("/trocar-senha")
def trocar_senha(data: SenhaUpdate, db: Session = Depends(get_db), usuario: Usuario = Depends(get_usuario_atual)):
    from services.auth_service import verificar_senha
    if not verificar_senha(data.senha_atual, usuario.senha_hash):
        raise HTTPException(400, "Senha atual incorreta")
    usuario.senha_hash = hash_senha(data.nova_senha)
    db.commit()
    return {"mensagem": "Senha alterada com sucesso"}
