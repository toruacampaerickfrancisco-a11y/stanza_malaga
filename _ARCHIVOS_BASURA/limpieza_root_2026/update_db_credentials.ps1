# Script para actualizar credenciales de BASE DE DATOS
$env:LC_ALL = 'C.UTF-8' 

$ServerIP = "192.168.0.233"
$User = "usuario"
$KeyFile = "id_rsa_erp_auto"
$RemoteBackendPath = "/var/www/api.solicitudservicio"

Write-Host "=== ACTUALIZANDO BASE DE DATOS EN $ServerIP ==="

# Simplificamos el script para evitar errores de sintaxis con paréntesis
$scriptBlock = @'
    cd "/var/www/api.solicitudservicio"
    
    if [ ! -f .env ]; then
        echo "ERROR: No existe archivo .env"
        exit 1
    fi

    echo "Actualizando variables en .env..."

    # Borramos variables antiguas
    sed -i '/^DB_NAME=/d' .env
    sed -i '/^DB_USER=/d' .env
    sed -i '/^DB_PASS=/d' .env
    sed -i '/^DB_HOST=/d' .env

    # Añadimos las nuevas al final
    echo "DB_NAME=sistema-mantenimientoDB" >> .env
    echo "DB_USER=postgres" >> .env
    echo "DB_PASS=Bienestar2025+" >> .env
    echo "DB_HOST=localhost" >> .env

    echo "Reiniciando servicio..."
    pm2 restart sistema-erp-backend

    echo "--- ACTUALIZACIÓN COMPLETADA ---"
'@

# Limpiar caracteres Windows y ejecutar
$linuxScript = $scriptBlock.Replace("`r", "")

try {
    ssh -i $KeyFile -o StrictHostKeyChecking=no -t ${User}@${ServerIP} $linuxScript
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n[EXITO] Credenciales de base de datos actualizadas."
    }
} catch {
    Write-Host "[ERROR] $_"
}
