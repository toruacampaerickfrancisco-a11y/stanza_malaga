import { Sequelize } from 'sequelize';

// Configuración directa para coincidir con config/config.json (PostgreSQL)
const sequelize = new Sequelize('sistema-mantenimiento', 'sistema_user', 'Erick1993', {
  host: 'localhost',
  dialect: 'postgres',
  logging: console.log
});

async function checkSchema() {
  try {
    await sequelize.authenticate();
    console.log('Connected to Postgres.');
    const [results] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public';
    `);
    console.log('Column info:', results);
  } catch (e) {
    console.error(e);
  } finally {
    await sequelize.close();
  }
}

checkSchema();