# ════════════════════════════════════════════════════════════
#  Dockerfile - Gestão Industrial (SaaS)
#  Constrói o frontend (React) e empacota junto com o backend
#  (FastAPI), que serve tudo em um único serviço/porta.
# ════════════════════════════════════════════════════════════

# ── Etapa 1: build do frontend ───────────────────────────────
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# ── Etapa 2: backend + frontend buildado ─────────────────────
FROM python:3.11-slim AS final
WORKDIR /app

# Dependências do sistema necessárias para psycopg2 e build
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY backend/ ./backend/
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

WORKDIR /app/backend

ENV PYTHONUNBUFFERED=1
EXPOSE 8000

CMD ["sh", "-c", "gunicorn main:app -k uvicorn.workers.UvicornWorker -b 0.0.0.0:${PORT:-8000} --workers 2 --timeout 120"]
