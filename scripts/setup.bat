@echo off
setlocal enabledelayedexpansion

REM Interview Platform - Complete Project Setup

set "SCRIPT_DIR=%~dp0"
set "PROJECT_ROOT=%SCRIPT_DIR%.."

echo.
echo ========================================
echo  Interview Platform - Setup
echo ========================================
echo.

REM =====================
REM Prerequisite Checks
REM =====================
echo [Prerequisites] Checking installed tools...

set "MISSING=0"

for /f "tokens=*" %%v in ('python --version 2^>^&1') do set "PYTHON_VER=%%v"
python --version >nul 2>&1 && (
    echo   [OK] !PYTHON_VER!
) || (
    echo   [MISSING] Python - https://www.python.org/downloads/
    set "MISSING=1"
)

for /f "tokens=*" %%v in ('node --version 2^>^&1') do set "NODE_VER=%%v"
node --version >nul 2>&1 && (
    echo   [OK] Node.js !NODE_VER!
) || (
    echo   [MISSING] Node.js - https://nodejs.org/
    set "MISSING=1"
)

for /f "tokens=*" %%v in ('call npm --version 2^>^&1') do set "NPM_VER=%%v"
call npm --version >nul 2>&1 && (
    echo   [OK] npm !NPM_VER!
) || (
    echo   [MISSING] npm - comes with Node.js
    set "MISSING=1"
)

if !MISSING! equ 1 (
    echo.
    echo [ERROR] Missing required tools. Please install them and re-run this script.
    exit /b 1
)

echo.

set "STEP=0"

REM =====================
REM 1. Backend Python Virtual Environment
REM =====================
set /a STEP+=1
echo [%STEP%] Setting up Python Backend (venv + dependencies)...

set "BACKEND_DIR=%PROJECT_ROOT%\resume-profile-service"
set "VENV_DIR=%BACKEND_DIR%\venv"

if exist "%VENV_DIR%\Scripts\python.exe" (
    echo   Virtual environment already exists. Updating dependencies...
) else (
    echo   Creating virtual environment...
    python -m venv "%VENV_DIR%"
)

echo   Installing Python requirements...
"%VENV_DIR%\Scripts\pip" install -r "%BACKEND_DIR%\requirements.txt" --quiet
echo   [DONE] Python backend ready
echo.

REM =====================
REM 2. Backend Node.js Dependencies
REM =====================
set /a STEP+=1
echo [%STEP%] Installing Node.js Backend dependencies...

set "NODE_BACKEND_DIR=%PROJECT_ROOT%\Backend"

if exist "%NODE_BACKEND_DIR%\node_modules" (
    echo   node_modules exists. Running npm install to update...
) else (
    echo   Installing npm packages...
)

pushd "%NODE_BACKEND_DIR%"
call npm install --silent >nul 2>&1
popd
echo   [DONE] Node.js backend dependencies installed
echo.

REM =====================
REM 3. Frontend Dependencies
REM =====================
set /a STEP+=1
echo [%STEP%] Installing Frontend dependencies...

set "FRONTEND_DIR=%PROJECT_ROOT%\frontend"

if exist "%FRONTEND_DIR%\node_modules" (
    echo   node_modules exists. Running npm install to update...
) else (
    echo   Installing npm packages...
)

pushd "%FRONTEND_DIR%"
call npm install --silent >nul 2>&1
popd
echo   [DONE] Frontend dependencies installed
echo.

REM =====================
REM 4. AI Interview Service (Python)
REM =====================
set /a STEP+=1
echo [%STEP%] Setting up AI Interview Service (venv + dependencies)...

set "AI_SERVICE_DIR=%PROJECT_ROOT%\ai-interview-service"
set "AI_VENV_DIR=%AI_SERVICE_DIR%\venv"

if exist "%AI_VENV_DIR%\Scripts\python.exe" (
    echo   Virtual environment already exists. Updating dependencies...
) else (
    echo   Creating virtual environment...
    python -m venv "%AI_VENV_DIR%"
)

echo   Installing Python requirements...
"%AI_VENV_DIR%\Scripts\pip" install -r "%AI_SERVICE_DIR%\requirements.txt" --quiet
echo   [DONE] AI Interview service ready
echo.

