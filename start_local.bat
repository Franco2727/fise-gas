@echo off
echo Iniciando FISE GAS en local...
cd frontend
echo Instalando dependencias por si acaso...
call npm install
echo.
echo ====================================================
echo   El sistema estara disponible en: http://localhost:3000
echo   Usa las credenciales de CREDENTIALS.md
echo ====================================================
echo.
npm run dev
pause
