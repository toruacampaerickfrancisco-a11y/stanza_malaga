
import { sequelize } from './src/config/database.js';

async function addEnumValue() {
  try {
    await sequelize.authenticate();
    console.log('Connected to DB');
    
    // Postgres specific command to add value to enum
    await sequelize.query(`ALTER TYPE "enum_tickets_priority" ADD VALUE IF NOT EXISTS 'sin_clasificar';`);
    
    console.log('Enum value added successfully');
  } catch (error) {
    console.error('Error adding enum value:', error);
  } finally {
    await sequelize.close();
  }
}

addEnumValue();
