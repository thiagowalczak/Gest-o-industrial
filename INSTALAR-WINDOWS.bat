@echo off
chcp 65001 >nul
color 0E
title Instalador - Gestão Industrial

echo.
echo  ╔══════════════════════════════════════════════════════╗
echo  ║         GESTÃO INDUSTRIAL — INSTALADOR               ║
echo  ║         Versão 1.0 — Windows 10/11                   ║
echo  ╚══════════════════════════════════════════════════════╝
echo.
echo  Este programa vai instalar tudo automaticamente.
echo  Não feche esta janela enquanto a instalação estiver rodando!
echo.
pause

:: ─── VERIFICAR PASTA ──────────────────────────────────────
cd /d "%~dp0"

:: ─── VERIFICAR PYTHON ──────────────────────────────────────
echo.
echo [1/5] Verificando Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo  PYTHON NÃO ENCONTRADO!
    echo  Abrindo o site para baixar o Python...
    echo  IMPORTANTE: Na tela de instalação, marque a opção
    echo              "Add Python to PATH" antes de instalar!
    echo.
    start https://www.python.org/ftp/python/3.12.3/python-3.12.3-amd64.exe
    echo.
    echo  Após instalar o Python, feche e abra este arquivo novamente.
    pause
    exit
)
for /f "tokens=2" %%v in ('python --version 2^>^&1') do echo  Python %%v - OK!

:: ─── VERIFICAR NODE.JS ─────────────────────────────────────
echo.
echo [2/5] Verificando Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo  NODE.JS NÃO ENCONTRADO!
    echo  Abrindo o site para baixar o Node.js...
    echo.
    start https://nodejs.org/dist/v20.14.0/node-v20.14.0-x64.msi
    echo.
    echo  Após instalar o Node.js, feche e abra este arquivo novamente.
    pause
    exit
)
for /f %%v in ('node --version 2^>^&1') do echo  Node.js %%v - OK!

:: ─── INSTALAR BACKEND ──────────────────────────────────────
echo.
echo [3/5] Instalando o backend (servidor)...
cd backend

if not exist venv (
    echo  Criando ambiente virtual Python...
    python -m venv venv
)

echo  Instalando dependências Python...
call venv\Scripts\activate.bat
pip install -r requirements.txt -q --disable-pip-version-check
if errorlevel 1 (
    echo.
    echo  ERRO ao instalar dependências Python!
    echo  Verifique sua conexão com a internet e tente novamente.
    pause
    exit
)
echo  Backend instalado com sucesso!
cd ..

:: ─── INSTALAR FRONTEND ─────────────────────────────────────
echo.
echo [4/5] Instalando o frontend (interface visual)...
cd frontend
echo  Instalando dependências Node.js (pode demorar alguns minutos)...
call npm install --silent
if errorlevel 1 (
    echo.
    echo  ERRO ao instalar dependências do frontend!
    pause
    exit
)
echo  Frontend instalado com sucesso!
cd ..

:: ─── CONFIGURAR .ENV ──────────────────────────────────────
echo.
echo [5/5] Configurando o sistema...
if not exist backend\.env (
    copy backend\.env.example backend\.env >nul
    echo  Arquivo de configuração criado!
    echo  TOTVS desabilitado por padrão (USE_DEMO=true)
) else (
    echo  Configuração já existe, mantendo a atual.
)

:: ─── CRIAR ATALHOS ─────────────────────────────────────────
echo.
echo  Criando atalhos para iniciar o sistema...

:: Script para iniciar backend
(
echo @echo off
echo chcp 65001 ^>nul
echo color 0A
echo title Servidor Backend - Gestão Industrial
echo cd /d "%%~dp0backend"
echo call venv\Scripts\activate.bat
echo echo.
echo echo  Servidor rodando! Nao feche esta janela.
echo echo  Acesse: http://localhost:5173
echo echo.
echo python main.py
echo pause
) > INICIAR-BACKEND.bat

:: Script para iniciar frontend
(
echo @echo off
echo chcp 65001 ^>nul
echo color 0B
echo title Interface - Gestão Industrial
echo cd /d "%%~dp0frontend"
echo echo.
echo echo  Abrindo interface...
echo npm run dev
echo pause
) > INICIAR-FRONTEND.bat

:: Script que inicia tudo junto
(
echo @echo off
echo chcp 65001 ^>nul
echo title Gestão Industrial
echo echo Iniciando o sistema...
echo start "Backend" cmd /c "%%~dp0INICIAR-BACKEND.bat"
echo timeout /t 4 /nobreak ^>nul
echo start "Frontend" cmd /c "%%~dp0INICIAR-FRONTEND.bat"
echo timeout /t 4 /nobreak ^>nul
echo start http://localhost:5173
echo echo Sistema iniciado! Acesse: http://localhost:5173
echo echo.
echo echo Primeira vez? Use:
echo echo   Email: admin@empresa.com
echo echo   Senha: Admin@123
echo pause
) > INICIAR-SISTEMA.bat

echo.
echo  ╔══════════════════════════════════════════════════════╗
echo  ║             INSTALAÇÃO CONCLUÍDA!                    ║
echo  ╠══════════════════════════════════════════════════════╣
echo  ║                                                      ║
echo  ║  TOTVS Protheus: DESABILITADO (modo demonstração)   ║
echo  ║  O sistema já está pronto para usar!                 ║
echo  ║                                                      ║
echo  ║  Para iniciar: clique duas vezes em                  ║
echo  ║  >> INICIAR-SISTEMA.bat                              ║
echo  ║                                                      ║
echo  ║  Login padrão:                                       ║
echo  ║  Email: admin@empresa.com                            ║
echo  ║  Senha: Admin@123                                    ║
echo  ║                                                      ║
echo  ║  Para conectar ao Protheus depois:                   ║
echo  ║  Edite backend\.env e mude USE_DEMO=true             ║
echo  ║  para USE_DEMO=false                                 ║
echo  ║                                                      ║
echo  ╚══════════════════════════════════════════════════════╝
echo.

pause
