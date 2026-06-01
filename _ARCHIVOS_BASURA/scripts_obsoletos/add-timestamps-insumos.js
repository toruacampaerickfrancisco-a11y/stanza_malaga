import { sequelize } from './src/config/database.js';

async function addTimestampsToInsumos() {
  try {
    await sequelize.query(`ALTER TABLE insumos ADD COLUMN created_at TIMESTAMP DEFAULT NOW();`);
    await sequelize.query(`ALTER TABLE insumos ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();`);
    console.log('Columnas created_at y updated_at agregadas correctamente a insumos.');
  } catch (error) {
    console.error('Error al agregar columnas:', error.message);
  } finally {
    await sequelize.close();
  }
}

addTimestampsToInsumos();
