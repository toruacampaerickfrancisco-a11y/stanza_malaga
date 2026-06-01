# Script de despliegue para AWS EC2
# Uso: .\deploy_aws.ps1 -ServerIP "X.X.X.X" -User "ubuntu"

param (
    [string]$ServerIP = "100.109.99.110", # IP de Tailscale por defecto si está disponible
    [string]$User = "ubuntu",
    [string]$KeyFile = "id_rsa_erp_auto"
)

Write-Host "Iniciando despliegue a AWS EC2 ($ServerIP)..." -ForegroundColor Cyan

# Comandos a ejecutar remotamente
$RemoteScript = @'
    set -e # Detener si hay error

    # 1. Definir Rutas
    REPO_DIR="$HOME/stanza-malaga-app"
    BACKEND_DEST="/var/www/stanza-api"
    FRONTEND_DEST="/var/www/stanza-app"

    echo "--- [1/5] Actualizando Repositorio ---"
    if [ ! -d "$REPO_DIR" ]; then
        git clone https://github.com/toruacampaerickfrancisco-a11y/stanza_malaga.git "$REPO_DIR"
    fi

    cd "$REPO_DIR"
    git fetch --all
    git reset --hard origin/main

    echo "--- [2/5] Construyendo Frontend ---"
    cd frontend
    npm install
    export VITE_API_URL="/api"
    npm run build
    cd ..

    echo "--- [3/5] Desplegando Frontend ---"
    echo "Copiando archivos estáticos a $FRONTEND_DEST..."
    sudo mkdir -p "$FRONTEND_DEST"
    sudo rm -rf "$FRONTEND_DEST"/*
    sudo cp -r frontend/dist/* "$FRONTEND_DEST/"

    echo "--- [4/5] Desplegando Backend ---"
    echo "Preparando $BACKEND_DEST..."
    sudo mkdir -p "$BACKEND_DEST"
    sudo cp -r backend/* "$BACKEND_DEST/"
    sudo cp backend/.sequelizerc "$BACKEND_DEST/" || true

    cd "$BACKEND_DEST"
    echo "Instalando dependencias..."
    sudo npm install --omit=dev

    echo "--- [DB] Ejecutando Migraciones ---"
    # Asegurarse de que las variables de entorno de DB estén configuradas en el servidor o un archivo .env
    # npx sequelize-cli db:migrate

    echo "--- [5/5] Reiniciando Servicios ---"
    # Reiniciar con PM2
    sudo pm2 delete stanza-api 2> /dev/null || true
    sudo pm2 start src/app.js --name 'stanza-api' --cwd "$BACKEND_DEST" --update-env
    sudo pm2 save

    echo "--- DESPLIEGUE COMPLETADO ---"
'@

# Limpiar CR
$RemoteScript = $RemoteScript.Replace("`r", "")

# Ejecutar vía SSH
ssh -i $KeyFile -o StrictHostKeyChecking=no $User@$ServerIP "$RemoteScript"