REM =====================
REM 5. AI Interview Frontend Dependencies
REM =====================
set /a STEP+=1
echo [%STEP%] Installing AI Interview Frontend dependencies...

set "AI_FRONTEND_DIR=%PROJECT_ROOT%\frontend-interview"

if exist "%AI_FRONTEND_DIR%\node_modules" (
    echo   node_modules exists. Running npm install to update...
) else (
    echo   Installing npm packages...
)

pushd "%AI_FRONTEND_DIR%"
call npm install --silent >nul 2>&1
popd
echo   [DONE] AI Interview frontend dependencies installed
echo.

REM =====================
REM 6. WebRTC Signaling Service Dependencies
REM =====================
set /a STEP+=1
echo [%STEP%] Installing WebRTC Signaling Service dependencies...

set "WEBRTC_DIR=%PROJECT_ROOT%\webrtc-service"

if exist "%WEBRTC_DIR%\node_modules" (
    echo   node_modules exists. Running npm install to update...
) else (
    echo   Installing npm packages...
)

pushd "%WEBRTC_DIR%"
call npm install --silent >nul 2>&1
popd
echo   [DONE] WebRTC Signaling Service dependencies installed
echo.

REM =====================
REM 7. Environment Files
REM =====================
set /a STEP+=1
echo [%STEP%] Setting up environment files...

REM Root .env
if exist "%PROJECT_ROOT%\.env.example" (
    if not exist "%PROJECT_ROOT%\.env" (
        copy "%PROJECT_ROOT%\.env.example" "%PROJECT_ROOT%\.env" >nul
        echo   Created .env from .env.example [root]
    ) else (
        echo   .env already exists [root] - skipping
    )
)

REM Backend .env (Node.js)
if exist "%PROJECT_ROOT%\Backend\.env.example" (
    if not exist "%PROJECT_ROOT%\Backend\.env" (
        copy "%PROJECT_ROOT%\Backend\.env.example" "%PROJECT_ROOT%\Backend\.env" >nul
        echo   Created .env from .env.example [backend]
    ) else (
        echo   .env already exists [backend] - skipping
    )
)

REM AI Interview Service .env
if exist "%PROJECT_ROOT%\ai-interview-service\.env.example" (
    if not exist "%PROJECT_ROOT%\ai-interview-service\.env" (
        copy "%PROJECT_ROOT%\ai-interview-service\.env.example" "%PROJECT_ROOT%\ai-interview-service\.env" >nul
        echo   Created .env from .env.example [ai-interview-service]
    ) else (
        echo   .env already exists [ai-interview-service] - skipping
    )
)

REM WebRTC Service .env
if exist "%PROJECT_ROOT%\webrtc-service\.env.example" (
    if not exist "%PROJECT_ROOT%\webrtc-service\.env" (
        copy "%PROJECT_ROOT%\webrtc-service\.env.example" "%PROJECT_ROOT%\webrtc-service\.env" >nul
        echo   Created .env from .env.example [webrtc-service]
    ) else (
        echo   .env already exists [webrtc-service] - skipping
    )
)

echo   [DONE] Environment files ready
echo.

REM =====================
REM 8. Data Directories
REM =====================
set /a STEP+=1
echo [%STEP%] Creating data directories...

if not exist "%PROJECT_ROOT%\data\storage\uploads" (
    mkdir "%PROJECT_ROOT%\data\storage\uploads"
)
echo   [DONE] Data directories created
echo.

REM =====================
REM Summary
REM =====================
echo ========================================
echo  Setup Complete!
echo ========================================
echo.
echo   Components installed:
echo     [+] Python Backend       (venv + FastAPI packages)
echo     [+] Node.js Backend      (Express + dependencies)
echo     [+] React Frontend       (Vite + dependencies)
echo     [+] AI Interview Service (venv + FastAPI + LLM packages)
echo     [+] AI Interview Frontend (Vite + dependencies)
echo     [+] WebRTC Signaling Service (dependencies)
echo     [+] Environment files (.env)
echo     [+] Data directories
echo.
echo   Next step:
echo     scripts\start_services.bat
echo.

endlocal
