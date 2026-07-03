@echo off
setlocal EnableExtensions

rem Start frontend + backend for AI Outfit Suggestor (Windows)
cd /d "%~dp0"

if not exist "backend\.env" (
    echo Error: backend\.env not found.
    echo Copy backend\.env.example to backend\.env and add your API keys.
    pause
    exit /b 1
)

if not exist "backend\venv\Scripts\activate.bat" (
    echo Error: Python venv not found at backend\venv
    echo Create it with:
    echo   cd backend
    echo   python -m venv venv
    echo   venv\Scripts\pip install -r requirements.txt
    pause
    exit /b 1
)

echo Starting AI Outfit Suggestor...
echo.

echo [1/2] Backend  - http://localhost:8001
start "Outfit Suggestor - Backend" cmd /k "cd /d "%~dp0backend" && call venv\Scripts\activate.bat && python main.py"

timeout /t 3 /nobreak >nul

echo [2/2] Frontend - http://localhost:3000
start "Outfit Suggestor - Frontend" cmd /k "cd /d "%~dp0frontend" && npm start"

echo.
echo Both servers are launching in separate windows.
echo Close those windows to stop the servers.
pause
