<# 
=============================================================================
Karma Fire Protection LLP - Project Runner (PowerShell)
=============================================================================
Usage: .\run-project.ps1 [setup|run|stop|restart|status|logs]
=============================================================================
#>

param(
    [Parameter(Mandatory=$true, Position=0)]
    [ValidateSet('setup','run','stop','restart','status','logs')]
    [string]$Command
)

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
$BackendDir = Join-Path $ProjectRoot "backend\telegram-leads"
$FrontendDir = $ProjectRoot
$BackendPort = 3000
$FrontendPort = 8080
$PidFile = Join-Path $ProjectRoot ".pids.json"

function Write-Log { param([string]$Msg) Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Msg" -ForegroundColor Cyan }
function Write-Success { param([string]$Msg) Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Msg" -ForegroundColor Green }
function Write-Error { param([string]$Msg) Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] ERROR: $Msg" -ForegroundColor Red }
function Write-Warn { param([string]$Msg) Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] WARNING: $Msg" -ForegroundColor Yellow }

function Test-Port { param([int]$Port) (Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue).Count -gt 0 }
function Kill-Port { param([int]$Port) Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue; Write-Log "Killed PID $($_.OwningProcess) on port $Port" } }
function Save-Pids { param([hashtable]$Pids) $Pids | ConvertTo-Json | Set-Content -Path $PidFile -Force }
function Load-Pids { if (Test-Path $PidFile) { Get-Content $PidFile | ConvertFrom-Json } else { @{} } }

# ============================================================================
# SETUP
# ============================================================================
function Invoke-Setup {
    Write-Log "Starting project setup..."
    
    # Check Node.js
    try { $nodeVer = node --version; Write-Success "Node.js found: $nodeVer" }
    catch { Write-Error "Node.js not found. Install from https://nodejs.org"; exit 1 }
    
    # Backend setup
    Write-Log "Setting up backend..."
    Set-Location $BackendDir
    if (-not (Test-Path "package.json")) { Write-Error "package.json not found"; exit 1 }
    
    if (-not (Test-Path "node_modules")) {
        Write-Log "Installing backend dependencies..."
        npm install
        if ($LASTEXITCODE -ne 0) { Write-Error "npm install failed"; exit 1 }
        Write-Success "Backend dependencies installed"
    } else { Write-Log "Backend dependencies already installed" }
    
    # Create .env from example
    if (-not (Test-Path ".env")) {
        $example = Join-Path $ProjectRoot "config\.env.example"
        if (Test-Path $example) {
            Copy-Item $example ".env" -Force
            Write-Success "Created .env from template"
            Write-Warn "IMPORTANT: Edit $BackendDir\.env with your Telegram credentials!"
        } else { Write-Error ".env.example not found in config/"; exit 1 }
    } else { Write-Log ".env already exists" }
    
    # Check required env vars
    $envContent = Get-Content ".env" -Raw
    @("TELEGRAM_BOT_TOKEN","TELEGRAM_CHAT_ID","ADMIN_TELEGRAM_IDS") | ForEach-Object {
        if ($envContent -notmatch "^$_=") { Write-Warn "$_ not set in .env" }
    }
    
    Write-Success "Setup complete!"
    Write-Log "`nNext steps:"
    Write-Log "  1. Edit $BackendDir\.env with your Telegram credentials"
    Write-Log "  2. Run: .\run-project.ps1 run"
}

# ============================================================================
# RUN
# ============================================================================
function Invoke-Run {
    Write-Log "Starting Karma Fire Protection servers..."
    
    $pids = @{}
    
    # Backend
    if (Test-Port $BackendPort) { Write-Warn "Backend already running on port $BackendPort" }
    else {
        Write-Log "Starting backend on port $BackendPort..."
        Set-Location $BackendDir
        $backendJob = Start-Process node -ArgumentList "server.js" -WorkingDirectory $BackendDir -PassThru -WindowStyle Hidden
        Start-Sleep 3
        $pid = (Get-NetTCPConnection -LocalPort $BackendPort -ErrorAction SilentlyContinue).OwningProcess
        if ($pid) { $pids[$BackendPort] = $pid; Write-Success "Backend started (PID: $pid) - http://localhost:$BackendPort" }
        else { Write-Error "Backend failed to start"; Get-Content backend.log -Tail 20 }
    }
    
    # Frontend
    if (Test-Port $FrontendPort) { Write-Warn "Frontend already running on port $FrontendPort" }
    else {
        Write-Log "Starting frontend on port $FrontendPort..."
        Set-Location $FrontendDir
        
        if (Get-Command python -ErrorAction SilentlyContinue) {
            $frontendJob = Start-Process python -ArgumentList "-m","http.server",$FrontendPort.ToString() -WorkingDirectory $FrontendDir -PassThru -WindowStyle Hidden
            Write-Log "Using Python http.server"
        } elseif (Get-Command npx -ErrorAction SilentlyContinue) {
            $frontendJob = Start-Process npx -ArgumentList "serve",".","-p",$FrontendPort.ToString() -WorkingDirectory $FrontendDir -PassThru -WindowStyle Hidden
            Write-Log "Using npx serve"
        } else {
            Write-Error "Neither Python nor npx found. Install Python or Node.js with npx"; exit 1
        }
        
        Start-Sleep 2
        $pid = (Get-NetTCPConnection -LocalPort $FrontendPort -ErrorAction SilentlyContinue).OwningProcess
        if ($pid) { $pids[$FrontendPort] = $pid; Write-Success "Frontend started (PID: $pid) - http://localhost:$FrontendPort" }
        else { Write-Error "Frontend failed to start" }
    }
    
    Save-Pids $pids
    
    Write-Log "`n" + ("=" * 60)
    Write-Success "All servers running!"
    Write-Log "  Frontend: http://localhost:$FrontendPort"
    Write-Log "  Backend:  http://localhost:$BackendPort"
    Write-Log "  Health:   http://localhost:$BackendPort/api/health"
    Write-Log ("=" * 60)
    Write-Log "`nTo stop: .\run-project.ps1 stop"
    Write-Log "To view logs: .\run-project.ps1 logs"
}

# ============================================================================
# STOP
# ============================================================================
function Invoke-Stop {
    Write-Log "Stopping all servers..."
    Kill-Port $BackendPort
    Kill-Port $FrontendPort
    if (Test-Path $PidFile) { Remove-Item $PidFile -Force }
    Write-Success "All servers stopped"
}

# ============================================================================
# STATUS
# ============================================================================
function Invoke-Status {
    Write-Log "Checking server status...`n"
    
    $backendPid = (Get-NetTCPConnection -LocalPort $BackendPort -ErrorAction SilentlyContinue).OwningProcess
    $frontendPid = (Get-NetTCPConnection -LocalPort $FrontendPort -ErrorAction SilentlyContinue).OwningProcess
    
    if ($backendPid) { Write-Success "Backend:  RUNNING on port $BackendPort (PID: $backendPid)" }
    else { Write-Error "Backend:  STOPPED (port $BackendPort)" }
    
    if ($frontendPid) { Write-Success "Frontend: RUNNING on port $FrontendPort (PID: $frontendPid)" }
    else { Write-Error "Frontend: STOPPED (port $FrontendPort)" }
    
    Write-Log "`nTest endpoints:"
    Write-Log "  curl http://localhost:$BackendPort/api/health"
    Write-Log "  curl -X POST http://localhost:$BackendPort/api/leads -H 'Content-Type: application/json' -d '{\"name\":\"Test\",\"phone\":\"+919876543210\",\"email\":\"test@example.com\",\"service\":\"Fire Alarm System\",\"location\":\"Mumbai\",\"message\":\"Test\",\"consent\":true}'"
}

# ============================================================================
# LOGS
# ============================================================================
function Invoke-Logs {
    Write-Log "=== Backend Log (last 50 lines) ==="
    $backendLog = Join-Path $BackendDir "backend.log"
    if (Test-Path $backendLog) { Get-Content $backendLog -Tail 50 } else { Write-Warn "No backend.log found" }
    
    Write-Log "`n=== Frontend Log (last 50 lines) ==="
    $frontendLog = Join-Path $FrontendDir "frontend.log"
    if (Test-Path $frontendLog) { Get-Content $frontendLog -Tail 50 } else { Write-Warn "No frontend.log found" }
}

# ============================================================================
# MAIN
# ============================================================================
try {
    switch ($Command) {
        'setup'    { Invoke-Setup }
        'run'      { Invoke-Run }
        'stop'     { Invoke-Stop }
        'restart'  { Invoke-Stop; Start-Sleep 2; Invoke-Run }
        'status'   { Invoke-Status }
        'logs'     { Invoke-Logs }
    }
} catch {
    Write-Error "Command failed: $_"
    exit 1
}