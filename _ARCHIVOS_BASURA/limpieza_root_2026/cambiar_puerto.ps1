# Script para cambiar PUERTO del Backend en Producción
$env:LC_ALL = 'C.UTF-8' 

$ServerIP = "192.168.0.233"
$User = "usuario"
$KeyFile = "id_rsa_erp_auto"
$TargetPort = "3002"
$RemoteBackendPath = "/var/www/api.solicitudservicio"

Write-Host "=== CAMBIANDO PUERTO A $TargetPort EN $ServerIP ==="

$scriptBlock = @"
    echo "[SERVIDOR] Configurando nuevo puerto..."
    
    cd "$RemoteBackendPath"
    
    if [ -f .env ]; then
        # Usamos sed para reemplazar in-place
        sed -i 's/PORT=.*/PORT=$TargetPort/' .env
        echo "[OK] Archivo .env actualizado."
        grep "PORT" .env
    else
        echo "[ERROR] No encuentro archivo .env"
        exit 1
    fi

    # Reiniciar PM2 para aplicar cambios
    echo "[PM2] Reiniciando servicio..."
    pm2 delete sistema-erp-backend 2> /dev/null || true
    pm2 start src/app.js --name "sistema-erp-backend" --port $TargetPort
    pm2 save
    
    echo "--- CAMBIO COMPLETADO ---"
"@

# IMPORTANTE: Eliminamos los retornos de carro de Windows para Linux
$linuxScript = $scriptBlock.Replace("`r", "")

try {
    ssh -i $KeyFile -o StrictHostKeyChecking=no -t ${User}@${ServerIP} $linuxScript
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n[EXITO] Backend reiniciado en puerto $TargetPort"
    }
} catch {
    Write-Host "[ERROR] $_"
}
