import { sequelize } from './src/config/database.js';
import DeletedTicket from './src/models/DeletedTicket.js';
import dotenv from 'dotenv';

dotenv.config();

async function createTable() {
  try {
    console.log('Conectando a la base de datos...');
    await sequelize.authenticate();
    console.log('Conexión establecida.');

    console.log('Sincronizando modelo DeletedTicket...');
    await DeletedTicket.sync({ force: false }); // force: false para no borrar si ya existe (aunque no debería existir)
    console.log('Tabla deleted_tickets creada o verificada correctamente.');

  } catch (error) {
    console.error('Error al crear la tabla:', error);
  } finally {
    await sequelize.close();
  }
}

createTable();
