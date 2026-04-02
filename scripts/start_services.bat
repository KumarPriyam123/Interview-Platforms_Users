@echo off
setlocal enabledelayedexpansion

REM Interview Platform - Start All Services

set "SCRIPT_DIR=%~dp0"
set "PROJECT_ROOT=%SCRIPT_DIR%.."

echo.
echo ========================================
echo  Interview Platform - Start Services
echo ========================================
echo.

REM =====================
REM Prerequisite Checks
REM =====================
echo [Prerequisites] Checking installed tools...

set "MISSING_TOOLS=0"

for /f "tokens=*" %%v in ('python --version 2^>^&1') do set "PYTHON_VER=%%v"
python --version >nul 2>&1 && (
    echo   [OK] !PYTHON_VER!
) || (
    echo   [MISSING] Python - https://www.python.org/downloads/
    set "MISSING_TOOLS=1"
)

for /f "tokens=*" %%v in ('node --version 2^>^&1') do set "NODE_VER=%%v"
node --version >nul 2>&1 && (
    echo   [OK] Node.js !NODE_VER!
) || (
    echo   [MISSING] Node.js - https://nodejs.org/
    set "MISSING_TOOLS=1"
)

for /f "tokens=*" %%v in ('call npm --version 2^>^&1') do set "NPM_VER=%%v"
call npm --version >nul 2>&1 && (
    echo   [OK] npm !NPM_VER!
) || (
    echo   [MISSING] npm - comes with Node.js
    set "MISSING_TOOLS=1"
)

if !MISSING_TOOLS! equ 1 (
    echo.
    echo [ERROR] Missing required tools. Please install them and re-run.
    exit /b 1
)

echo.

REM =====================
REM 1. Resume Profile Service - Python venv + deps
REM =====================
echo [1. Resume Profile Service]

if not exist "%PROJECT_ROOT%\resume-profile-service\venv\Scripts\python.exe" (
    echo   Creating virtual environment...
    python -m venv "%PROJECT_ROOT%\resume-profile-service\venv"
)

echo   Checking Python dependencies...
"%PROJECT_ROOT%\resume-profile-service\venv\Scripts\pip" install -r "%PROJECT_ROOT%\resume-profile-service\requirements.txt" --quiet
echo   [OK] Dependencies ready
echo.

REM Start Resume Parser Service (Port 8001)
echo   Starting Resume Parser Service (Port 8001)...
start "Resume Parser (8001)" cmd /k "cd /d "%PROJECT_ROOT%\resume-profile-service" && venv\Scripts\activate && cd src\services\parsing && uvicorn main:app --host 0.0.0.0 --port 8001 --reload"

REM Start Profile Matching Service (Port 8002)
echo   Starting Profile Matching Service (Port 8002)...
start "Profile Matching (8002)" cmd /k "cd /d "%PROJECT_ROOT%\resume-profile-service" && venv\Scripts\activate && cd src\services\matching && uvicorn main:app --host 0.0.0.0 --port 8002 --reload"

REM Wait for microservices to initialize
echo   Waiting for microservices to start...
timeout /t 3 /nobreak >nul

REM Start API Gateway (Port 8000)
echo   Starting API Gateway (Port 8000)...
start "API Gateway (8000)" cmd /k "cd /d "%PROJECT_ROOT%\resume-profile-service" && venv\Scripts\activate && cd src\api && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

echo   [OK] Python services started
echo.

REM =====================
REM 2. Node.js Backend
REM =====================
echo [2. Node.js Backend]

echo   Checking npm packages...
pushd "%PROJECT_ROOT%\Backend"
call npm install --silent >nul 2>&1
popd

echo   [OK] Dependencies ready
echo   Starting Express Server (Port 3000)...
start "Node.js Backend (3000)" cmd /k "cd /d "%PROJECT_ROOT%\Backend" && set PORT=3000 && npm run dev"
echo   [OK] Node.js backend started
echo.

REM =====================
REM 3. React Frontend
REM =====================
echo [3. React Frontend]

