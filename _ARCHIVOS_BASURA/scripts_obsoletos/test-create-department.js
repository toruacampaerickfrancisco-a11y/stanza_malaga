
import { Department } from './src/models/index.js';
import { sequelize } from './src/config/database.js';

async function testCreateDepartment() {
  try {
    await sequelize.authenticate();
    console.log('Connected to DB');

    const dept = await Department.create({
      display_name: 'Test Department ' + Date.now(),
      is_active: true
    });

    console.log('Department created:', dept.toJSON());
  } catch (error) {
    console.error('Error creating department:', error);
  } finally {
    await sequelize.close();
  }
}

testCreateDepartment();
