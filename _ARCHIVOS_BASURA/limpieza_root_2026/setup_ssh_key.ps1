# Script para configurar LLAVE SSH y OLVIDARSE de las contraseñas
# Ejecuta esto desde PowerShell: .\setup_ssh_key.ps1

$ErrorActionPreference = "Stop"
$KeyName = "id_rsa_erp_auto"
$User = "usuario"
$IP = "192.168.0.233"

Write-Host "=== CONFIGURACION DE ACCESO SIN CONTRASEÑA ==="

# 1. Generar LLAVE si no existe
if (-not (Test-Path "$KeyName")) {
    Write-Host "[1/3] Generando llave de seguridad nueva ($KeyName)..."
    & ssh-keygen -t rsa -b 2048 -f $KeyName -N '""'
} else {
    Write-Host "[1/3] La llave ya existe. Usando la existente."
}

# 2. Verificar que se creó
if (-not (Test-Path "$KeyName.pub")) {
    Write-Error "No se encontró el archivo de llave pública. Algo salió mal."
    exit
}

$PubKey = Get-Content "$KeyName.pub" | Out-String
$PubKey = $PubKey.Trim()

# 3. Copiar al servidor
Write-Host "`n[2/3] PREPARANDO PARA COPIAR AL SERVIDOR..."
Write-Host "---------------------------------------------------------------------"
Write-Host "ATENCION: A continuación se ejecutará un comando SSH."
Write-Host "TE PEDIRÁ LA CONTRASEÑA ($User) POR ÚLTIMA VEZ."
Write-Host "--> ESCRIBE 'Password1' Y PRESIONA ENTER AUNQUE NO VEAS NADA <--"
Write-Host "---------------------------------------------------------------------"
Pause

# Comando robusto para añadir la key
$sshCommand = "ssh $User@$IP ""mkdir -p ~/.ssh && chmod 700 ~/.ssh && echo $PubKey >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"""

try {
    cmd /c $sshCommand
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n[3/3] ¡EXITO! Llave configurada."
        
        Write-Host "`n[PRUEBA] Intentando conectar SIN contraseña..."
        ssh -i $KeyName -o StrictHostKeyChecking=no -o PasswordAuthentication=no $User@$IP "echo CONEXION_EXITOSA"
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "`nLISTO. Ahora puedes ejecutar tus scripts de despliegue sin problemas."
            Write-Host "Para el futuro, usa esta identidad: ssh -i $KeyName $User@$IP"
        } else {
            Write-Host "`n[ADVERTENCIA] La prueba automática falló. Intenta entrar manualmente."
        }
    } else {
        Write-Host "`n[FALLO] La contraseña fue incorrecta o hubo error de red."
    }
} catch {
    Write-Host "Error general: $_"
}
