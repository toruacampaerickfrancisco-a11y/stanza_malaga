#!/usr/bin/env node
import { sequelize } from './src/config/database.js';

const ids = [
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000102',
  '00000000-0000-0000-0000-000000000103',
  '00000000-0000-0000-0000-000000000104',
  '00000000-0000-0000-0000-000000000105'
];

const run = async () => {
  try {
    const canConnect = await sequelize.authenticate().then(() => true).catch(() => false);
    if (!canConnect) {
      console.error('No se pudo conectar a la base de datos con la configuración actual.');
      process.exitCode = 2;
      return;
    }

    const replacements = { ids };
    const placeholders = ids.map((_, i) => `:id${i}`).join(',');
    const replObj = {};
    ids.forEach((id, i) => { replObj[`id${i}`] = id; });

    const sql = `SELECT id FROM inventory_movements WHERE id IN (${placeholders});`;
    const results = await sequelize.query(sql, { replacements: replObj, type: sequelize.QueryTypes.SELECT });

    if (!results || results.length === 0) {
      console.log('No se encontraron registros de muestra. Puedes ejecutar el seeder de forma segura.');
    } else {
      console.log(`Se encontraron ${results.length} registro(s) con los IDs del seeder:`);
      results.forEach(r => console.log('-', r.id));
    }
  } catch (err) {
    console.error('Error al comprobar IDs del seeder:', err.message || err);
    process.exitCode = 3;
  } finally {
    await sequelize.close();
  }
};

run();
