import { sequelize } from '../../src/models/index.js';

// Script para eliminar todos los equipos y usuarios (TRUNCATE CASCADE)
(async () => {
  try {
    await sequelize.query('TRUNCATE "equipment", "users" RESTART IDENTITY CASCADE;');
    console.log('Tablas equipment y users truncadas correctamente.');
  } catch (err) {
    console.error('Error truncando tablas:', err);
  }
})();
