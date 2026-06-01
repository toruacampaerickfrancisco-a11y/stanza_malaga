import { Sequelize } from 'sequelize';

async function findTable() {
  const sequelize = new Sequelize('respaldo-sistema-mantenimiento', 'postgres', 'Bienestar25', {
    host: '127.0.0.1',
    dialect: 'postgres',
    logging: false
  });

  try {
    await sequelize.authenticate();
    const [results] = await sequelize.query(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_name = 'usuarios' OR table_name = 'Usuarios';
    `);
    console.log('Resultados de búsqueda de tabla "usuarios":');
    console.log(results);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

findTable();
