import { sequelize } from './src/models/index.js';

async function checkCols() {
  try {
    await sequelize.authenticate();
    const [results] = await sequelize.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'equipment';
    `);
    console.log('Columns in equipment table:');
    results.forEach(r => console.log(`${r.column_name} (${r.data_type})`));
  } catch (error) {
    console.error(error);
  } finally {
    await sequelize.close();
  }
}

checkCols();