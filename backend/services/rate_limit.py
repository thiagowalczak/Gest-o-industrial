"""Limitador de tentativas em memória — protege /auth/login contra força bruta.

Sem dependência externa (Redis etc.): cada worker do gunicorn mantém sua
própria contagem, o que já reduz drasticamente a velocidade de um ataque
de força bruta para o perfil deste sistema.
"""
from __future__ import annotations
from collections import defaultdict
from datetime import datetime, timedelta
from threading import Lock

JANELA_MINUTOS = 15
MAX_TENTATIVAS = 10

_tentativas: dict[str, list[datetime]] = defaultdict(list)
_lock = Lock()


def excedeu_limite(identificador: str) -> bool:
    limite = datetime.utcnow() - timedelta(minutes=JANELA_MINUTOS)
    with _lock:
        ativas = [t for t in _tentativas[identificador] if t > limite]
        _tentativas[identificador] = ativas
        return len(ativas) >= MAX_TENTATIVAS


def registrar_tentativa_falha(identificador: str) -> None:
    with _lock:
        _tentativas[identificador].append(datetime.utcnow())


def limpar_tentativas(identificador: str) -> None:
    with _lock:
        _tentativas.pop(identificador, None)
