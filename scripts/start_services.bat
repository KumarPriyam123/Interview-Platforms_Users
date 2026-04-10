@echo off
setlocal enabledelayedexpansion

REM ========================================
REM  Job Saarthi - Start All Services
REM ========================================
REM
REM  Port Map:
REM    6379  Redis (Docker)
REM    8000  Resume API Gateway (Python)
REM    8001  Resume Parser (Python)
REM    8002  Backend Express (Node.js)
REM    8003  Profile Matching (Python)
REM    5173  Frontend (Vite)
REM    9000  WebRTC Signaling (Socket.io)
REM    9001  PeerJS
REM

set "SCRIPT_DIR=%~dp0"
set "PROJECT_ROOT=%SCRIPT_DIR%.."

echo.
echo ========================================
echo  Job Saarthi - Start All Services
echo ========================================
echo.

REM =====================
REM Prerequisite Checks
REM =====================
echo [Prerequisites] Checking tools...

set "MISSING_TOOLS=0"

python --version >nul 2>&1 && (
    for /f "tokens=*" %%v in ('python --version 2^>^&1') do echo   [OK] %%v
) || (
    echo   [MISSING] Python 3 - https://www.python.org/downloads/
    set "MISSING_TOOLS=1"
)

node --version >nul 2>&1 && (
    for /f "tokens=*" %%v in ('node --version 2^>^&1') do echo   [OK] Node.js %%v
) || (
    echo   [MISSING] Node.js - https://nodejs.org/
    set "MISSING_TOOLS=1"
)

call npm --version >nul 2>&1 && (
    for /f "tokens=*" %%v in ('call npm --version 2^>^&1') do echo   [OK] npm %%v
) || (
    echo   [MISSING] npm - comes with Node.js
    set "MISSING_TOOLS=1"
)

docker --version >nul 2>&1 && (
    echo   [OK] Docker available
) || (
    echo   [WARNING] Docker not found - Redis must be started manually
)

if !MISSING_TOOLS! equ 1 (
    echo.
    echo [ERROR] Missing required tools. Please install them and re-run.
    exit /b 1
)

echo.

REM =====================
REM Environment Files
REM =====================
if not exist "%PROJECT_ROOT%\Backend\.env" (
    if exist "%PROJECT_ROOT%\Backend\.env.example" (
        copy "%PROJECT_ROOT%\Backend\.env.example" "%PROJECT_ROOT%\Backend\.env" >nul
        echo [NOTE] Created Backend\.env from .env.example - update it with your credentials
    )
)
if not exist "%PROJECT_ROOT%\webrtc-service\.env" (
    if exist "%PROJECT_ROOT%\webrtc-service\.env.example" (
        copy "%PROJECT_ROOT%\webrtc-service\.env.example" "%PROJECT_ROOT%\webrtc-service\.env" >nul
    )
)
if not exist "%PROJECT_ROOT%\data\storage\uploads" (
    mkdir "%PROJECT_ROOT%\data\storage\uploads" >nul 2>&1
)

REM =====================
REM 1. Redis (Docker)
REM =====================
echo [1/7 Redis]
docker --version >nul 2>&1 && (
    echo   Ensuring Redis container...
    docker ps -q --filter "name=^jobsaarthi-redis$" >nul 2>&1
    for /f %%i in ('docker ps -q --filter "name=^jobsaarthi-redis$" 2^>nul') do set "REDIS_RUNNING=%%i"
    if defined REDIS_RUNNING (
        echo   Redis already running
    ) else (
        for /f %%i in ('docker ps -aq --filter "name=^jobsaarthi-redis$" 2^>nul') do set "REDIS_EXISTS=%%i"
        if defined REDIS_EXISTS (
            echo   Starting existing Redis container...
            docker start jobsaarthi-redis >nul 2>&1
        ) else (
            echo   Creating Redis container on port 6379...
            docker run -d --name jobsaarthi-redis -p 6379:6379 redis:7-alpine >nul 2>&1
        )
    )
    echo   [OK] Redis ready
) || (
    echo   [SKIP] Docker not available - ensure Redis is running on port 6379
)
echo.

