# Gestão Industrial — Guia de Instalação

## Pré-requisitos
- Python 3.11+
- Node.js 18+
- ODBC Driver 17 for SQL Server (para conectar ao Protheus)

---

## 1. Configurar o Backend

```bash
cd gestao-industrial/backend

# Criar ambiente virtual
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

# Instalar dependências
pip install -r requirements.txt

# Copiar e editar configurações
cp .env.example .env
# Edite o .env com as credenciais do Protheus e chave secreta
```

### Variáveis obrigatórias no `.env`:
| Variável | Descrição |
|----------|-----------|
| `PROTHEUS_SERVER` | IP do servidor SQL Server do Protheus |
| `PROTHEUS_DATABASE` | Nome do banco (ex: `PROTHEUS`) |
| `PROTHEUS_USER` | Usuário com acesso de leitura |
| `PROTHEUS_PASSWORD` | Senha do usuário |
| `SECRET_KEY` | Chave aleatória para JWT (mín. 32 chars) |

### Iniciar o backend:
```bash
python main.py
# Servidor rodando em http://localhost:8000
# Documentação da API: http://localhost:8000/docs
```

**Credenciais padrão criadas automaticamente:**
- Email: `admin@empresa.com`
- Senha: `Admin@123`
> Troque a senha no primeiro acesso!

---

## 2. Configurar o Frontend

```bash
cd gestao-industrial/frontend
npm install
npm run dev
# Interface rodando em http://localhost:5173
```

---

## 3. Permissões no Protheus (SQL Server)

Crie um usuário de leitura com acesso às tabelas:

```sql
-- Tabelas necessárias
GRANT SELECT ON SB1010 TO usuario_leitura;  -- Produtos
GRANT SELECT ON SB2010 TO usuario_leitura;  -- Saldos em estoque
GRANT SELECT ON SC7010 TO usuario_leitura;  -- Pedidos de compra
GRANT SELECT ON SC2010 TO usuario_leitura;  -- Ordens de produção
GRANT SELECT ON SE1010 TO usuario_leitura;  -- Contas a receber
GRANT SELECT ON SE2010 TO usuario_leitura;  -- Contas a pagar
GRANT SELECT ON SA1010 TO usuario_leitura;  -- Clientes
GRANT SELECT ON SA2010 TO usuario_leitura;  -- Fornecedores
```

---

## 4. Estrutura de Acesso por Setor

| Setor | Acesso |
|-------|--------|
| `admin` | Todos os módulos + Administração |
| `diretoria` | Todos os módulos (somente leitura) |
| `financeiro` | Dashboard + Financeiro |
| `compras` | Dashboard + Estoque + Compras |
| `estoque` | Dashboard + Estoque |
| `producao` | Dashboard + Produção |

---

## 5. Deploy em Rede Local

Para acessar de qualquer computador na rede:

```bash
# Backend — escuta em todas as interfaces
python main.py  # já configurado com host=0.0.0.0

# Frontend — build de produção
npm run build
# Servir a pasta dist/ com nginx ou qualquer servidor web
```
