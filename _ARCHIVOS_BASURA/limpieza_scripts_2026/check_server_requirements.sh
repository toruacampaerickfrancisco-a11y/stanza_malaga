#!/bin/bash
# Check server requirements for deployment

echo "=== DIAGNOSTICO DE SERVIDOR ==="
echo "Fecha: $(date)"
echo "Usuario: $(whoami)"
echo "Host: $(hostname -I)"

FAIL=0

echo "------------------------------------------------"
echo "1. Verificando Node.js..."
if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node -v)
    echo "   [OK] Node.js instalado: $NODE_VERSION"
else
    echo "   [FAIL] Node.js NO encontrado."
    FAIL=1
fi

echo "------------------------------------------------"
echo "2. Verificando PM2..."
if command -v pm2 >/dev/null 2>&1; then
    PM2_VERSION=$(pm2 -v)
    echo "   [OK] PM2 instalado: $PM2_VERSION"
else
    echo "   [WARN] PM2 NO encontrado. Se recomienda para producción."
fi

echo "------------------------------------------------"
echo "3. Verificando Directorios de Destino..."

BACKEND_DIR="/var/www/api.solicitudservicio"
FRONTEND_DIR="/var/www/app.solicitudservicio"

if [ -d "$BACKEND_DIR" ]; then
    echo "   [OK] Directorio Backend existe: $BACKEND_DIR"
    if [ -w "$BACKEND_DIR" ]; then
         echo "   [OK] Tiene permisos de escritura."
    else
         echo "   [FAIL] NO tiene permisos de escritura en $BACKEND_DIR"
         echo "          Propietario: $(ls -ld $BACKEND_DIR | awk '{print $3:$4}')"
         FAIL=1
    fi
else
    echo "   [FAIL] Directorio Backend NO existe: $BACKEND_DIR"
    FAIL=1
fi

if [ -d "$FRONTEND_DIR" ]; then
    echo "   [OK] Directorio Frontend existe: $FRONTEND_DIR"
    if [ -w "$FRONTEND_DIR" ]; then
         echo "   [OK] Tiene permisos de escritura."
    else
         echo "   [FAIL] NO tiene permisos de escritura en $FRONTEND_DIR"
         echo "          Propietario: $(ls -ld $FRONTEND_DIR | awk '{print $3:$4}')"
         FAIL=1
    fi
else
    echo "   [FAIL] Directorio Frontend NO existe: $FRONTEND_DIR"
    FAIL=1
fi

echo "------------------------------------------------"
echo "4. Verificando Nginx..."
if command -v nginx >/dev/null 2>&1; then
    echo "   [OK] Nginx instalado."
else
    echo "   [WARN] Nginx NO encontrado (puede ser Apache o estar en otro path)."
fi

echo "------------------------------------------------"
echo "5. Verificando PostgreSQL..."
if command -v psql >/dev/null 2>&1; then
    echo "   [OK] Cliente PSQL instalado: $(psql --version)"
else
    echo "   [WARN] Cliente PSQL NO encontrado."
fi

echo "------------------------------------------------"
echo "RESUMEN:"
if [ $FAIL -eq 0 ]; then
    echo ">>> EL SERVIDOR PARECE LISTO PARA EL DESPLIEGUE (Revisar advertencias)"
else
    echo ">>> EXISTEN ERRORES QUE DEBEN CORREGIRSE ANTES DE DESPLEGAR"
fi
