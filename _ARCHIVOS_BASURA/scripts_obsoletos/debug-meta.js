import { sequelize } from './src/config/database.js';

async function checkMeta() {
  try {
    await sequelize.authenticate();
    const [results] = await sequelize.query('SELECT * FROM "SequelizeMeta"');
    console.log('Current Migrations in DB:', results);
  } catch (e) {
    console.error(e);
  } finally {
    await sequelize.close();
  }
}

checkMeta();
