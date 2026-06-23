"""Envio de e-mails transacionais via API REST da Resend (sem SDK externo)."""
from __future__ import annotations
import os
import requests

RESEND_API_URL = "https://api.resend.com/emails"


def enviar_email(destinatario: str, assunto: str, corpo_html: str) -> bool:
    """Envia um e-mail via Resend. Retorna True se enviado, False se a API não estiver configurada ou falhar."""
    api_key = os.environ.get("RESEND_API_KEY")
    remetente = os.environ.get("RESEND_FROM_EMAIL", "onboarding@resend.dev")
    if not api_key:
        return False

    try:
        resp = requests.post(
            RESEND_API_URL,
            headers={"Authorization": f"Bearer {api_key}"},
            json={"from": remetente, "to": [destinatario], "subject": assunto, "html": corpo_html},
            timeout=15,
        )
        return resp.ok
    except Exception:
        return False


def enviar_email_recuperacao_senha(destinatario: str, nome: str, link: str) -> bool:
    corpo_html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #f97316;">Gestão Industrial</h2>
      <p>Olá, {nome}.</p>
      <p>Recebemos um pedido para redefinir sua senha. Clique no link abaixo para criar uma nova senha:</p>
      <p style="margin: 24px 0;">
        <a href="{link}" style="background: #f97316; color: white; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: bold;">
          Redefinir senha
        </a>
      </p>
      <p style="color: #666; font-size: 13px;">Este link expira em 1 hora. Se você não solicitou isso, pode ignorar este e-mail.</p>
    </div>
    """
    return enviar_email(destinatario, "Redefinição de senha — Gestão Industrial", corpo_html)
