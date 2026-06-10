#!/bin/bash
PASTA="$(cd "$(dirname "$0")" && pwd)"

echo "Iniciando o sistema Gestão Industrial..."

# Abre o backend em uma nova janela do Terminal
osascript -e "tell application \"Terminal\" to do script \"bash '$PASTA/INICIAR-BACKEND.sh'\""

sleep 3

# Abre o frontend em outra janela do Terminal
osascript -e "tell application \"Terminal\" to do script \"bash '$PASTA/INICIAR-FRONTEND.sh'\""

sleep 4

# Abre o navegador
open http://localhost:5173

echo ""
echo "✅ Sistema iniciado!"
echo "Acesse: http://localhost:5173"
echo ""
echo "Login:"
echo "  Email: admin@empresa.com"
echo "  Senha: Admin@123"
