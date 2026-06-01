import { Ticket } from './src/models/index.js';
import { sequelize } from './src/config/database.js';

async function test() {
  try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');
    await Ticket.sync(); // This might try to alter table if not matching
    console.log('Ticket model synced.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  } finally {
    await sequelize.close();
  }
}

test();
