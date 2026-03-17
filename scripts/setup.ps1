<# Interview Platform - Complete Project Setup #>
param(
    [switch]$SkipPython,
    [switch]$SkipNode,
    [switch]$SkipFrontend,
    [switch]$SkipWebRTC
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Interview Platform - Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# =====================
# Prerequisite Checks
# =====================
Write-Host "[Prerequisites] Checking installed tools..." -ForegroundColor Yellow

$MissingTools = @()

# Check Python
if (-not $SkipPython) {
    try {
        $PythonVersion = python --version 2>&1
        Write-Host "  [OK] $PythonVersion" -ForegroundColor Green
    } catch {
        $MissingTools += "Python"
        Write-Host "  [MISSING] Python - https://www.python.org/downloads/" -ForegroundColor Red
    }
}

# Check Node.js
if (-not $SkipNode -or -not $SkipFrontend -or -not $SkipWebRTC) {
    try {
        $NodeVersion = node --version 2>&1
        Write-Host "  [OK] Node.js $NodeVersion" -ForegroundColor Green
    } catch {
        $MissingTools += "Node.js"
        Write-Host "  [MISSING] Node.js - https://nodejs.org/" -ForegroundColor Red
    }

    # Check npm
    try {
        $NpmVersion = npm.cmd --version 2>&1
        Write-Host "  [OK] npm $NpmVersion" -ForegroundColor Green
    } catch {
        $MissingTools += "npm"
        Write-Host "  [MISSING] npm (comes with Node.js)" -ForegroundColor Red
    }
}

if ($MissingTools.Count -gt 0) {
    Write-Host "`n[ERROR] Missing required tools: $($MissingTools -join ', ')" -ForegroundColor Red
    Write-Host "Please install the missing tools and re-run this script." -ForegroundColor Red
    exit 1
}

Write-Host ""

$StepNumber = 0

# =====================
# 1. Backend Python Virtual Environment
# =====================
if (-not $SkipPython) {
    $StepNumber++
    Write-Host "[$StepNumber] Setting up Python Backend (venv + dependencies)..." -ForegroundColor Yellow

    $BackendDir = "$ProjectRoot\resume-profile-service"
    $VenvDir = "$BackendDir\venv"

    if (Test-Path "$VenvDir\Scripts\python.exe") {
        Write-Host "  Virtual environment already exists. Updating dependencies..." -ForegroundColor DarkGray
    } else {
        Write-Host "  Creating virtual environment..." -ForegroundColor DarkGray
        python -m venv "$VenvDir"
    }

    Write-Host "  Installing Python requirements..." -ForegroundColor DarkGray
    & "$VenvDir\Scripts\pip" install -r "$BackendDir\requirements.txt" --quiet
    Write-Host "  [DONE] Python backend ready" -ForegroundColor Green
    Write-Host ""
}

# =====================
# 2. Backend Node.js Dependencies
# =====================
if (-not $SkipNode) {
    $StepNumber++
    Write-Host "[$StepNumber] Installing Node.js Backend dependencies..." -ForegroundColor Yellow

    $BackendDir = "$ProjectRoot\Backend"

    if (Test-Path "$BackendDir\node_modules") {
        Write-Host "  node_modules exists. Running npm install to update..." -ForegroundColor DarkGray
    } else {
        Write-Host "  Installing npm packages..." -ForegroundColor DarkGray
    }

    Push-Location $BackendDir
    npm.cmd install --silent 2>&1 | Out-Null
    Pop-Location
    Write-Host "  [DONE] Node.js backend dependencies installed" -ForegroundColor Green
    Write-Host ""
}

# =====================
# 3. Frontend Dependencies
# =====================
if (-not $SkipFrontend) {
    $StepNumber++
    Write-Host "[$StepNumber] Installing Frontend dependencies..." -ForegroundColor Yellow

    $FrontendDir = "$ProjectRoot\frontend"

    if (Test-Path "$FrontendDir\node_modules") {
        Write-Host "  node_modules exists. Running npm install to update..." -ForegroundColor DarkGray
    } else {
        Write-Host "  Installing npm packages..." -ForegroundColor DarkGray
    }

    Push-Location $FrontendDir
    npm.cmd install --silent 2>&1 | Out-Null
    Pop-Location
    Write-Host "  [DONE] Frontend dependencies installed" -ForegroundColor Green
    Write-Host ""
}

# =====================
# 4. WebRTC Signaling Service Dependencies
# =====================
if (-not $SkipWebRTC) {
    $StepNumber++
    Write-Host "[$StepNumber] Installing WebRTC signaling dependencies..." -ForegroundColor Yellow

    $WebRTCDir = "$ProjectRoot\webrtc-service"

    if (Test-Path "$WebRTCDir\node_modules") {
        Write-Host "  node_modules exists. Running npm install to update..." -ForegroundColor DarkGray
    } else {
        Write-Host "  Installing npm packages..." -ForegroundColor DarkGray
    }

    Push-Location $WebRTCDir
    npm.cmd install --silent 2>&1 | Out-Null
    Pop-Location
    Write-Host "  [DONE] WebRTC signaling dependencies installed" -ForegroundColor Green
    Write-Host ""
}

# =====================
# 5. Environment Files
# =====================
$StepNumber++
Write-Host "[$StepNumber] Setting up environment files..." -ForegroundColor Yellow

# Root .env
$RootEnvExample = "$ProjectRoot\.env.example"
$RootEnv = "$ProjectRoot\.env"
if (Test-Path $RootEnvExample) {
    if (-not (Test-Path $RootEnv)) {
        Copy-Item $RootEnvExample $RootEnv
        Write-Host "  Created .env from .env.example (root)" -ForegroundColor DarkGray
    } else {
        Write-Host "  .env already exists (root) - skipping" -ForegroundColor DarkGray
    }
}

# Backend .env (Node.js)
$BackendEnvExample = "$ProjectRoot\Backend\.env.example"
$BackendEnv = "$ProjectRoot\Backend\.env"
if (Test-Path $BackendEnvExample) {
    if (-not (Test-Path $BackendEnv)) {
        Copy-Item $BackendEnvExample $BackendEnv
        Write-Host "  Created .env from .env.example (backend)" -ForegroundColor DarkGray
    } else {
        Write-Host "  .env already exists (backend) - skipping" -ForegroundColor DarkGray
    }
}

Write-Host "  [DONE] Environment files ready" -ForegroundColor Green
Write-Host ""

# =====================
# 6. Data Directories
# =====================
$StepNumber++
Write-Host "[$StepNumber] Creating data directories..." -ForegroundColor Yellow

$Directories = @(
    "$ProjectRoot\data\storage\uploads"
)

foreach ($Dir in $Directories) {
    New-Item -ItemType Directory -Force -Path $Dir | Out-Null
}
Write-Host "  [DONE] Data directories created" -ForegroundColor Green
Write-Host ""

# =====================
# Summary
# =====================
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Components installed:" -ForegroundColor White
if (-not $SkipPython)   { Write-Host "    [+] Python Backend   (venv + FastAPI packages)" -ForegroundColor Green }
if (-not $SkipNode)     { Write-Host "    [+] Node.js Backend  (Express + dependencies)" -ForegroundColor Green }
if (-not $SkipFrontend) { Write-Host "    [+] React Frontend   (Vite + dependencies)" -ForegroundColor Green }
if (-not $SkipWebRTC)   { Write-Host "    [+] WebRTC Service   (Socket.io + PeerJS dependencies)" -ForegroundColor Green }
Write-Host "    [+] Environment files (.env)" -ForegroundColor Green
Write-Host "    [+] Data directories" -ForegroundColor Green
Write-Host ""
Write-Host "  Next step:" -ForegroundColor White
Write-Host "    .\scripts\start_services.ps1" -ForegroundColor Yellow
Write-Host ""
