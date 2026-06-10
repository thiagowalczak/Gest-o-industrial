#!/bin/bash
cd "$(dirname "$0")/backend"
source venv/bin/activate
echo ""
echo " ✅ Servidor rodando! NÃO feche esta janela."
echo " Acesse: http://localhost:5173"
echo ""
python3 main.py
