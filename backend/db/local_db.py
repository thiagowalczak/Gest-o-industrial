from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, Float, Text, ForeignKey, inspect
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy import text
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

# ── Conexão com o banco de dados ─────────────────────────────────────────────
# Em produção (SaaS), defina DATABASE_URL apontando para o PostgreSQL
# (ex.: postgresql://usuario:senha@host:5432/banco)
# Em desenvolvimento local, usamos SQLite por padrão.
DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    # Render/Heroku às vezes fornecem "postgres://" — o SQLAlchemy moderno exige "postgresql://"
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)
else:
    DB_PATH = os.getenv("LOCAL_DB_PATH", "./gestao_local.db")
    engine = create_engine(f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# ── EMPRESA (TENANT) ──────────────────────────────────────────────────────────
class Empresa(Base):
    __tablename__ = "empresas"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(150), nullable=False)
    cnpj = Column(String(20))
    plano = Column(String(20), default="trial")  # trial, pro, etc.
    ativo = Column(Boolean, default=True)
    criado_em = Column(DateTime, default=datetime.utcnow)

    usuarios = relationship("Usuario", back_populates="empresa")


class Usuario(Base):
    __tablename__ = "usuarios"
    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=False, index=True)
    nome = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    matricula = Column(String(20), nullable=False)
    senha_hash = Column(String(200), nullable=False)
    setor = Column(String(50), nullable=False)  # financeiro, compras, estoque, producao, admin, diretoria
    cargo = Column(String(100))
    ativo = Column(Boolean, default=True)
    admin = Column(Boolean, default=False)
    criado_em = Column(DateTime, default=datetime.utcnow)
    ultimo_acesso = Column(DateTime)

    empresa = relationship("Empresa", back_populates="usuarios")


class AlertaEstoque(Base):
    __tablename__ = "alertas_estoque"
    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=False, index=True)
    produto_codigo = Column(String(20), nullable=False)
    produto_descricao = Column(String(200))
    estoque_atual = Column(Float)
    estoque_minimo = Column(Float)
    status = Column(String(20), default="pendente")  # pendente, resolvido, ignorado
    criado_em = Column(DateTime, default=datetime.utcnow)
    resolvido_em = Column(DateTime)


class LogAtividade(Base):
    __tablename__ = "log_atividades"
    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=False, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"))
    acao = Column(String(200), nullable=False)
    modulo = Column(String(50))
    detalhes = Column(Text)
    ip = Column(String(50))
    criado_em = Column(DateTime, default=datetime.utcnow)


# ── IMPORTAÇÕES ────────────────────────────────────────────────────────────────
class ImportacaoLog(Base):
    __tablename__ = "importacoes_log"
    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=False, index=True)
    modulo = Column(String(30), nullable=False)  # financeiro, estoque, producao, compras
    nome_arquivo = Column(String(200))
    total_registros = Column(Integer, default=0)
    criado_em = Column(DateTime, default=datetime.utcnow)


# ── ESTOQUE ────────────────────────────────────────────────────────────────────
class ItemEstoque(Base):
    __tablename__ = "itens_estoque"
    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=False, index=True)
    codigo = Column(String(30), nullable=False)
    descricao = Column(String(200), nullable=False)
    deposito = Column(String(20))
    quantidade = Column(Float, default=0)
    custo_medio = Column(Float, default=0)
    unidade = Column(String(10))
    grupo = Column(String(20))
    estoque_minimo = Column(Float, default=0)
    ponto_reposicao = Column(Float, default=0)
    importacao_id = Column(Integer, nullable=True)
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ── COMPRAS ────────────────────────────────────────────────────────────────────
class PedidoCompra(Base):
    __tablename__ = "pedidos_compra"
    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=False, index=True)
    numero = Column(String(30), nullable=False)
    item = Column(String(10), default="01")
    produto = Column(String(30))
    descricao = Column(String(200))
    quantidade = Column(Float, default=0)
    preco_unitario = Column(Float, default=0)
    valor_total = Column(Float, default=0)
    data_entrega = Column(String(8))  # AAAAMMDD
    fornecedor = Column(String(30))
    nome_fornecedor = Column(String(150))
    status = Column(String(20), default="Pedido feito")
    importacao_id = Column(Integer, nullable=True)
    criado_em = Column(DateTime, default=datetime.utcnow)


# ── FINANCEIRO ─────────────────────────────────────────────────────────────────
class TituloFinanceiro(Base):
    __tablename__ = "titulos_financeiros"
    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=False, index=True)
    tipo = Column(String(10), nullable=False)  # receber | pagar
    titulo = Column(String(30), nullable=False)
    contraparte_codigo = Column(String(30))
    contraparte_nome = Column(String(150))
    emissao = Column(String(8))   # AAAAMMDD
    vencimento = Column(String(8))  # AAAAMMDD
    valor = Column(Float, default=0)
    saldo = Column(Float, default=0)
    tipo_doc = Column(String(10), default="NF")
    importacao_id = Column(Integer, nullable=True)
    criado_em = Column(DateTime, default=datetime.utcnow)


# ── PRODUÇÃO ───────────────────────────────────────────────────────────────────
class OrdemProducao(Base):
    __tablename__ = "ordens_producao"
    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=False, index=True)
    numero = Column(String(30), nullable=False)
    item = Column(String(10), default="01")
    produto = Column(String(30))
    descricao = Column(String(200))
    quantidade_prevista = Column(Float, default=0)
    quantidade_produzida = Column(Float, default=0)
    data_inicio = Column(String(8))
    data_fim = Column(String(8))
    situacao = Column(String(2), default="A")  # A,L,P,E,C
    importacao_id = Column(Integer, nullable=True)
    criado_em = Column(DateTime, default=datetime.utcnow)


def criar_tabelas():
    Base.metadata.create_all(bind=engine)


def migrar_tabelas():
    """Adiciona colunas novas em tabelas existentes de forma idempotente."""
    insp = inspect(engine)
    novas_colunas = [
        ("itens_estoque", "importacao_id", "INTEGER"),
        ("titulos_financeiros", "importacao_id", "INTEGER"),
        ("pedidos_compra", "importacao_id", "INTEGER"),
        ("ordens_producao", "importacao_id", "INTEGER"),
    ]
    with engine.connect() as conn:
        for tabela, coluna, tipo in novas_colunas:
            try:
                cols = [c["name"] for c in insp.get_columns(tabela)]
            except Exception:
                cols = []
            if coluna not in cols:
                try:
                    conn.execute(text(f"ALTER TABLE {tabela} ADD COLUMN {coluna} {tipo}"))
                    conn.commit()
                except Exception:
                    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
