<# Job Saarthi - Start All Services #>
<#
  Port Map:
    6379  Redis (Docker)
    8000  Resume API Gateway (Python)
    8001  Resume Parser (Python)
    8002  Backend Express (Node.js)
    8003  Profile Matching (Python)
    5173  Frontend (Vite)
    9000  WebRTC Signaling (Socket.io)
    9001  PeerJS
#>
param(
    [switch]$SkipPython,
    [switch]$SkipNode,
    [switch]$SkipFrontend,
    [switch]$SkipWebRTC,
    [switch]$SkipRedis,
    [switch]$SkipWorker
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Job Saarthi - Start All Services" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# =====================
# Prerequisite Checks
# =====================
Write-Host "[Prerequisites]" -ForegroundColor Yellow
$Missing = $false

if (Get-Command python -ErrorAction SilentlyContinue) {
    Write-Host "  [OK] $(python --version 2>&1)" -ForegroundColor Green
} else {
    Write-Host "  [MISSING] Python 3" -ForegroundColor Red
    $Missing = $true
}

if (Get-Command node -ErrorAction SilentlyContinue) {
    Write-Host "  [OK] Node.js $(node --version)" -ForegroundColor Green
} else {
    Write-Host "  [MISSING] Node.js" -ForegroundColor Red
    $Missing = $true
}

if (Get-Command npm.cmd -ErrorAction SilentlyContinue) {
    Write-Host "  [OK] npm $(npm.cmd --version)" -ForegroundColor Green
} else {
    Write-Host "  [MISSING] npm" -ForegroundColor Red
    $Missing = $true
}

$HasDocker = [bool](Get-Command docker -ErrorAction SilentlyContinue)
if ($HasDocker) {
    Write-Host "  [OK] Docker available" -ForegroundColor Green
} else {
    Write-Host "  [WARNING] Docker not found - Redis must be started manually" -ForegroundColor DarkYellow
}

if ($Missing) {
    Write-Host "`n[ERROR] Missing required tools. Install them and re-run." -ForegroundColor Red
    exit 1
}

Write-Host ""

# =====================
# Environment Files
# =====================
if (-not (Test-Path "$ProjectRoot\Backend\.env") -and (Test-Path "$ProjectRoot\Backend\.env.example")) {
    Copy-Item "$ProjectRoot\Backend\.env.example" "$ProjectRoot\Backend\.env"
    Write-Host "[NOTE] Created Backend\.env from .env.example - update credentials" -ForegroundColor DarkYellow
}
if (-not (Test-Path "$ProjectRoot\webrtc-service\.env") -and (Test-Path "$ProjectRoot\webrtc-service\.env.example")) {
    Copy-Item "$ProjectRoot\webrtc-service\.env.example" "$ProjectRoot\webrtc-service\.env"
}
if (-not (Test-Path "$ProjectRoot\data\storage\uploads")) {
    New-Item -ItemType Directory -Path "$ProjectRoot\data\storage\uploads" -Force | Out-Null
}

# =====================
# 1. Redis
# =====================
if (-not $SkipRedis -and $HasDocker) {
    Write-Host "[1/7 Redis]" -ForegroundColor Yellow
    $running = docker ps -q --filter "name=^jobsaarthi-redis$" 2>$null
    if ($running) {
        Write-Host "  Redis already running" -ForegroundColor DarkGray
    } else {
        $exists = docker ps -aq --filter "name=^jobsaarthi-redis$" 2>$null
        if ($exists) {
            Write-Host "  Starting existing Redis container..." -ForegroundColor DarkGray
            docker start jobsaarthi-redis | Out-Null
        } else {
            Write-Host "  Creating Redis container on port 6379..." -ForegroundColor DarkGray
            docker run -d --name jobsaarthi-redis -p 6379:6379 redis:7-alpine | Out-Null
        }
    }
    Write-Host "  [OK] Redis ready" -ForegroundColor Green
    Write-Host ""
} elseif (-not $SkipRedis) {
    Write-Host "[1/7 Redis] SKIP - Docker not available, ensure Redis on port 6379" -ForegroundColor DarkYellow
    Write-Host ""
}

# =====================
# 2. Resume Profile Service (Python)
# =====================
if (-not $SkipPython) {
    Write-Host "[2/7 Resume Profile Service]" -ForegroundColor Yellow

    $VenvPython = "$ProjectRoot\resume-profile-service\venv\Scripts\python.exe"
    if (-not (Test-Path $VenvPython)) {
        Write-Host "  Creating virtual environment..." -ForegroundColor DarkGray
        python -m venv "$ProjectRoot\resume-profile-service\venv"
    }

    Write-Host "  Installing dependencies..." -ForegroundColor DarkGray
    & "$ProjectRoot\resume-profile-service\venv\Scripts\pip" install -r "$ProjectRoot\resume-profile-service\requirements.txt" --quiet 2>$null
    Write-Host "  [OK] Dependencies ready" -ForegroundColor Green

    # Resume Parser (Port 8001)
    Write-Host "  Starting Resume Parser (port 8001)..." -ForegroundColor DarkGray
    Start-Process powershell -ArgumentList "-NoExit", "-Command", `
        "`$host.UI.RawUI.WindowTitle = 'Resume Parser (8001)'; cd '$ProjectRoot\resume-profile-service'; .\venv\Scripts\activate; cd src\services\parsing; uvicorn main:app --host 0.0.0.0 --port 8001 --reload"

    # Profile Matching (Port 8003)
    Write-Host "  Starting Profile Matching (port 8003)..." -ForegroundColor DarkGray
    Start-Process powershell -ArgumentList "-NoExit", "-Command", `
        "`$host.UI.RawUI.WindowTitle = 'Profile Matching (8003)'; cd '$ProjectRoot\resume-profile-service'; .\venv\Scripts\activate; cd src\services\matching; uvicorn main:app --host 0.0.0.0 --port 8003 --reload"

    Start-Sleep -Seconds 3

    # API Gateway (Port 8000)
    Write-Host "  Starting API Gateway (port 8000)..." -ForegroundColor DarkGray
    Start-Process powershell -ArgumentList "-NoExit", "-Command", `
        "`$host.UI.RawUI.WindowTitle = 'API Gateway (8000)'; cd '$ProjectRoot\resume-profile-service'; .\venv\Scripts\activate; cd src\api; uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

    Write-Host "  [OK] Python services started" -ForegroundColor Green
    Write-Host ""
}

# =====================
# 3. Backend (Node.js Express - Port 8002)
# =====================
if (-not $SkipNode) {
    Write-Host "[3/7 Backend]" -ForegroundColor Yellow

    if (-not (Test-Path "$ProjectRoot\Backend\node_modules")) {
        Write-Host "  Installing npm packages..." -ForegroundColor DarkGray
        Push-Location "$ProjectRoot\Backend"
        npm.cmd install --silent 2>$null | Out-Null
        Pop-Location
    }

    Write-Host "  Starting Backend (port 8002)..." -ForegroundColor DarkGray
    Start-Process powershell -ArgumentList "-NoExit", "-Command", `
        "`$host.UI.RawUI.WindowTitle = 'Backend (8002)'; cd '$ProjectRoot\Backend'; npm.cmd run dev"

    Write-Host "  [OK] Backend started" -ForegroundColor Green
    Write-Host ""
}

# =====================
# 4. Code Execution Worker
# =====================
if (-not $SkipWorker -and -not $SkipNode) {
    Write-Host "[4/7 Code Execution Worker]" -ForegroundColor Yellow
    Write-Host "  Starting BullMQ Worker..." -ForegroundColor DarkGray

    Start-Process powershell -ArgumentList "-NoExit", "-Command", `
        "`$host.UI.RawUI.WindowTitle = 'Code Worker'; cd '$ProjectRoot\Backend'; npm.cmd run dev:worker"

    Write-Host "  [OK] Worker started" -ForegroundColor Green
    Write-Host ""
}

# =====================
# 5. WebRTC Signaling
# =====================
if (-not $SkipWebRTC) {
    Write-Host "[5/7 WebRTC Signaling]" -ForegroundColor Yellow

    if (-not (Test-Path "$ProjectRoot\webrtc-service\node_modules")) {
        Write-Host "  Installing npm packages..." -ForegroundColor DarkGray
        Push-Location "$ProjectRoot\webrtc-service"
        npm.cmd install --silent 2>$null | Out-Null
        Pop-Location
    }

    Write-Host "  Starting WebRTC (ports 9000/9001)..." -ForegroundColor DarkGray
    Start-Process powershell -ArgumentList "-NoExit", "-Command", `
        "`$host.UI.RawUI.WindowTitle = 'WebRTC (9000/9001)'; cd '$ProjectRoot\webrtc-service'; npm.cmd start"

    Write-Host "  [OK] WebRTC started" -ForegroundColor Green
    Write-Host ""
}

# =====================
# 6. Frontend
# =====================
if (-not $SkipFrontend) {
    Write-Host "[6/7 Frontend]" -ForegroundColor Yellow

    if (-not (Test-Path "$ProjectRoot\frontend\node_modules")) {
        Write-Host "  Installing npm packages..." -ForegroundColor DarkGray
        Push-Location "$ProjectRoot\frontend"
        npm.cmd install --silent 2>$null | Out-Null
        Pop-Location
    }

    Write-Host "  Starting Frontend (port 5173)..." -ForegroundColor DarkGray
    Start-Process powershell -ArgumentList "-NoExit", "-Command", `
        "`$host.UI.RawUI.WindowTitle = 'Frontend (5173)'; cd '$ProjectRoot\frontend'; npm.cmd run dev"

    Write-Host "  [OK] Frontend started" -ForegroundColor Green
    Write-Host ""
}

# =====================
# Summary
# =====================
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " All Services Started!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Service              Port    URL" -ForegroundColor White
Write-Host "  -------------------------------------------" -ForegroundColor DarkGray

if (-not $SkipRedis)    { Write-Host "  Redis                6379" -ForegroundColor White }
if (-not $SkipPython)   {
    Write-Host "  Resume API Gateway   8000    http://localhost:8000/docs" -ForegroundColor White
    Write-Host "  Resume Parser        8001    http://localhost:8001/docs" -ForegroundColor White
    Write-Host "  Profile Matching     8003    http://localhost:8003/docs" -ForegroundColor White
}
if (-not $SkipNode)     { Write-Host "  Backend (Express)    8002    http://localhost:8002" -ForegroundColor White }
if (-not $SkipFrontend) { Write-Host "  Frontend (Vite)      5173    http://localhost:5173" -ForegroundColor White }
if (-not $SkipWebRTC)   {
    Write-Host "  WebRTC Signaling     9000    http://localhost:9000/health" -ForegroundColor White
    Write-Host "  PeerJS               9001" -ForegroundColor White
}
if (-not $SkipWorker)   { Write-Host "  Code Exec Worker     (background)" -ForegroundColor White }

Write-Host ""
Write-Host "  Flags:" -ForegroundColor DarkGray
Write-Host "    -SkipPython    Skip Python services (resume/profile)" -ForegroundColor DarkGray
Write-Host "    -SkipNode      Skip Backend + Worker" -ForegroundColor DarkGray
Write-Host "    -SkipFrontend  Skip React frontend" -ForegroundColor DarkGray
Write-Host "    -SkipWebRTC    Skip WebRTC signaling" -ForegroundColor DarkGray
Write-Host "    -SkipRedis     Skip Redis container" -ForegroundColor DarkGray
Write-Host "    -SkipWorker    Skip code execution worker" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  To stop: close each PowerShell window or Ctrl+C
        "`$host.UI.RawUI.WindowTitle = 'WebRTC (9000/9001)'; cd '$ProjectRoot\webrtc-service'; npm.cmd start"

    Write-Host "  [OK] WebRTC started" -ForegroundColor Green
    Write-Host ""
}

