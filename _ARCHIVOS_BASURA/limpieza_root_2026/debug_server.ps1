# Script de Diagnóstico Remoto V2
$pemFile = "bienestaradmin.pem"
$ip = "3.16.15.109"

$scriptBlock = @'
    echo "=== LEER CONFIGURACION NGINX ==="
    cat /etc/nginx/sites-available/sistema-erp
    
    echo "=== VERIFICAR BUILD RECIENTE ==="
    ls -l ~/sistema-matenimiento/frontend/dist/index.html
'@

# Limpiar CR
$linuxScript = $scriptBlock.Replace("`r", "")

ssh -i $pemFile -o StrictHostKeyChecking=no ubuntu@$ip $linuxScript
