# Script de despliegue FINAL para AWS (Copia Frontend a Backend)
$pemFile = "bienestaradmin.pem"
$ip = "3.16.15.109"

if (-not (Test-Path $pemFile)) {
    Write-Host "No encuentro la llave $pemFile"
    exit
}

# Usamos comillas SIMPLES para las variables de entorno de Linux
$scriptBlock = @'
    export PATH=$PATH:/usr/local/bin:/usr/bin:/bin:/usr/local/games:/usr/games

    # 1. Directorio y Actualización
    if [ ! -d "sistema-matenimiento" ]; then
        git clone https://github.com/toruacampaerickfrancisco-a11y/sistema-matenimiento.git
    fi
    cd sistema-matenimiento

    echo '--- RESETEANDO REPOSITORIO (Hard Reset) ---'
    git fetch --all
    git reset --hard origin/main
    # Limpiar solo si hay conflictos graves, pero --hard debería bastar y es más seguro
    # git clean -fd

    # 2. Frontend BUILD
    echo '--- CONSTRUYENDO FRONTEND ---'
    cd frontend
    npm install
    # Limpiamos build anterior
    rm -rf dist
    npm run build
    cd ..

    # 3. MIGRAR FRONTEND A BACKEND (PASO CRITICO FALTANTE)
    echo '--- COPIANDO FRONTEND A BACKEND/PUBLIC ---'
    # Asegurar que el directorio destino existe y está vacío
    mkdir -p backend/public
    # Borramos contenido viejo en public (cuidado de no borrar cosas que no sean del build si las hubiera, 
    # pero normalmente public solo tiene el build)
    rm -rf backend/public/*
    
    # Copiar contenido de dist a public
    cp -r frontend/dist/* backend/public/
    echo "Archivos copiados: $(ls backend/public | wc -l)"

    # 4. Backend START
    echo '--- REINICIANDO BACKEND ---'
    cd backend
    npm install --omit=dev
    
    # Aseguramos que use el puerto correcto si no está en .env
    # Pero el .env ya debería estar. Si no, lo creamos forzado.
    if [ ! -f .env ]; then
        echo "PORT=30001" > .env
        echo "HOST=0.0.0.0" >> .env
        echo "NODE_ENV=production" >> .env
    fi

    pm2 restart all || pm2 start server.js --name 'sistema-erp'
    pm2 save

    echo '--- DESPLIEGUE FINALIZADO CORRECTAMENTE ---'
'@

# Limpiar CR
$linuxScript = $scriptBlock.Replace("`r", "")

Write-Host "Ejecutando despliegue con COPIA DE ARCHIVOS en $ip..." -ForegroundColor Green

ssh -i $pemFile -o StrictHostKeyChecking=no ubuntu@$ip $linuxScript
