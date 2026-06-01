@echo off
REM Script de arranque configurado con rutas absolutas

start "Frontend" cmd /k "cd /d "C:\Users\erick\Desktop\Sistema Mantenimiento ERP\restore_package" && call iniciar-frontend.bat"
start "Backend" cmd /k "cd /d "C:\Users\erick\Desktop\Sistema Mantenimiento ERP\restore_package" && call iniciar-backend.bat"
