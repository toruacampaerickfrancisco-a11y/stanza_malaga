const { sequelize } = require('./src/models/index.js');

async function checkStatusEnum() {
  try {
    const result = await sequelize.query(`
      SELECT enumlabel
      FROM pg_enum
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_equipment_status')
      ORDER BY enumlabel;
    `);

    console.log('Valores actuales del enum_equipment_status:');
    result[0].forEach(row => {
      console.log('- ' + row.enumlabel);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkStatusEnum();