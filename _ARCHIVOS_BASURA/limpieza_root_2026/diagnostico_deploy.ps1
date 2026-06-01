$ServerIP = "192.168.0.233"
$User = "usuario"
# Nota: La contraseña la pedirá el comando SSH/SCP interactivo

$LocalScript = "scripts/check_server_requirements.sh"
$RemoteScript = "/tmp/check_server_requirements.sh"

Write-Host "=== INICIANDO DIAGNOSTICO REMOTO ==="
Write-Host "Servidor: $ServerIP"
Write-Host "Usuario: $User"
Write-Host ""
Write-Host "Paso 1: Copiando script de diagnóstico al servidor..."
Write-Host "Por favor, introduce la contraseña ($($User)) si se solicita:"

# Usamos scp para copiar el archivo
try {
    scp $LocalScript ${User}@${ServerIP}:${RemoteScript}
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   [OK] Script copiado exitosamente."
    } else {
        Write-Host "   [ERROR] Falló la copia del script. Verifica conectividad y credenciales."
        exit
    }
} catch {
    Write-Host "   [ERROR] Error ejecutando SCP: $_"
    exit
}

Write-Host ""
Write-Host "Paso 2: Ejecutando diagnóstico en el servidor..."
Write-Host "Por favor, introduce la contraseña de nuevo si se solicita:"

try {
    ssh -t ${User}@${ServerIP} "chmod +x $RemoteScript && $RemoteScript"
} catch {
    Write-Host "   [ERROR] Error ejecutando SSH: $_"
}

Write-Host ""
Write-Host "=== FIN DEL DIAGNOSTICO ==="
