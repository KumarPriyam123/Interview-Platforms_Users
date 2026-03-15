<# Interview Platform - Start All Services #>
param(
    [switch]$SkipPython,
    [switch]$SkipNode,
    [switch]$SkipFrontend
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Interview Platform - Start Services" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# =====================
# Prerequisite Checks
# =====================
$SetupNeeded = $false

if (-not $SkipPython) {
    if (-not (Test-Path "$ProjectRoot\resume-profile-service\venv\Scripts\python.exe")) {
        Write-Host "[WARNING] Python venv not found at resume-profile-service\venv" -ForegroundColor Red
        $SetupNeeded = $true
    }
}

if (-not $SkipNode) {
    if (-not (Test-Path "$ProjectRoot\Backend\node_modules")) {
        Write-Host "[WARNING] Node.js dependencies not installed (Backend\node_modules missing)" -ForegroundColor Red
        $SetupNeeded = $true
    }
}

if (-not $SkipFrontend) {
    if (-not (Test-Path "$ProjectRoot\frontend\node_modules")) {
        Write-Host "[WARNING] Frontend dependencies not installed (frontend\node_modules missing)" -ForegroundColor Red
        $SetupNeeded = $true
    }
}

if ($SetupNeeded) {
    Write-Host ""
    Write-Host "Please run setup first:  .\scripts\setup.ps1" -ForegroundColor Yellow
    Write-Host ""
    $Continue = Read-Host "Continue anyway? (y/N)"
    if ($Continue -ne "y" -and $Continue -ne "Y") {
        exit 0
    }
    Write-Host ""
}

# =====================
# 1. Python Microservices
# =====================
if (-not $SkipPython) {
    Write-Host "[Python Services]" -ForegroundColor Yellow

    # Resume Parser Service (Port 8001)
    Write-Host "  Starting Resume Parser Service (Port 8001)..." -ForegroundColor DarkGray
    Start-Process powershell -ArgumentList "-NoExit", "-Command", `
        "Set-Title 'Resume Parser (8001)' 2>`$null; " + `
        "`$host.UI.RawUI.WindowTitle = 'Resume Parser (8001)'; " + `
        "cd '$ProjectRoot\resume-profile-service'; " + `
        ".\venv\Scripts\activate; " + `
        "cd src\services\parsing; " + `
        "uvicorn main:app --host 0.0.0.0 --port 8001 --reload"

    # Profile Matching Service (Port 8002)
    Write-Host "  Starting Profile Matching Service (Port 8002)..." -ForegroundColor DarkGray
    Start-Process powershell -ArgumentList "-NoExit", "-Command", `
        "`$host.UI.RawUI.WindowTitle = 'Profile Matching (8002)'; " + `
        "cd '$ProjectRoot\resume-profile-service'; " + `
        ".\venv\Scripts\activate; " + `
        "cd src\services\matching; " + `
        "uvicorn main:app --host 0.0.0.0 --port 8002 --reload"

    # Wait for microservices to initialize
    Write-Host "  Waiting for microservices to start..." -ForegroundColor DarkGray
    Start-Sleep -Seconds 3

    # API Gateway (Port 8000)
    Write-Host "  Starting API Gateway (Port 8000)..." -ForegroundColor DarkGray
    Start-Process powershell -ArgumentList "-NoExit", "-Command", `
        "`$host.UI.RawUI.WindowTitle = 'API Gateway (8000)'; " + `
        "cd '$ProjectRoot\resume-profile-service'; " + `
        ".\venv\Scripts\activate; " + `
        "cd src\api; " + `
        "uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

    Write-Host "  [OK] Python services started" -ForegroundColor Green
    Write-Host ""
}

# =====================
# 2. Node.js Backend
# =====================
if (-not $SkipNode) {
    Write-Host "[Node.js Backend]" -ForegroundColor Yellow
    Write-Host "  Starting Express Server (Port 3000)..." -ForegroundColor DarkGray

    Start-Process powershell -ArgumentList "-NoExit", "-Command", `
        "`$host.UI.RawUI.WindowTitle = 'Node.js Backend (3000)'; " + `
        "cd '$ProjectRoot\Backend'; " + `
        "`$env:PORT=3000; " + `
        "npm run dev"

    Write-Host "  [OK] Node.js backend started" -ForegroundColor Green
    Write-Host ""
}

# =====================
# 3. React Frontend
# =====================
if (-not $SkipFrontend) {
    Write-Host "[React Frontend]" -ForegroundColor Yellow
    Write-Host "  Starting Vite Dev Server (Port 5173)..." -ForegroundColor DarkGray

    Start-Process powershell -ArgumentList "-NoExit", "-Command", `
        "`$host.UI.RawUI.WindowTitle = 'Frontend (5173)'; " + `
        "cd '$ProjectRoot\frontend'; " + `
        "npm run dev"

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
Write-Host "  Access Points:" -ForegroundColor White

if (-not $SkipPython) {
    Write-Host "    API Gateway (Python):   http://localhost:8000/docs" -ForegroundColor White
    Write-Host "    Resume Parser:          http://localhost:8001/docs" -ForegroundColor White
    Write-Host "    Profile Matching:       http://localhost:8002/docs" -ForegroundColor White
}
if (-not $SkipNode) {
    Write-Host "    Node.js Backend:        http://localhost:3000" -ForegroundColor White
}
if (-not $SkipFrontend) {
    Write-Host "    React Frontend:         http://localhost:5173" -ForegroundColor White
}

Write-Host ""
Write-Host "  Flags:" -ForegroundColor DarkGray
Write-Host "    -SkipPython    Skip Python microservices" -ForegroundColor DarkGray
Write-Host "    -SkipNode      Skip Node.js backend" -ForegroundColor DarkGray
Write-Host "    -SkipFrontend  Skip React frontend" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  To stop: close each service's PowerShell window (or Ctrl+C)" -ForegroundColor DarkGray
Write-Host ""
