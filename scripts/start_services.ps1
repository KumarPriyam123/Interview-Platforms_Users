<# Interview Platform - Start All Services #>
Write-Host "Starting Interview Platform Microservices..." -ForegroundColor Green

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

# Start Resume Parser service
Write-Host "`nStarting Resume Parser Service (Port 8001)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ProjectRoot\backend'; .\venv\Scripts\activate; cd src\services\parsing; uvicorn main:app --host 0.0.0.0 --port 8001 --reload"

# Start Profile Matching service
Write-Host "Starting Profile Matching Service (Port 8002)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ProjectRoot\backend'; .\venv\Scripts\activate; cd src\services\matching; uvicorn main:app --host 0.0.0.0 --port 8002 --reload"

# Wait a moment for services to start
Start-Sleep -Seconds 3

# Start API Gateway
Write-Host "Starting API Gateway (Port 8000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ProjectRoot\backend'; .\venv\Scripts\activate; cd src\api; uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "All services started!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`nAccess points:" -ForegroundColor White
Write-Host "  API Gateway:      http://localhost:8000/docs" -ForegroundColor White
Write-Host "  Resume Parser:    http://localhost:8001/docs" -ForegroundColor White
Write-Host "  Profile Matching: http://localhost:8002/docs" -ForegroundColor White
