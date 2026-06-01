# Script para REINICIAR COMPLETAMENTE la Base de Datos
$env:LC_ALL = 'C.UTF-8' 

$ServerIP = "192.168.0.233"
$User = "usuario"
$KeyFile = "id_rsa_erp_auto"

Write-Host "=== RECREANDO BASE DE DATOS EN $ServerIP ==="

# Simplificado al máximo para evitar errores de sintaxis
$scriptBlock = @'
    export PGPASSWORD='Bienestar2025+'
    
    echo "1. Eliminando base de datos..."
    # Drop Database forzado (si falla la desconexion, intentamos borrar directo)
    # Nota: Si hay conexiones activas fallara, pero postgres moderno tiene FORCE
    
    dropdb -h localhost -U postgres --if-exists --force "sistema-mantenimientoDB"
    
    echo "2. Creando base de datos limpia..."
    createdb -h localhost -U postgres "sistema-mantenimientoDB"
    
    echo "3. Ejecutando migraciones..."
    cd /var/www/api.solicitudservicio
    export NODE_ENV=production
    npx sequelize-cli db:migrate --env production

    echo "--- PROCESO COMPLETADO ---"
'@

# Limpiar script linux
$linuxScript = $scriptBlock.Replace("`r", "")

try {
    ssh -i $KeyFile -o StrictHostKeyChecking=no -t ${User}@${ServerIP} $linuxScript
} catch {
    Write-Host "[ERROR] $_"
}