# =====================
# 6. Frontend
# =====================
if (-not $SkipFrontend) {
    Write-Host "[6/7 Frontend]" -ForegroundColor Yellow

    if (-not (Test-Path "$ProjectRoot\frontend\node_modules")) {
        Write-Host "  Installing npm packages..." -ForegroundColor DarkGray
        Push-Location "$ProjectRoot\frontend"
        npm.cmd install --silent 2>$null | Out-Null
        Pop-Location
    }

    Write-Host "  Starting Frontend (port 5173)..." -ForegroundColor DarkGray
    Start-Process powershell -ArgumentList "-NoExit", "-Command", `
        "`$host.UI.RawUI.WindowTitle = 'Frontend (5173)'; cd '$ProjectRoot\frontend'; npm.cmd run dev"

    Write-Host "  [OK] Frontend started" -ForegroundColor Green
    Write-Host ""
}

# =====================
# Summary
# =====================
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " All Services Started!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Service              Port    URL" -ForegroundColor White
Write-Host "  -------------------------------------------" -ForegroundColor DarkGray

if (-not $SkipRedis)    { Write-Host "  Redis                6379" -ForegroundColor White }
if (-not $SkipPython)   {
    Write-Host "  Resume API Gateway   8000    http://localhost:8000/docs" -ForegroundColor White
    Write-Host "  Resume Parser        8001    http://localhost:8001/docs" -ForegroundColor White
    Write-Host "  Profile Matching     8003    http://localhost:8003/docs" -ForegroundColor White
}
if (-not $SkipNode)     { Write-Host "  Backend (Express)    8002    http://localhost:8002" -ForegroundColor White }
if (-not $SkipFrontend) { Write-Host "  Frontend (Vite)      5173    http://localhost:5173" -ForegroundColor White }
if (-not $SkipWebRTC)   {
    Write-Host "  WebRTC Signaling     9000    http://localhost:9000/health" -ForegroundColor White
    Write-Host "  PeerJS               9001" -ForegroundColor White
}
if (-not $SkipWorker)   { Write-Host "  Code Exec Worker     (background)" -ForegroundColor White }

Write-Host ""
Write-Host "  Flags:" -ForegroundColor DarkGray
Write-Host "    -SkipPython    Skip Python services (resume/profile)" -ForegroundColor DarkGray
Write-Host "    -SkipNode      Skip Backend + Worker" -ForegroundColor DarkGray
Write-Host "    -SkipFrontend  Skip React frontend" -ForegroundColor DarkGray
Write-Host "    -SkipWebRTC    Skip WebRTC signaling" -ForegroundColor DarkGray
Write-Host "    -SkipRedis     Skip Redis container" -ForegroundColor DarkGray
Write-Host "    -SkipWorker    Skip code execution worker" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  To stop: close each PowerShell window or Ctrl+C" -ForegroundColor DarkGray
Write-Host ""
