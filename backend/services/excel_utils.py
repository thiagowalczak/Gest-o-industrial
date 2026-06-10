"""Funções utilitárias para leitura de planilhas Excel enviadas pelos usuários."""
from __future__ import annotations
import io
import unicodedata
from datetime import datetime
from typing import Optional

import openpyxl


def normalizar(texto) -> str:
    texto = str(texto or "").strip().lower()
    texto = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode()
    return texto


def converter_data(valor) -> str:
    """Converte célula de data para o formato AAAAMMDD usado internamente."""
    if isinstance(valor, datetime):
        return valor.strftime("%Y%m%d")
    texto = str(valor or "").strip()
    if not texto:
        return ""
    if "/" in texto:
        partes = texto.split("/")
        if len(partes) == 3:
            d, m, a = partes
            if len(a) == 2:
                a = "20" + a
            return f"{a}{m.zfill(2)}{d.zfill(2)}"
    if "-" in texto and len(texto) == 10:
        a, m, d = texto.split("-")
        return f"{a}{m.zfill(2)}{d.zfill(2)}"
    return texto


def ler_linhas(conteudo: bytes, mapa_colunas: dict, planilha: Optional[str] = None) -> list[dict]:
    """
    Lê um arquivo .xlsx e retorna uma lista de dicionários, mapeando os
    cabeçalhos da planilha (normalizados) para as chaves internas definidas
    em `mapa_colunas` (ex.: {"codigo do produto": "codigo", ...}).
    Colunas não reconhecidas são ignoradas.
    """
    wb = openpyxl.load_workbook(io.BytesIO(conteudo), data_only=True)
    ws = wb[planilha] if planilha and planilha in wb.sheetnames else wb.active

    chaves_colunas = [mapa_colunas.get(normalizar(cel.value)) for cel in ws[1]]

    linhas = []
    for row in ws.iter_rows(min_row=2, values_only=True):
        if not any(v is not None and str(v).strip() != "" for v in row):
            continue
        item = {}
        for chave, valor in zip(chaves_colunas, row):
            if chave:
                item[chave] = valor
        if item:
            linhas.append(item)
    return linhas
