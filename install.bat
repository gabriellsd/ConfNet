@echo off
echo ========================================
echo    ConfNet - Instalador Automatico
echo ========================================
echo.

echo Verificando Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERRO: Node.js nao encontrado!
    echo Por favor, instale o Node.js de: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo Node.js encontrado!
echo.

echo Instalando dependencias...
npm install

if %errorlevel% neq 0 (
    echo ERRO: Falha ao instalar dependencias!
    echo.
    pause
    exit /b 1
)

echo.
echo Dependencias instaladas com sucesso!
echo.

echo Instalando dependencias de build...
npm install --save-dev electron-builder

if %errorlevel% neq 0 (
    echo ERRO: Falha ao instalar dependencias de build!
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo    Instalacao concluida com sucesso!
echo ========================================
echo.
echo Para executar a aplicacao:
echo   npm start
echo.
echo Para compilar para exe:
echo   npm run build-win
echo.
pause
