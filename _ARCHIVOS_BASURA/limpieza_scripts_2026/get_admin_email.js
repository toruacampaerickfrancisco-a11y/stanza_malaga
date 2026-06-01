import { Sequelize, DataTypes } from 'sequelize';

const sequelize = new Sequelize('sistema-mantenimientoDB', 'postgres', 'Bienestar2025+', {
  host: 'localhost',
  dialect: 'postgres',
  logging: false
});

async function run() {
  try {
    await sequelize.authenticate();
    const [results] = await sequelize.query("SELECT usuario, correo FROM users WHERE usuario = 'admin'");
    console.log('Admin Info:', results[0]);
  } catch (err) {
    console.error(err);
  } finally {
    await sequelize.close();
  }
}

run();
