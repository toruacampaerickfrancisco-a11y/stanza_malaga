// Script para vaciar tablas críticas antes de ejecutar seeders
import { sequelize } from './src/config/database.js';

async function truncateTables() {
  try {
    // Vaciar tablas en orden seguro
    await sequelize.query('TRUNCATE TABLE "user_permissions" RESTART IDENTITY CASCADE;');
    await sequelize.query('TRUNCATE TABLE "permissions" RESTART IDENTITY CASCADE;');
    await sequelize.query('TRUNCATE TABLE "users" RESTART IDENTITY CASCADE;');
    await sequelize.query('TRUNCATE TABLE "equipment" RESTART IDENTITY CASCADE;');
    await sequelize.query('TRUNCATE TABLE "tickets" RESTART IDENTITY CASCADE;');
    await sequelize.query('TRUNCATE TABLE "ticket_comments" RESTART IDENTITY CASCADE;');
    console.log('Tablas truncadas correctamente.');
    process.exit(0);
  } catch (err) {
    console.error('Error truncando tablas:', err);
    process.exit(1);
  }
}

truncateTables();
