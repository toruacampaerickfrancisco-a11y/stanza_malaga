import { sequelize } from './src/config/database.js';

async function inspect() {
  try {
    const [results, metadata] = await sequelize.query(`
      SELECT conname, pg_get_constraintdef(oid)
      FROM pg_constraint
      WHERE conrelid = 'tickets'::regclass AND contype = 'c';
    `);
    console.log('Constraints:', results);

    const [enums] = await sequelize.query(`
      SELECT t.typname, e.enumlabel
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'enum_tickets_status';
    `);
    console.log('Enums:', enums);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

inspect();