REM =====================
REM 2. Resume Profile Service (Python)
REM =====================
echo [2/7 Resume Profile Service]

if not exist "%PROJECT_ROOT%\resume-profile-service\venv\Scripts\python.exe" (
    echo   Creating virtual environment...
    python -m venv "%PROJECT_ROOT%\resume-profile-service\venv"
)

echo   Installing dependencies...
"%PROJECT_ROOT%\resume-profile-service\venv\Scripts\pip" install -r "%PROJECT_ROOT%\resume-profile-service\requirements.txt" --quiet 2>nul
echo   [OK] Dependencies ready

echo   Starting Resume Parser (port 8001)...
start "Resume Parser (8001)" cmd /k "cd /d "%PROJECT_ROOT%\resume-profile-service" && venv\Scripts\activate && cd src\services\parsing && uvicorn main:app --host 0.0.0.0 --port 8001 --reload"

echo   Starting Profile Matching (port 8003)...
start "Profile Matching (8003)" cmd /k "cd /d "%PROJECT_ROOT%\resume-profile-service" && venv\Scripts\activate && cd src\services\matching && uvicorn main:app --host 0.0.0.0 --port 8003 --reload"

timeout /t 3 /nobreak >nul

echo   Starting API Gateway (port 8000)...
start "API Gateway (8000)" cmd /k "cd /d "%PROJECT_ROOT%\resume-profile-service" && venv\Scripts\activate && cd src\api && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

echo   [OK] Python services started
echo.

REM =====================
REM 3. Backend (Node.js Express)
REM =====================
echo [3/7 Backend]

echo   Installing npm packages...
pushd "%PROJECT_ROOT%\Backend"
call npm install --silent >nul 2>&1
popd

echo   Starting Backend (port 8002)...
start "Backend (8002)" cmd /k "cd /d "%PROJECT_ROOT%\Backend" && npm run dev"
echo   [OK] Backend started
echo.

REM =====================
REM 4. Code Execution Worker
REM =====================
echo [4/7 Code Execution Worker]
echo   Starting BullMQ Worker...
start "Code Worker" cmd /k "cd /d "%PROJECT_ROOT%\Backend" && npm run dev:worker"
echo   [OK] Worker started
echo.

REM =====================
REM 5. WebRTC Signaling
REM =====================
echo [5/7 WebRTC Signaling]

pushd "%PROJECT_ROOT%\webrtc-service"
call npm install --silent >nul 2>&1
popd

echo   Starting WebRTC (ports 9000/9001)...
start "WebRTC (9000)" cmd /k "cd /d "%PROJECT_ROOT%\webrtc-service" && npm start"
echo   [OK] WebRTC started
echo.

REM =====================
REM 6. Frontend
REM =====================
echo [6/7 Frontend]

pushd "%PROJECT_ROOT%\frontend"
call npm install --silent >nul 2>&1
popd

echo   Starting Frontend (port 5173)...
start "Frontend (5173)" cmd /k "cd /d "%PROJECT_ROOT%\frontend" && npm run dev"
echo   [OK] Frontend started
echo.

REM =====================
REM Summary
REM =====================
echo ========================================
echo  All Services Started!
echo ========================================
echo.
echo   Service              Port    URL
echo   -------------------------------------------
echo   Redis                6379
echo   Resume API Gateway   8000    http://localhost:8000/docs
echo   Resume Parser        8001    http://localhost:8001/docs
echo   Backend (Express)    8002    http://localhost:8002
echo   Profile Matching     8003    http://localhost:8003/docs
echo   Frontend (Vite)      5173    http://localhost:5173
echo   WebRTC Signaling     9000    http://localhost:9000/health
echo   PeerJS               9001
echo   Code Exec Worker     (background)
echo.
echo   To stop: close each CMD window or press Ctrl+C
echo.

endlocal
