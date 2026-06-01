# start-dev.ps1
# Script para iniciar el Frontend y el Backend del Sistema ERP en Desarrollo

$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Clear-Host
Write-Host "==========================================================" -ForegroundColor Magenta
Write-Host "  Secretaría de Bienestar - Sistema ERP de Mantenimiento  " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Magenta
Write-Host "Iniciando servicios del sistema..." -ForegroundColor Yellow

# Verificar dependencias en la raíz (Frontend)
if (-not (Test-Path "node_modules")) {
    Write-Host "[!] node_modules no encontrado en la raíz. Instalando dependencias..." -ForegroundColor Yellow
    npm install
}

# Verificar dependencias en backend
if (-not (Test-Path "backend/node_modules")) {
    Write-Host "[!] node_modules no encontrado en backend. Instalando dependencias del Backend..." -ForegroundColor Yellow
    Push-Location backend
    npm install
    Pop-Location
}

Write-Host "`n[+] Lanzando backend en una nueva ventana..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$Host.UI.RawUI.WindowTitle = 'ERP-Backend'; cd backend; Write-Host 'Iniciando Backend...' -ForegroundColor Cyan; npm run dev"

Write-Host "[+] Lanzando frontend en una nueva ventana..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$Host.UI.RawUI.WindowTitle = 'ERP-Frontend'; Write-Host 'Iniciando Frontend...' -ForegroundColor Cyan; npm run dev"

Write-Host "`n==========================================================" -ForegroundColor Magenta
Write-Host "¡Todo en marcha! Puedes acceder en las siguientes URLs:" -ForegroundColor Green
Write-Host "  -> Frontend:  http://localhost:30001" -ForegroundColor White
Write-Host "  -> API (Back): http://localhost:3000/api" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Magenta
Write-Host "Presiona Ctrl+C en las otras ventanas para detener los servidores." -ForegroundColor Yellow
