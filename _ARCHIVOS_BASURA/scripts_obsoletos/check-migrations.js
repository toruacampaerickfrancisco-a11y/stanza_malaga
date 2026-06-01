import { sequelize } from './src/config/database.js';

async function checkMigrations() {
  try {
    await sequelize.authenticate();
    console.log('Connected.');
    const [results] = await sequelize.query('SELECT * FROM "SequelizeMeta"');
    console.log('Migrations in DB:', results);
  } catch (e) {
    console.error(e);
  } finally {
    await sequelize.close();
  }
}

checkMigrations();
