<# Job Saarthi - Code Execution Stack Starter #>
param(
    [switch]$Dev,
    [switch]$SkipRedis,
    [string]$RedisContainerName = 'jobsaarthi-redis',
    [string]$RedisImage = 'redis:7-alpine',
    [int]$RedisPort = 6379
)

$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$BackendDir = Join-Path $ProjectRoot 'Backend'

function Test-CommandAvailable {
    param([string]$CommandName)

    return [bool](Get-Command $CommandName -ErrorAction SilentlyContinue)
}

function Start-ServiceWindow {
    param(
        [string]$Title,
        [string]$WorkingDirectory,
        [string]$Command
    )

    $escapedWorkingDirectory = $WorkingDirectory.Replace("'", "''")
    $escapedTitle = $Title.Replace("'", "''")
    $composedCommand = @(
        "`$host.UI.RawUI.WindowTitle = '$escapedTitle'"
        "Set-Location '$escapedWorkingDirectory'"
        $Command
    ) -join '; '

    Start-Process powershell -ArgumentList @(
        '-NoExit',
        '-ExecutionPolicy', 'Bypass',
        '-Command', $composedCommand
    ) | Out-Null
}

function Ensure-RedisContainer {
    param(
        [string]$ContainerName,
        [string]$Image,
        [int]$HostPort
    )

    $existingContainerId = docker ps -aq --filter "name=^${ContainerName}$"

    if (-not $existingContainerId) {
        Write-Host "  Creating Redis container '$ContainerName' on port $HostPort..." -ForegroundColor DarkGray
        docker run -d --name $ContainerName -p "${HostPort}:6379" $Image | Out-Null
    } else {
        $isRunning = docker inspect -f "{{.State.Running}}" $ContainerName

        if ($isRunning -eq 'true') {
            Write-Host "  Redis container '$ContainerName' is already running." -ForegroundColor DarkGray
        } else {
            Write-Host "  Starting existing Redis container '$ContainerName'..." -ForegroundColor DarkGray
            docker start $ContainerName | Out-Null
        }
    }

    for ($attempt = 1; $attempt -le 10; $attempt++) {
        $pingResult = docker exec $ContainerName redis-cli ping 2>$null
        if ($LASTEXITCODE -eq 0 -and $pingResult -match 'PONG') {
            Write-Host "  Redis is ready." -ForegroundColor Green
            return
        }

        Start-Sleep -Seconds 1
    }

    throw "Redis container '$ContainerName' did not become ready on time."
}

function Assert-DockerDaemonReady {
    try {
        docker info | Out-Null
    } catch {
        Write-Host "[ERROR] Docker is installed but the Docker daemon is not running." -ForegroundColor Red
        Write-Host "        Start Docker Desktop, wait until it shows as running, then rerun this command." -ForegroundColor Red
        Write-Host "        If you already have Redis running outside Docker, rerun with -SkipRedis." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Job Saarthi - Code Execution Stack" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path "$BackendDir\node_modules")) {
    Write-Host "[ERROR] Backend dependencies are missing. Run npm install in Backend first." -ForegroundColor Red
    exit 1
}

if (-not (Test-CommandAvailable 'node')) {
    Write-Host "[ERROR] Node.js is not installed or not on PATH." -ForegroundColor Red
    exit 1
}

if (-not (Test-CommandAvailable 'npm.cmd')) {
    Write-Host "[ERROR] npm.cmd is not installed or not on PATH." -ForegroundColor Red
    exit 1
}

if (-not $SkipRedis) {
    if (-not (Test-CommandAvailable 'docker')) {
        Write-Host "[ERROR] Docker is required to start Redis automatically." -ForegroundColor Red
        Write-Host "        Install Docker Desktop or rerun with -SkipRedis if Redis is already running." -ForegroundColor Red
        exit 1
    }

    Assert-DockerDaemonReady

    Write-Host "[Redis]" -ForegroundColor Yellow
    Ensure-RedisContainer -ContainerName $RedisContainerName -Image $RedisImage -HostPort $RedisPort
    Write-Host ""
}

$backendCommand = if ($Dev) { 'npm.cmd run dev' } else { 'npm.cmd start' }
$workerCommand = if ($Dev) { 'npm.cmd run dev:worker' } else { 'npm.cmd run worker' }

Write-Host "[Backend API]" -ForegroundColor Yellow
Write-Host "  Starting backend on http://localhost:8000 ..." -ForegroundColor DarkGray
Start-ServiceWindow -Title 'Job Saarthi Backend (8000)' -WorkingDirectory $BackendDir -Command $backendCommand
Write-Host "  Backend window launched." -ForegroundColor Green
Write-Host ""

Write-Host "[Execution Worker]" -ForegroundColor Yellow
Write-Host "  Starting BullMQ worker ..." -ForegroundColor DarkGray
Start-ServiceWindow -Title 'Job Saarthi Worker' -WorkingDirectory $BackendDir -Command $workerCommand
Write-Host "  Worker window launched." -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Stack Started" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Backend health:    http://localhost:8000/health" -ForegroundColor White
Write-Host "  Redis container:   $RedisContainerName" -ForegroundColor White
Write-Host "  Mode:              $(if ($Dev) { 'development' } else { 'production scripts' })" -ForegroundColor White
Write-Host ""
Write-Host "  Commands:" -ForegroundColor White
Write-Host "    npm run start:code-execution" -ForegroundColor Yellow
Write-Host "    npm run start:code-execution:dev" -ForegroundColor Yellow
Write-Host ""
Write-Host "  To stop the stack: close the backend and worker windows, then optionally run:" -ForegroundColor DarkGray
Write-Host "    docker stop $RedisContainerName" -ForegroundColor DarkGray
Write-Host ""
