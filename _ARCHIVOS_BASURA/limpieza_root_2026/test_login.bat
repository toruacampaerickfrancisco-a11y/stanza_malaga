@echo off
echo === PRUEBA DE CONEXION SSH ===
echo.
echo Servidor: 192.168.0.233
echo Usuario: usuario
echo.
echo INSTRUCCIONES:
echo 1. Cuando aparezca "password:", escribe Password1 (o pegalo con clic derecho).
echo 2. NO VERAS NADA en la pantalla. Es normal.
echo 3. Presiona ENTER.
echo.
echo Intentando conectar...
ssh -o ConnectTimeout=10 usuario@192.168.0.233 "echo [EXITO] Has logrado entrar correctamente."
echo.
if %errorlevel% neq 0 (
    echo [FALLO] La contraseña no fue aceptada o no se pudo conectar.
    echo Revisa mayusculas, minusculas o si esta activado el Bloq Num.
) else (
    echo [EXITO] ¡Conexión verificada! Ahora puedes ejecutar los otros scripts.
)
pause
