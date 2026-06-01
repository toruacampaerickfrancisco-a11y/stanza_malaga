import { sequelize } from './src/config/database.js';

async function checkData() {
  try {
    const result = await sequelize.query("SELECT id, attachments, tags FROM tickets WHERE attachments IS NOT NULL OR tags IS NOT NULL LIMIT 5;");
    console.log('Datos actuales en attachments y tags:');
    console.log(result[0]);
  } catch (err) {
    console.error('Error:', err.message);
  }
  process.exit(0);
}

checkData();