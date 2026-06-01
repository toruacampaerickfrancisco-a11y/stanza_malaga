#!/bin/bash

# Script de despliegue para Ubuntu (AWS EC2)
# Uso: ./deploy-ubuntu.sh

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}=== Iniciando Despliegue del Sistema ERP ===${NC}"

# 1. Actualizar sistema
echo -e "${GREEN}[1/9] Actualizando sistema...${NC}"
sudo apt update && sudo apt upgrade -y

# 2. Instalar Node.js (v20 LTS)
echo -e "${GREEN}[2/9] Instalando Node.js v20...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs build-essential

# 3. Instalar PM2 y TypeScript globalmente
echo -e "${GREEN}[3/9] Instalando herramientas globales...${NC}"
sudo npm install -g pm2 typescript

# 4. Clonar repositorio
echo -e "${GREEN}[4/9] Obteniendo código fuente...${NC}"
if [ -d "sistema-matenimiento" ]; then
    echo "El directorio ya existe. Actualizando..."
    cd sistema-matenimiento
    git pull
else
    git clone https://github.com/toruacampaerickfrancisco-a11y/sistema-matenimiento.git
    cd sistema-matenimiento
fi

# 5. Configurar Backend
echo -e "${GREEN}[5/9] Configurando Backend...${NC}"
cd backend
npm install

# Crear .env backend si no existe
if [ ! -f .env ]; then
    echo "Creando archivo .env para backend..."
    cat > .env << EOL
PORT=30001
HOST=0.0.0.0
NODE_ENV=production
JWT_SECRET=$(openssl rand -hex 32)
# Ajusta estas variables según tu configuración de base de datos si usas PostgreSQL
# DB_DIALECT=postgres
# DB_HOST=localhost
# DB_USER=postgres
# DB_PASS=password
# DB_NAME=mantenimiento_erp
EOL
fi

cd ..

# 6. Configurar Frontend
echo -e "${GREEN}[6/9] Configurando Frontend...${NC}"
cd frontend
npm install

# Crear .env frontend
# Usamos /api relativo para que funcione con el proxy del backend
echo "VITE_API_URL=/api" > .env

# 7. Construir Frontend
echo -e "${GREEN}[7/9] Construyendo Frontend...${NC}"
npm run build

# 8. Integrar Frontend en Backend
echo -e "${GREEN}[8/9] Integrando archivos estáticos...${NC}"
mkdir -p ../backend/public
# Limpiar directorio public anterior
rm -rf ../backend/public/*
# Copiar nuevos archivos
cp -r dist/* ../backend/public/

cd ..

# 9. Iniciar Servicio
echo -e "${GREEN}[9/9] Iniciando servicio...${NC}"
cd backend

# Detener instancia previa si existe
pm2 delete sistema-erp 2>/dev/null || true

# Iniciar nueva instancia
pm2 start src/app.js --name "sistema-erp"
pm2 save
pm2 startup | tail -n 1 > startup_script.sh
chmod +x startup_script.sh
./startup_script.sh
rm startup_script.sh

# Configurar Firewall básico
echo -e "${BLUE}Configurando firewall...${NC}"
sudo ufw allow 22
sudo ufw allow 30001
sudo ufw allow 80
sudo ufw allow 443
# sudo ufw --force enable

echo -e "${GREEN}=== ¡Despliegue Completado! ===${NC}"
echo -e "El sistema está corriendo en el puerto 30001."
echo -e "Accede vía: http://<TU_IP_PUBLICA>:30001"
