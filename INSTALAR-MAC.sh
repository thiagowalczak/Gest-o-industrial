#!/bin/bash
clear

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║         GESTÃO INDUSTRIAL — INSTALADOR MAC           ║"
echo "║         Versão 1.0                                   ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
echo " Este programa vai instalar tudo automaticamente."
echo " Não feche esta janela enquanto estiver instalando!"
echo ""
read -p " Pressione ENTER para começar..." _

# Ir para a pasta do script
cd "$(dirname "$0")"

# ── VERIFICAR PYTHON ──────────────────────────────────────
echo ""
echo "[1/5] Verificando Python..."
if ! command -v python3 &>/dev/null; then
    echo ""
    echo " PYTHON NÃO ENCONTRADO!"
    echo " Abrindo o site para baixar o Python..."
    open "https://www.python.org/downloads/macos/"
    echo ""
    echo " Após instalar o Python, feche e abra este script novamente."
    read -p " Pressione ENTER para sair..." _
    exit 1
fi
echo " $(python3 --version) — OK!"

# ── VERIFICAR NODE.JS ─────────────────────────────────────
echo ""
echo "[2/5] Verificando Node.js..."
NODE_CMD=""
for candidate in node "$HOME/node/bin/node" /usr/local/bin/node /opt/homebrew/bin/node; do
    if command -v "$candidate" &>/dev/null || [ -x "$candidate" ]; then
        NODE_CMD="$candidate"
        NPM_CMD="$(dirname $NODE_CMD)/npm"
        break
    fi
done

if [ -z "$NODE_CMD" ]; then
    echo ""
    echo " NODE.JS NÃO ENCONTRADO!"
    echo " Abrindo o site para baixar o Node.js..."
    open "https://nodejs.org/"
    echo ""
    echo " Após instalar o Node.js, feche e abra este script novamente."
    read -p " Pressione ENTER para sair..." _
    exit 1
fi
echo " $($NODE_CMD --version) — OK!"

# ── INSTALAR BACKEND ──────────────────────────────────────
echo ""
echo "[3/5] Instalando o backend (servidor)..."
cd backend

if [ ! -d "venv" ]; then
    echo " Criando ambiente virtual Python..."
    python3 -m venv venv
fi

echo " Instalando dependências Python..."
source venv/bin/activate
pip install -r requirements.txt -q --disable-pip-version-check
if [ $? -ne 0 ]; then
    echo ""
    echo " ERRO ao instalar dependências Python!"
    echo " Verifique sua conexão com a internet."
    read -p " Pressione ENTER para sair..." _
    exit 1
fi
deactivate
echo " Backend instalado com sucesso!"
cd ..

# ── INSTALAR FRONTEND ─────────────────────────────────────
echo ""
echo "[4/5] Instalando o frontend (interface visual)..."
cd frontend
echo " Instalando dependências Node.js (pode demorar alguns minutos)..."
PATH="$(dirname $NODE_CMD):$PATH" $NPM_CMD install --silent
if [ $? -ne 0 ]; then
    echo ""
    echo " ERRO ao instalar o frontend!"
    read -p " Pressione ENTER para sair..." _
    exit 1
fi
echo " Frontend instalado com sucesso!"
cd ..

# ── CONFIGURAR .ENV ───────────────────────────────────────
echo ""
echo "[5/5] Configurando o sistema..."
if [ ! -f "backend/.env" ]; then
    cp backend/.env.example backend/.env
    echo " Arquivo de configuração criado!"
    echo " TOTVS desabilitado por padrão (modo demo)"
else
    echo " Configuração já existe, mantendo a atual."
fi

# ── CRIAR SCRIPTS DE INÍCIO ───────────────────────────────
NODE_DIR="$(dirname $NODE_CMD)"

cat > INICIAR-BACKEND.sh << SCRIPT
#!/bin/bash
cd "\$(dirname "\$0")/backend"
source venv/bin/activate
echo ""
echo " Servidor rodando! Não feche esta janela."
echo " Acesse: http://localhost:5173"
echo ""
python3 main.py
SCRIPT

cat > INICIAR-FRONTEND.sh << SCRIPT
#!/bin/bash
export PATH="$NODE_DIR:\$PATH"
cd "\$(dirname "\$0")/frontend"
echo " Abrindo interface..."
npm run dev
SCRIPT

cat > INICIAR-SISTEMA.sh << SCRIPT
#!/bin/bash
DIR="\$(dirname "\$0")"
echo "Iniciando o sistema..."
osascript -e 'tell application "Terminal" to do script "bash \"'"$PWD"'/INICIAR-BACKEND.sh\""'
sleep 3
osascript -e 'tell application "Terminal" to do script "bash \"'"$PWD"'/INICIAR-FRONTEND.sh\""'
sleep 4
open http://localhost:5173
echo ""
echo "Sistema iniciado!"
echo "Acesse: http://localhost:5173"
echo ""
echo "Login:"
echo "  Email: admin@empresa.com"
echo "  Senha: Admin@123"
SCRIPT

chmod +x INICIAR-BACKEND.sh INICIAR-FRONTEND.sh INICIAR-SISTEMA.sh

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║             INSTALAÇÃO CONCLUÍDA!                    ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║                                                      ║"
echo "║  TOTVS Protheus: DESABILITADO (modo demo)           ║"
echo "║  O sistema já está pronto para usar!                 ║"
echo "║                                                      ║"
echo "║  Para iniciar, execute:                              ║"
echo "║    bash INICIAR-SISTEMA.sh                           ║"
echo "║                                                      ║"
echo "║  Login padrão:                                       ║"
echo "║    Email: admin@empresa.com                          ║"
echo "║    Senha: Admin@123                                  ║"
echo "║                                                      ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
read -p " Deseja iniciar o sistema agora? (s/n): " resposta
if [[ "$resposta" =~ ^[Ss]$ ]]; then
    bash INICIAR-SISTEMA.sh
fi
