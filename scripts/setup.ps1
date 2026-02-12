<# Interview Platform - Setup Virtual Environments #>
Write-Host "Setting up Interview Platform Virtual Environments..." -ForegroundColor Green

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

# Setup single virtual environment for backend
Write-Host "`n[1/1] Setting up Backend..." -ForegroundColor Yellow
Set-Location "$ProjectRoot\backend"
python -m venv venv
.\venv\Scripts\pip install -r requirements.txt

# Create uploads directory
Write-Host "`nCreating data directories..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "$ProjectRoot\data\storage\uploads" | Out-Null

# Return to root
Set-Location $ProjectRoot

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Setup complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`nRun .\scripts\start_services.ps1 to start all services." -ForegroundColor White
