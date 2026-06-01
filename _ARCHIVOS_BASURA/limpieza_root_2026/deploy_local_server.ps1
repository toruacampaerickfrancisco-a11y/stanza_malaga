# Script de despliegue para Servidor Local (192.168.0.233)
$env:LC_ALL = 'C.UTF-8' 

$ServerIP = "192.168.0.233"
$User = "usuario"
$KeyFile = "id_rsa_erp_auto"

Write-Host "=== INICIANDO DESPLIEGUE EN $ServerIP ==="

# Usamos cadenas simples y evitamos caracteres especiales complicados
$scriptBlock = @'
    echo "--- [SERVIDOR] INICIO DE PROTOCOLO ---"
    export PATH=$PATH:/usr/local/bin:/usr/bin:/bin

    HOST_WORK_DIR="~/sistema-mantenimiento-deploy"
    if [ ! -d "$HOST_WORK_DIR" ]; then
        echo "[INFO] Clonando repositorio..."
        git clone https://github.com/toruacampaerickfrancisco-a11y/sistema-matenimiento.git "$HOST_WORK_DIR"
    else
        echo "[INFO] Actualizando repositorio..."
        cd "$HOST_WORK_DIR"
        git fetch --all
        git reset --hard origin/main
    fi

    cd "$HOST_WORK_DIR"

    echo "[INFO] Procesando Backend..."
    cd backend
    npm install --omit=dev

    echo "[INFO] Copiando archivos del Backend..."
    mkdir -p "/var/www/api.solicitudservicio"
    cp -r * "/var/www/api.solicitudservicio/"

    cd "/var/www/api.solicitudservicio"
    
    if [ ! -f .env ]; then
        echo "[WARN] Creando archivo .env por defecto..."
        echo "PORT=30001" > .env
        echo "NODE_ENV=production" >> .env
        echo "DB_NAME=mantenimiento_db" >> .env
        echo "DB_USER=postgres" >> .env
        echo "DB_PASS=postgres" >> .env
        echo "DB_HOST=localhost" >> .env
    fi

    echo "[INFO] Reiniciando Backend con PM2..."
    pm2 delete sistema-erp-backend 2> /dev/null || true
    pm2 start src/app.js --name "sistema-erp-backend"

    echo "[INFO] Procesando Frontend..."
    cd "$HOST_WORK_DIR/frontend"
    npm install
    
    echo "[INFO] Generando Build..."
    npm run build

    echo "[INFO] Desplegando Frontend..."
    mkdir -p "/var/www/app.solicitudservicio"
    rm -rf "/var/www/app.solicitudservicio/*"
    cp -r dist/* "/var/www/app.solicitudservicio/"

    echo "[INFO] Guardando lista de procesos PM2..."
    pm2 save

    echo "--- [SERVIDOR] DESPLIEGUE COMPLETADO EXITOSAMENTE ---"
'@

# IMPORTANTE: Eliminamos los retornos de carro de Windows para Linux
$linuxScript = $scriptBlock.Replace("`r", "")

try {
    Write-Host "Conectando al servidor..."
    ssh -i $KeyFile -o StrictHostKeyChecking=no -t ${User}@${ServerIP} $linuxScript
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n[EXITO] El sistema se ha desplegado correctamente."
    } else {
        Write-Host "`n[ERROR] Hubo un problema durante el despliegue."
    }
} catch {
    Write-Host "[ERROR CRITICO] $_"
}
