import { Sequelize } from 'sequelize';
import config from '../../src/config/config.js';

const sequelize = new Sequelize(
  config.database.database,
  config.database.username,
  config.database.password,
  {
    host: config.database.host,
    port: config.database.port,
    dialect: 'postgres',
    logging: console.log
  }
);

async function alterTable() {
  try {
    await sequelize.authenticate();
    console.log('Conectado a la base de datos.');

    // Alter column numero_empleado to drop NOT NULL constraint
    await sequelize.query('ALTER TABLE users ALTER COLUMN numero_empleado DROP NOT NULL;');
    console.log('Columna numero_empleado modificada: ahora permite NULL.');

  } catch (error) {
    console.error('Error al modificar la tabla:', error);
  } finally {
    await sequelize.close();
  }
}

alterTable();
