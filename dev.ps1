<#
.SYNOPSIS
    Lance l'application Interclub Dashboard en mode développement.
.PARAMETER Target
    'all' (défaut), 'front' ou 'server'
.EXAMPLE
    .\dev.ps1
    .\dev.ps1 front
    .\dev.ps1 server
#>
param(
    [ValidateSet('all', 'front', 'server')]
    [string]$Target = 'all'
)

$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$FrontDir = Join-Path $RootDir 'interclub-dashboard'
$ServerDir = Join-Path $RootDir 'server'

Write-Host "=== Interclub Dashboard (Mode Dev: $Target) ===" -ForegroundColor Cyan

switch ($Target) {
    'front' {
        Write-Host "Démarrage du Frontend (Vite) sur http://localhost:5173 ..." -ForegroundColor Green
        Set-Location $FrontDir
        npm run dev
    }
    'server' {
        Write-Host "Démarrage du Backend (Express/Prisma) sur http://localhost:3001 ..." -ForegroundColor Yellow
        Set-Location $ServerDir
        npm run dev
    }
    'all' {
        Write-Host "Démarrage du Backend (:3001) dans une nouvelle fenêtre..." -ForegroundColor Yellow
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$ServerDir'; npm run dev"
        
        Write-Host "Démarrage du Frontend (:5173)..." -ForegroundColor Green
        Set-Location $FrontDir
        npm run dev
    }
}
