# Installs Node.js LTS via winget (Windows 10/11). Run PowerShell as Administrator if it fails.
# After install: close and reopen your terminal, then run scripts\dev.ps1
$ErrorActionPreference = "Stop"
if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
  Write-Host "winget not found. Install Node manually from https://nodejs.org/ (LTS)." -ForegroundColor Red
  exit 1
}
winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
