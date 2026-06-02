import { Sequelize } from 'sequelize';
import config from './config.js';
import logger from '../utils/logger.js';

// Crear instancia de Sequelize (postgreSQL esperado)
const sequelize = new Sequelize(
  config.database.database,
  config.database.username,
  config.database.password,
  {
    host: config.database.host,
    port: config.database.port,
    dialect: config.database.dialect,
    storage: config.database.storage,
    logging: config.database.logging && process.env.LOG_LEVEL !== 'silent' ? (msg) => logger.debug(msg) : false,
    pool: config.database.pool,
    define: config.database.define
  }
);

// Función para probar la conexión (solo PostgreSQL)
const testConnection = async () => {
  try {
    await Promise.race([
      sequelize.authenticate(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout: No se pudo conectar a la base de datos en 10 segundos.')), 10000))
    ]);
    logger.info(`Conexión a base de datos (${config.database.dialect}) establecida correctamente`);
    return true;
  } catch (error) {
    logger.error(`Error al conectar con la base de datos (${config.database.dialect}): ${error.message}`);
    return false;
  }
};

// Función para sincronizar modelos
const syncDatabase = async (force = false) => {
  try {
    await sequelize.sync({ force, alter: false });
    logger.info(force ? 'Base de datos recreada y sincronizada' : 'Base de datos sincronizada (alter=false)');
  } catch (error) {
    logger.error(`Error al sincronizar la base de datos: ${error.message}`);
    
    // Auto-reparación para PostgreSQL si hay conflicto de tipos ARRAY
    if (config.database.dialect === 'postgres') {
      logger.warn('⚠️ Se detectó un error de sincronización en PostgreSQL. Intentando auto-reparación de columnas ARRAY...');
      try {
        await sequelize.query('ALTER TABLE "tickets" DROP COLUMN IF EXISTS "attachments";');
        await sequelize.query('ALTER TABLE "tickets" DROP COLUMN IF EXISTS "tags";');
        await sequelize.query('ALTER TABLE "tickets" DROP COLUMN IF EXISTS "parts";');
        logger.info('✅ Columnas conflictivas eliminadas. Reintentando sincronización...');
        
        await sequelize.sync({ force, alter: true });
        logger.info('🎉 Base de datos sincronizada exitosamente después de la auto-reparación.');
        return;
      } catch (repairError) {
        logger.error(`❌ La auto-reparación falló: ${repairError.message}`);
      }
    }
    
    throw error;
  }
};

export { sequelize, syncDatabase, testConnection };