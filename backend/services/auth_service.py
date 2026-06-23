from __future__ import annotations
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from fastapi import HTTPException
from sqlalchemy.orm import Session
from db.local_db import Usuario, Empresa
from typing import Optional
import os

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.getenv("SECRET_KEY", "chave-padrao-troque-em-producao")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))


def hash_senha(senha: str) -> str:
    return pwd_context.hash(senha)


def verificar_senha(senha: str, hash: str) -> bool:
    return pwd_context.verify(senha, hash)


def criar_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(minutes=EXPIRE_MINUTES)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decodificar_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None


def autenticar_usuario(db: Session, email: str, senha: str) -> Optional[Usuario]:
    usuario = db.query(Usuario).filter(Usuario.email == email, Usuario.ativo == True).first()
    if not usuario or not verificar_senha(senha, usuario.senha_hash):
        return None
    if usuario.empresa and not usuario.empresa.ativo:
        raise HTTPException(status_code=403, detail="Empresa inativa. Contate o suporte.")
    usuario.ultimo_acesso = datetime.utcnow()
    db.commit()
    return usuario


def criar_admin_padrao(db: Session):
    existe = db.query(Usuario).filter(Usuario.email == "admin@empresa.com").first()
    if not existe:
        empresa = db.query(Empresa).filter(Empresa.nome == "Empresa Demo").first()
        if not empresa:
            empresa = Empresa(nome="Empresa Demo", plano="trial")
            db.add(empresa)
            db.commit()
            db.refresh(empresa)

        admin = Usuario(
            empresa_id=empresa.id,
            nome="Administrador",
            email="admin@empresa.com",
            matricula="ADM001",
            senha_hash=hash_senha("Admin@123"),
            setor="admin",
            cargo="Administrador do Sistema",
            admin=True,
            super_admin=True,
        )
        db.add(admin)
        db.commit()
