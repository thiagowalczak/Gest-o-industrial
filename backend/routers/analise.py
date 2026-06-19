from __future__ import annotations
import json
import os
from datetime import datetime

import requests
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db.local_db import AnaliseIA, get_db, Usuario
from routers.auth import get_usuario_atual
from services.dados_service import (
    resumo_dashboard,
    listar_estoque,
    listar_compras,
    listar_producao,
    SITUACOES_PRODUCAO,
)

router = APIRouter(prefix="/analise", tags=["Análise IA"])

PROMPT_TEMPLATE = """Você é um consultor especialista em gestão industrial. Analise os dados abaixo de uma empresa e retorne SOMENTE um JSON válido (sem texto antes ou depois) com a seguinte estrutura exata:

{{
  "resumo_geral": "parágrafo com diagnóstico geral da empresa em 3-5 linhas",
  "alertas": [
    {{"nivel": "alto|medio|baixo", "texto": "descrição do alerta"}}
  ],
  "recomendacoes": [
    {{"prioridade": "alta|media|baixa", "texto": "descrição da recomendação"}}
  ]
}}

Gere entre 2 e 6 alertas e entre 2 e 6 recomendações. Seja específico com os números do contexto. Retorne APENAS o JSON, sem markdown, sem explicações.

=== DADOS DA EMPRESA ===

## FINANCEIRO (próximos 30 dias)
- Total a receber: R$ {total_receber:.2f} ({qtd_receber} títulos)
- Total a pagar: R$ {total_pagar:.2f} ({qtd_pagar} títulos)
- Saldo previsto: R$ {saldo:.2f}

## ESTOQUE
- Total de itens cadastrados: {total_itens}
- Valor total em estoque: R$ {valor_estoque:.2f}
- Itens abaixo do estoque mínimo: {itens_criticos}

## COMPRAS
- Pedidos em aberto: {pedidos_abertos}
- Valor total dos pedidos: R$ {valor_pedidos:.2f}
- Pedidos entregues: {pedidos_entregues}

## PRODUÇÃO
- Ordens abertas: {ordens_abertas}
- Quantidade prevista: {qtd_prevista:.0f} unidades
- Quantidade produzida: {qtd_produzida:.0f} unidades
- Eficiência geral: {eficiencia:.1f}%
- Distribuição por situação: {dist_situacao}
"""


def _montar_prompt(db: Session, empresa_id: int) -> str:
    resumo = resumo_dashboard(db, empresa_id)
    estoque = listar_estoque(db, empresa_id)
    compras = listar_compras(db, empresa_id)
    producao = listar_producao(db, empresa_id, somente_abertas=False)

    itens_criticos = sum(
        1 for i in estoque
        if (i.estoque_minimo or 0) > 0 and (i.quantidade or 0) <= (i.estoque_minimo or 0)
    )

    pedidos_entregues = sum(1 for p in compras if (p.status or "") == "Pedido entregue")

    producao_ativas = [o for o in producao if (o.situacao or "").strip().upper() != "C"]
    qtd_prevista = sum(o.quantidade_prevista or 0 for o in producao_ativas)
    qtd_produzida = sum(o.quantidade_produzida or 0 for o in producao_ativas)
    eficiencia = round((qtd_produzida / qtd_prevista * 100) if qtd_prevista > 0 else 0, 1)

    dist_situacao = {}
    for o in producao:
        sit = SITUACOES_PRODUCAO.get((o.situacao or "").strip(), "Outro")
        dist_situacao[sit] = dist_situacao.get(sit, 0) + 1
    dist_str = ", ".join(f"{k}: {v}" for k, v in dist_situacao.items()) or "nenhuma"

    fin = resumo["financeiro"]
    est = resumo["estoque"]
    comp = resumo["compras"]
    prod = resumo["producao"]

    return PROMPT_TEMPLATE.format(
        total_receber=fin["total_receber_30d"],
        qtd_receber=fin["titulos_receber"],
        total_pagar=fin["total_pagar_30d"],
        qtd_pagar=fin["titulos_pagar"],
        saldo=fin["saldo_previsto"],
        total_itens=est["total_itens"],
        valor_estoque=est["valor_total"],
        itens_criticos=itens_criticos,
        pedidos_abertos=comp["pedidos_abertos"],
        valor_pedidos=comp["valor_total_pedidos"],
        pedidos_entregues=pedidos_entregues,
        ordens_abertas=prod["ordens_abertas"],
        qtd_prevista=qtd_prevista,
        qtd_produzida=qtd_produzida,
        eficiencia=eficiencia,
        dist_situacao=dist_str,
    )


@router.get("/ultima")
def ultima_analise(usuario: Usuario = Depends(get_usuario_atual), db: Session = Depends(get_db)):
    analise = (
        db.query(AnaliseIA)
        .filter(AnaliseIA.empresa_id == usuario.empresa_id)
        .order_by(AnaliseIA.criado_em.desc())
        .first()
    )
    if not analise:
        return {"analise": None}
    return {
        "analise": {
            "id": analise.id,
            "resultado": json.loads(analise.resultado),
            "criado_em": analise.criado_em.isoformat(),
        }
    }


@router.post("/gerar")
def gerar_analise(usuario: Usuario = Depends(get_usuario_atual), db: Session = Depends(get_db)):
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(503, "GEMINI_API_KEY não configurada no servidor")

    prompt = _montar_prompt(db, usuario.empresa_id)

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    try:
        resp = requests.post(url, json={"contents": [{"parts": [{"text": prompt}]}]}, timeout=60)
        if resp.status_code == 400:
            detalhe = resp.json().get("error", {}).get("message", "Requisição inválida")
            raise HTTPException(400, f"Erro na chave ou modelo: {detalhe}")
        if resp.status_code == 401 or resp.status_code == 403:
            raise HTTPException(401, "Chave da API inválida ou sem permissão. Verifique GEMINI_API_KEY no Render.")
        if resp.status_code == 429:
            raise HTTPException(429, "Limite de requisições da API atingido. Aguarde 1 minuto e tente novamente.")
        if not resp.ok:
            detalhe = ""
            try:
                detalhe = resp.json().get("error", {}).get("message", "")
            except Exception:
                pass
            raise HTTPException(502, f"Erro na API do Gemini ({resp.status_code}): {detalhe}")
        texto = resp.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
        if texto.startswith("```"):
            texto = texto.split("```")[1]
            if texto.startswith("json"):
                texto = texto[4:]
            texto = texto.strip()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(502, f"Erro ao chamar a API do Gemini: {str(e)}")

    try:
        resultado = json.loads(texto)
    except json.JSONDecodeError:
        raise HTTPException(500, f"A IA retornou formato inesperado: {texto[:200]}")

    nova = AnaliseIA(
        empresa_id=usuario.empresa_id,
        resultado=json.dumps(resultado, ensure_ascii=False),
    )
    db.add(nova)
    db.commit()
    db.refresh(nova)

    return {
        "analise": {
            "id": nova.id,
            "resultado": resultado,
            "criado_em": nova.criado_em.isoformat(),
        }
    }
