import { sequelize } from '../src/config/database.js';

async function checkEnums() {
  try {
    const [types] = await sequelize.query(`
      SELECT enumlabel
      FROM pg_enum
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_equipment_type')
      ORDER BY enumlabel;
    `);

    console.log('Valores reales en enum_equipment_type:');
    types.forEach(row => console.log(`- ${row.enumlabel}`));

    const [statuses] = await sequelize.query(`
      SELECT enumlabel
      FROM pg_enum
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_equipment_status')
      ORDER BY enumlabel;
    `);

    console.log('Valores reales en enum_equipment_status:');
    statuses.forEach(row => console.log(`- ${row.enumlabel}`));

    process.exit(0);
  } catch (error) {
    console.error('Error al consultar enums:', error);
    process.exit(1);
  }
}

checkEnums();
