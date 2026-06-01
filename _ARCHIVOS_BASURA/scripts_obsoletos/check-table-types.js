import { sequelize } from './src/config/database.js';

async function checkTable() {
  try {
    const result = await sequelize.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'tickets' AND column_name IN ('parts', 'attachments', 'tags');");
    console.log('Tipos de dato actuales:');
    console.log(result[0]);
  } catch (err) {
    console.error('Error:', err.message);
  }
  process.exit(0);
}

checkTable();