import { Sequelize } from 'sequelize';

async function listDatabases() {
  const sequelize = new Sequelize('postgres', 'postgres', 'Bienestar25', {
    host: '127.0.0.1',
    dialect: 'postgres',
    logging: false
  });

  try {
    await sequelize.authenticate();
    const [results] = await sequelize.query('SELECT datname FROM pg_database WHERE datistemplate = false;');
    console.log('Bases de datos disponibles:');
    results.forEach(db => console.log('- ' + db.datname));
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

listDatabases();
