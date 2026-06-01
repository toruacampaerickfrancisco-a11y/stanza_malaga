import { Sequelize } from 'sequelize';

async function checkLegacy() {
  const sequelize = new Sequelize('respaldo-sistema-mantenimiento', 'postgres', 'Bienestar25', {
    host: '127.0.0.1',
    dialect: 'postgres',
    logging: false
  });

  try {
    await sequelize.authenticate();
    const [results] = await sequelize.query('SELECT count(*) FROM usuarios');
    console.log('Usuarios en tabla legacy (usuarios):', results[0].count);
    
    const [results2] = await sequelize.query('SELECT count(*) FROM users');
    console.log('Usuarios en tabla nueva (users):', results2[0].count);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkLegacy();
