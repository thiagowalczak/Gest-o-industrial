# Como colocar o Gestão Industrial no ar (SaaS)

Este guia explica, passo a passo e em português simples, como
publicar o sistema na internet para que qualquer empresa possa
criar sua própria conta e usar o painel — sem precisar instalar
nada no computador.

O sistema agora é **multiempresa (SaaS)**: cada empresa que se
cadastra tem seus próprios usuários, estoque, financeiro,
produção e compras, totalmente separados das demais.

---

## 1. O que mudou

- Não depende mais do TOTVS Protheus nem de planilhas em pastas
  locais.
- Qualquer pessoa pode criar uma conta da própria empresa pela
  tela "Criar conta gratuita" (`/cadastro`).
- Os dados ficam em um banco de dados na nuvem (PostgreSQL em
  produção, ou um arquivo SQLite quando você roda localmente).
- O frontend (React) e o backend (FastAPI) são publicados juntos,
  em um único serviço — mais simples e mais barato.

---

## 2. Testando no seu computador (opcional, antes de publicar)

### Backend
```bash
cd backend
python3 -m venv venv          # se ainda não tiver
source venv/bin/activate
pip install -r requirements.txt
python3 main.py
```
O backend sobe em `http://localhost:8000`.

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Acesse `http://localhost:5173`. Clique em "Criar conta gratuita"
para testar o cadastro de uma empresa.

> Em modo local, sem `DATABASE_URL`, o sistema usa um arquivo
> `backend/gestao_local.db` (SQLite). Pode apagar esse arquivo a
> qualquer momento para começar do zero.

---

## 3. Publicando na internet (recomendado: Render.com)

O Render é gratuito para começar, tem banco de dados PostgreSQL
incluso e funciona muito bem com o `Dockerfile` já incluído no
projeto.

### Passo 1 — Subir o projeto para o GitHub
1. Crie uma conta em https://github.com (se não tiver).
2. Crie um repositório novo, por exemplo `gestao-industrial`.
3. No terminal, dentro da pasta do projeto:
   ```bash
   git init
   git add .
   git commit -m "Sistema Gestão Industrial - versão SaaS"
   git branch -M main
   git remote add origin https://github.com/SEU-USUARIO/gestao-industrial.git
   git push -u origin main
   ```

### Passo 2 — Criar conta no Render
1. Acesse https://render.com e crie uma conta (pode usar login
   com GitHub, fica mais fácil).

### Passo 3 — Criar o serviço usando o "Blueprint" (render.yaml)
1. No painel do Render, clique em **New** → **Blueprint**.
2. Selecione o repositório `gestao-industrial` que você acabou
   de subir.
3. O Render vai detectar o arquivo `render.yaml` automaticamente
   e propor a criação de:
   - Um **Web Service** (o sistema em si, usando o `Dockerfile`)
   - Um **banco de dados PostgreSQL** gratuito
4. Clique em **Apply** / **Create**.
5. Aguarde alguns minutos enquanto o Render constrói a imagem
   (build do frontend + backend) e inicia o serviço.

### Passo 4 — Acessar o sistema
1. Quando o deploy terminar, o Render mostra uma URL parecida
   com `https://gestao-industrial.onrender.com`.
2. Acesse essa URL — você verá a tela de login do sistema.
3. Clique em **"Criar conta gratuita"**, preencha o nome da sua
   empresa, seu nome, e-mail e senha.
4. Pronto! Você já está dentro do painel da sua empresa.

> Cada nova empresa que clicar em "Criar conta gratuita" terá seu
> próprio espaço, totalmente isolado dos demais.

---

## 4. Variáveis de ambiente importantes

Essas variáveis já são configuradas automaticamente pelo
`render.yaml`, mas é bom saber o que cada uma faz:

| Variável | Para que serve |
|---|---|
| `DATABASE_URL` | Conexão com o banco PostgreSQL (gerada automaticamente pelo Render) |
| `SECRET_KEY` | Chave secreta usada para gerar os tokens de login (gerada automaticamente) |
| `CORS_ORIGINS` | Domínios extras autorizados a acessar a API (deixe vazio se o frontend e o backend estão no mesmo domínio) |
| `APP_NAME` | Nome do sistema exibido nas respostas da API |
| `PORT` | Porta usada pelo servidor (definida automaticamente pelo Render) |

---

## 5. Domínio próprio (opcional)

No painel do Render, vá em **Settings → Custom Domains** do seu
serviço e siga as instruções para apontar um domínio seu (ex:
`app.suaempresa.com.br`) para o sistema.

---

## 6. Atualizando o sistema depois de publicado

Sempre que você quiser enviar uma atualização:
```bash
git add .
git commit -m "Descrição da mudança"
git push
```
O Render detecta o novo commit e refaz o deploy automaticamente.

---

## 7. Outras opções de hospedagem

O projeto inclui um `Dockerfile` padrão, então também funciona em:
- **Railway.app** (similar ao Render, também tem PostgreSQL gratuito)
- **Fly.io**
- Qualquer VPS (DigitalOcean, AWS, etc.) rodando Docker — basta
  rodar:
  ```bash
  docker build -t gestao-industrial .
  docker run -p 8000:8000 -e DATABASE_URL=postgresql://... -e SECRET_KEY=... gestao-industrial
  ```

---

## Dúvidas comuns

**"Esqueci a senha do administrador da minha empresa"**
Por enquanto, a recuperação de senha precisa ser feita
diretamente no banco de dados ou criando uma nova conta de
empresa. Um fluxo de "esqueci minha senha" pode ser adicionado
depois.

**"Posso ter várias empresas usando o mesmo sistema publicado?"**
Sim! É exatamente para isso que o sistema foi adaptado. Cada
cadastro feito em "/cadastro" cria uma empresa nova e isolada.

**"O plano gratuito do Render é suficiente?"**
Para testar e começar, sim. Para uso contínuo com vários
usuários, recomenda-se migrar para um plano pago (o serviço
gratuito "dorme" após um tempo sem uso e demora alguns segundos
para acordar na próxima visita).
