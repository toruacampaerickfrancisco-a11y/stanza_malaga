import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Cargar configuración
// backend/scripts/check-system-health.js -> backend/.env
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

console.log('--- INICIO DE DIAGNÓSTICO DEL SISTEMA ---');
console.log(`Cargando entorno desde: ${envPath}`);

async function checkBackend() {
  console.log('\n[BACKEND] Verificando conexión a base de datos...');
  
  if (!process.env.DB_NAME) {
    console.error('❌ ERROR: Variables de entorno no cargadas (DB_NAME es undefined).');
    return false;
  }

  const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      dialect: process.env.DB_DIALECT || 'postgres',
      logging: false
    }
  );

  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a Base de Datos EXITOSA.');
    console.log(`   Host: ${process.env.DB_HOST}:${process.env.DB_PORT}`);
    console.log(`   Database: ${process.env.DB_NAME}`);
    await sequelize.close();
    return true;
  } catch (error) {
    console.error('❌ ERROR de Conexión:', error.message);
    return false;
  }
}

function checkFrontend() {
  console.log('\n[FRONTEND] Verificando estructura crítica...');
  
  // Ruta relativa desde este script (backend/scripts) hacia frontend
  const frontendPath = path.resolve(__dirname, '../../frontend');
  const mainTsx = path.join(frontendPath, 'src', 'main.tsx');
  const indexHtml = path.join(frontendPath, 'index.html');
  const viteConfig = path.join(frontendPath, 'vite.config.ts');

  let allOk = true;

  if (fs.existsSync(mainTsx)) {
    console.log('✅ Entrypoint (main.tsx) encontrado.');
  } else {
    console.error('❌ main.tsx NO encontrado.');
    allOk = false;
  }

  if (fs.existsSync(indexHtml)) {
    console.log('✅ index.html encontrado.');
  } else {
    console.error('❌ index.html NO encontrado.');
    allOk = false;
  }

  if (fs.existsSync(viteConfig)) {
    console.log('✅ Vite config encontrado.');
  } else {
    console.error('❌ Vite options NO encontradas.');
    allOk = false;
  }

  return allOk;
}

async function run() {
  const backendOk = await checkBackend();
  const frontendOk = checkFrontend();

  console.log('\n--- RESUMEN ---');
  if (backendOk && frontendOk) {
    console.log('✨ EL SISTEMA ESTÁ EN ORDEN. Todos los componentes críticos responden.');
  } else {
    console.log('⚠️ SE DETECTARON PROBLEMAS. Revisa los logs anteriores.');
  }
}

run();
