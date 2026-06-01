import { sequelize } from './src/models/index.js';
import InventoryMovement from './src/models/InventoryMovement.js';

async function createTable() {
  try {
    console.log('Creating InventoryMovement table...');
    await InventoryMovement.sync({ force: true });
    console.log('Table created successfully.');
  } catch (error) {
    console.error('Error creating table:', error);
  } finally {
    await sequelize.close();
  }
}

createTable();
