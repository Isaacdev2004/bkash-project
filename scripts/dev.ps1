# One-shot local dev: install deps, start Mongo (Docker), run Vite + API together.
# Requires: Node.js 18+ (https://nodejs.org/). Optional: Docker Desktop for MongoDB.
$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

function Test-TcpPort([int]$Port) {
  try {
    $c = New-Object System.Net.Sockets.TcpClient
    $iar = $c.BeginConnect("127.0.0.1", $Port, $null, $null)
    $wait = $iar.AsyncWaitHandle.WaitOne(800, $false)
    if (-not $wait) { $c.Close(); return $false }
    $c.EndConnect($iar)
    $ok = $c.Connected
    $c.Close()
    return $ok
  } catch {
    return $false
  }
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "Node.js was not found. Install LTS from https://nodejs.org/ then run this script again." -ForegroundColor Red
  exit 1
}

Write-Host "Installing npm dependencies (root + backend)..." -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
npm install --prefix ./backend
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if (-not (Test-TcpPort 27017)) {
  if (Get-Command docker -ErrorAction SilentlyContinue) {
    Write-Host "Starting MongoDB (Docker) on port 27017..." -ForegroundColor Cyan
    $ErrorActionPreference = "Continue"
    docker compose -f "$Root/docker-compose.yml" up -d 2>&1 | Out-Host
    $ErrorActionPreference = "Stop"
    if ($LASTEXITCODE -ne 0) {
      Write-Host "Docker could not start MongoDB (is Docker Desktop running?). API may fail until MongoDB is up." -ForegroundColor Yellow
    } else {
      $tries = 0
      while ($tries -lt 30 -and -not (Test-TcpPort 27017)) {
        Start-Sleep -Seconds 1
        $tries++
      }
      if (-not (Test-TcpPort 27017)) {
        Write-Host "MongoDB did not become ready on 27017. Try: docker compose logs mongo" -ForegroundColor Yellow
      }
    }
  } else {
    Write-Host "MongoDB is not running on 127.0.0.1:27017 and Docker was not found." -ForegroundColor Yellow
    Write-Host "Install Docker Desktop and re-run, or install MongoDB Community locally." -ForegroundColor Yellow
    Write-Host "API will fail until MongoDB is available. Frontend (Vite) will still start." -ForegroundColor Yellow
  }
} else {
  Write-Host "MongoDB already reachable on port 27017." -ForegroundColor DarkGreen
}

Write-Host ""
Write-Host "Starting Vite http://localhost:8080  +  API http://localhost:4000  (Ctrl+C to stop both)" -ForegroundColor Green
npm run dev:all
