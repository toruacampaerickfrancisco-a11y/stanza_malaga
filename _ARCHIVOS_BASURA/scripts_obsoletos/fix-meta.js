import { Sequelize } from 'sequelize';

const sequelize = new Sequelize('respaldo-sistema-mantenimiento', 'postgres', 'Bienestar25', {
  host: 'localhost',
  dialect: 'postgres'
});

async function fixMeta() {
  try {
    await sequelize.authenticate();
    await sequelize.query('INSERT INTO "SequelizeMeta" ("name") VALUES (?)', {
      replacements: ['20251114000100-add-requirement-to-equipment.cjs']
    });
    console.log('Migration marked as completed');
  } catch (e) {
    console.error(e);
  } finally {
    await sequelize.close();
  }
}

fixMeta();