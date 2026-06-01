import { sequelize } from './src/config/database.js';

async function addTimestampsToEquipment() {
  try {
    await sequelize.query(`ALTER TABLE equipment ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();`);
    await sequelize.query(`ALTER TABLE equipment ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();`);
    console.log('Columnas created_at y updated_at agregadas correctamente a equipment.');
  } catch (error) {
    console.error('Error al agregar columnas:', error.message);
  } finally {
    await sequelize.close();
  }
}

addTimestampsToEquipment();