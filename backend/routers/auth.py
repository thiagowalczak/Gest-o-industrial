from __future__ import annotations
import os
import secrets
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel
from db.local_db import get_db, Usuario, LogAtividade
from services.auth_service import autenticar_usuario, criar_token, decodificar_token, hash_senha
from services.email_service import enviar_email_recuperacao_senha

router = APIRouter(prefix="/auth", tags=["Autenticação"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

TOKEN_RECUPERACAO_VALIDADE_MINUTOS = 60


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    usuario: dict


class EsqueciSenhaBody(BaseModel):
    email: str


class RedefinirSenhaBody(BaseModel):
    token: str
    nova_senha: str


def get_usuario_atual(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> Usuario:
    payload = decodificar_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado")
    usuario = db.query(Usuario).filter(Usuario.id == payload.get("sub")).first()
    if not usuario or not usuario.ativo:
        raise HTTPException(status_code=401, detail="Usuário não encontrado")
    return usuario


def requer_admin(usuario: Usuario = Depends(get_usuario_atual)) -> Usuario:
    if not usuario.admin:
        raise HTTPException(status_code=403, detail="Acesso restrito a administradores")
    return usuario


def requer_super_admin(usuario: Usuario = Depends(get_usuario_atual)) -> Usuario:
    if not usuario.super_admin:
        raise HTTPException(status_code=403, detail="Acesso restrito ao administrador da plataforma")
    return usuario


def requer_painel_central(usuario: Usuario = Depends(get_usuario_atual)) -> Usuario:
    if not usuario.admin and usuario.setor != "financeiro":
        raise HTTPException(status_code=403, detail="Acesso restrito ao Financeiro e à Administração")
    return usuario


def _resposta_usuario(usuario: Usuario) -> dict:
    return {
        "id": usuario.id,
        "empresa_id": usuario.empresa_id,
        "empresa_nome": usuario.empresa.nome if usuario.empresa else None,
        "nome": usuario.nome,
        "email": usuario.email,
        "setor": usuario.setor,
        "cargo": usuario.cargo,
        "admin": usuario.admin,
        "super_admin": usuario.super_admin,
    }


@router.post("/login", response_model=TokenResponse)
def login(form: OAuth2PasswordRequestForm = Depends(), request: Request = None, db: Session = Depends(get_db)):
    usuario = autenticar_usuario(db, form.username, form.password)
    if not usuario:
        raise HTTPException(status_code=401, detail="Email ou senha incorretos")

    token = criar_token({"sub": str(usuario.id), "empresa_id": usuario.empresa_id, "email": usuario.email, "setor": usuario.setor})

    log = LogAtividade(
        empresa_id=usuario.empresa_id,
        usuario_id=usuario.id,
        acao="Login realizado",
        modulo="auth",
        ip=request.client.host if request else None,
    )
    db.add(log)
    db.commit()

    return {
        "access_token": token,
        "token_type": "bearer",
        "usuario": _resposta_usuario(usuario),
    }


@router.get("/me")
def me(usuario: Usuario = Depends(get_usuario_atual)):
    return {
        **_resposta_usuario(usuario),
        "ultimo_acesso": usuario.ultimo_acesso,
    }


@router.post("/esqueci-senha")
def esqueci_senha(body: EsqueciSenhaBody, db: Session = Depends(get_db)):
    mensagem = {"mensagem": "Se o e-mail informado existir em nossa base, você receberá um link de redefinição."}

    usuario = db.query(Usuario).filter(Usuario.email == body.email, Usuario.ativo == True).first()
    if not usuario:
        return mensagem

    token = secrets.token_urlsafe(32)
    usuario.token_recuperacao = token
    usuario.token_recuperacao_expira = datetime.utcnow() + timedelta(minutes=TOKEN_RECUPERACAO_VALIDADE_MINUTOS)
    db.commit()

    app_url = os.getenv("APP_URL", "http://localhost:5173")
    link = f"{app_url}/redefinir-senha?token={token}"
    enviar_email_recuperacao_senha(usuario.email, usuario.nome, link)

    return mensagem


@router.post("/redefinir-senha")
def redefinir_senha(body: RedefinirSenhaBody, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.token_recuperacao == body.token).first()
    if not usuario or not usuario.token_recuperacao_expira or usuario.token_recuperacao_expira < datetime.utcnow():
        raise HTTPException(400, "Link inválido ou expirado. Solicite uma nova redefinição.")

    usuario.senha_hash = hash_senha(body.nova_senha)
    usuario.token_recuperacao = None
    usuario.token_recuperacao_expira = None
    db.commit()
    return {"mensagem": "Senha redefinida com sucesso. Faça login com a nova senha."}
