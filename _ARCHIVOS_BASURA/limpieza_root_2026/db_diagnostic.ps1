# Script de diagnostico de BASE DE DATOS
$env:LC_ALL = 'C.UTF-8' 

$ServerIP = "192.168.0.233"
$User = "usuario"
$KeyFile = "id_rsa_erp_auto"

Write-Host "=== TESTEANDO CONEXION A BASE DE DATOS DESDE EL SERVIDOR ==="

$scriptBlock = @'
    export PGPASSWORD='Bienestar2025+'
    
    echo "1. Probando conexion basica a Postgres..."
    # Usamos simples comandos sin caracteres especiales
    psql -h localhost -U postgres -d postgres -c "SELECT 1" 
    
    if [ $? -eq 0 ]; then
        echo "   [OK] Conexion exitosa (Usuario/Pass correcto)."
    else
        echo "   [FAIL] Fallo la autenticacion o el servidor no corre."
        exit 1
    fi

    echo "2. Listando bases de datos..."
    psql -h localhost -U postgres -c "\l"
'@

# Limpiar caracteres Windows y ejecutar
$linuxScript = $scriptBlock.Replace("`r", "")

try {
    ssh -i $KeyFile -o StrictHostKeyChecking=no -t ${User}@${ServerIP} $linuxScript
} catch {
    Write-Host "[ERROR] $_"
}
