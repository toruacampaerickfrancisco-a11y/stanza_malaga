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
    logging: false
  }
);

async function migrate() {
  try {
    await sequelize.authenticate();
    console.log('Conectado a la base de datos, actualizando permisos: insumos => supplies');

    const rows = await sequelize.query("SELECT count(*) AS count FROM permissions WHERE module = 'insumos';", { type: Sequelize.QueryTypes.SELECT });
    const count = (rows && rows[0] && rows[0].count) ? rows[0].count : 0;
    if (parseInt(count) === 0) {
      console.log('No se encontraron permisos con module = "insumos". No se realizará ninguna actualización.');
    } else {
      await sequelize.query("UPDATE permissions SET module = 'supplies' WHERE module = 'insumos';");
      console.log(`Actualización completada. Filas actualizadas: ${count}`);
    }
  } catch (error) {
    console.error('Error durante la migración:', error);
  } finally {
    await sequelize.close();
  }
}

migrate();
