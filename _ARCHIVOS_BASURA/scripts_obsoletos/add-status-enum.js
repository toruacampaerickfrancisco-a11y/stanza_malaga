import { sequelize } from './src/config/database.js';

async function addEnum() {
  try {
    console.log('Adding "pendiente" to enum_tickets_status...');
    await sequelize.query(`ALTER TYPE "enum_tickets_status" ADD VALUE 'pendiente';`);
    console.log('Done.');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

addEnum();