echo   Checking npm packages...
pushd "%PROJECT_ROOT%\frontend"
call npm install --silent >nul 2>&1
popd

echo   [OK] Dependencies ready
echo   Starting Vite Dev Server (Port 5173)...
start "Frontend (5173)" cmd /k "cd /d "%PROJECT_ROOT%\frontend" && npm run dev"
echo   [OK] Frontend started
echo.

REM =====================
REM 4. AI Interview Service (Python)
REM =====================
echo [4. AI Interview Service]

if not exist "%PROJECT_ROOT%\ai-interview-service\venv\Scripts\python.exe" (
    echo   Creating virtual environment...
    python -m venv "%PROJECT_ROOT%\ai-interview-service\venv"
)

echo   Checking Python dependencies...
"%PROJECT_ROOT%\ai-interview-service\venv\Scripts\pip" install -r "%PROJECT_ROOT%\ai-interview-service\requirements.txt" --quiet
echo   [OK] Dependencies ready

REM Copy .env if missing
if not exist "%PROJECT_ROOT%\ai-interview-service\.env" (
    if exist "%PROJECT_ROOT%\ai-interview-service\.env.example" (
        copy "%PROJECT_ROOT%\ai-interview-service\.env.example" "%PROJECT_ROOT%\ai-interview-service\.env" >nul
        echo   [NOTE] Created .env from .env.example - edit it to set your LLM_API_KEY
    )
)

echo   Starting AI Interview Backend (Port 8003)...
start "AI Interview Backend (8003)" cmd /k "cd /d "%PROJECT_ROOT%\ai-interview-service" && venv\Scripts\activate && python run.py"
echo   [OK] AI Interview backend started
echo.




REM =====================
REM 6. WebRTC Signaling Service
REM =====================
echo [6. WebRTC Signaling Service]

echo   Checking npm packages...
pushd "%PROJECT_ROOT%\webrtc-service"
call npm install --silent >nul 2>&1
popd

echo   [OK] Dependencies ready
echo   Starting WebRTC Service (Ports 9000/9001)...
start "WebRTC Service (9000)" cmd /k "cd /d "%PROJECT_ROOT%\webrtc-service" && npm run dev"
echo   [OK] WebRTC service started
echo.

REM =====================
REM Environment Files
REM =====================
if not exist "%PROJECT_ROOT%\.env" (
    if exist "%PROJECT_ROOT%\.env.example" (
        copy "%PROJECT_ROOT%\.env.example" "%PROJECT_ROOT%\.env" >nul
    )
)
if not exist "%PROJECT_ROOT%\Backend\.env" (
    if exist "%PROJECT_ROOT%\Backend\.env.example" (
        copy "%PROJECT_ROOT%\Backend\.env.example" "%PROJECT_ROOT%\Backend\.env" >nul
    )
)
if not exist "%PROJECT_ROOT%\webrtc-service\.env" (
    if exist "%PROJECT_ROOT%\webrtc-service\.env.example" (
        copy "%PROJECT_ROOT%\webrtc-service\.env.example" "%PROJECT_ROOT%\webrtc-service\.env" >nul
    )
)

REM Data directories
if not exist "%PROJECT_ROOT%\data\storage\uploads" (
    mkdir "%PROJECT_ROOT%\data\storage\uploads" >nul 2>&1
)

REM =====================
REM Summary
REM =====================
echo ========================================
echo  All Services Started!
echo ========================================
echo.
echo   Access Points:
echo     API Gateway (Python):   http://localhost:8000/docs
echo     Resume Parser:          http://localhost:8001/docs
echo     Profile Matching:       http://localhost:8002/docs
echo     Node.js Backend:        http://localhost:3000
echo     React Frontend:         http://localhost:5173
echo     AI Interview Backend:   http://localhost:8003/docs
echo     WebRTC Service:         http://localhost:9000
echo.
echo   To stop: close each service's CMD window (or Ctrl+C)
echo.

endlocal
