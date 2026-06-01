import { Sequelize } from 'sequelize';

async function listTables() {
  const sequelize = new Sequelize('postgres', 'postgres', 'Bienestar25', {
    host: '127.0.0.1',
    dialect: 'postgres',
    logging: false
  });

  try {
    await sequelize.authenticate();
    const [results] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    console.log('Tablas en postgres:');
    results.forEach(t => console.log('- ' + t.table_name));
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

listTables();
