import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { sequelize } = await import('../src/config/database.js');

async function main() {
  await sequelize.authenticate();
  const [userCount] = await sequelize.query('SELECT COUNT(*) FROM users;');
  const [ticketCount] = await sequelize.query('SELECT COUNT(*) FROM tickets;');
  const [equipCount] = await sequelize.query('SELECT COUNT(*) FROM equipment;');
  console.log('REAL DATABASE COUNTS:');
  console.log('  USERS IN DB:', userCount[0].count);
  console.log('  TICKETS IN DB:', ticketCount[0].count);
  console.log('  EQUIPMENT IN DB:', equipCount[0].count);
  await sequelize.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
