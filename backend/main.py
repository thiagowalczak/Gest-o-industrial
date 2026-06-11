from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
from sqlalchemy.orm import Session
import os

from db.local_db import criar_tabelas, SessionLocal
from services.auth_service import criar_admin_padrao
from routers import auth, usuarios, dashboard, financeiro, estoque, producao, admin

from dotenv import load_dotenv
load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    criar_tabelas()
    db: Session = SessionLocal()
    try:
        criar_admin_padrao(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title=os.getenv("APP_NAME", "Gestão Industrial"),
    version="1.0.0",
    lifespan=lifespan,
)

# Origens extras liberadas via variável de ambiente (separadas por vírgula)
origens_extra = [o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", *origens_extra] or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Em desenvolvimento, o Vite usa um proxy que remove o prefixo "/api"
# antes de chamar o backend. Em produção (servido pelo próprio backend),
# o frontend chama diretamente "/api/...", então registramos as mesmas
# rotas duas vezes: sem prefixo (compatibilidade) e com prefixo "/api".
for roteador in (auth.router, usuarios.router, dashboard.router, financeiro.router, estoque.router, producao.router, admin.router):
    app.include_router(roteador)
    app.include_router(roteador, prefix="/api")


@app.get("/health")
def health():
    return {"status": "online", "app": os.getenv("APP_NAME", "Gestão Industrial")}


# ── SERVIR O FRONTEND (build de produção) ────────────────────────────────────
# Quando o frontend é compilado (npm run build), os arquivos vão para
# frontend/dist. Em produção, o próprio backend serve esses arquivos,
# então só é necessário rodar UM serviço (o backend).
FRONTEND_DIST = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")

if os.path.isdir(FRONTEND_DIST):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIST, "assets")), name="assets")

    @app.get("/{full_path:path}")
    def servir_frontend(full_path: str):
        # As rotas de API registradas acima têm prioridade; isto só
        # responde para caminhos que não bateram em nenhuma rota da API.
        caminho_arquivo = os.path.join(FRONTEND_DIST, full_path)
        if full_path and os.path.isfile(caminho_arquivo):
            return FileResponse(caminho_arquivo)
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=os.getenv("ENV") != "production")
