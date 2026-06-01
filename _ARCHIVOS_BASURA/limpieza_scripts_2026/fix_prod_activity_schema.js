import { sequelize } from '../src/config/database.js';

async function fix() {
  try {
    console.log('Autenticando...');
    await sequelize.authenticate();
    console.log('Conectado.');

    // Check and add ticket_id column
    // Using raw query to be safe across Sequelize versions
    // PostgreSQL specific syntax for IF NOT EXISTS
    
    const checkQuery = `SELECT column_name FROM information_schema.columns WHERE table_name='Activities' AND column_name='ticket_id';`;
    const [results] = await sequelize.query(checkQuery);
    
    if (results.length === 0) {
        console.log('Adding ticket_id column...');
        await sequelize.query(`ALTER TABLE "Activities" ADD COLUMN "ticket_id" UUID NULL;`);
        console.log('ticket_id column added.');
    } else {
        console.log('ticket_id column already exists.');
    }
    
  } catch (err) {
    console.error('Error applying fix:', err);
  } finally {
    await sequelize.close();
  }
}

fix();
