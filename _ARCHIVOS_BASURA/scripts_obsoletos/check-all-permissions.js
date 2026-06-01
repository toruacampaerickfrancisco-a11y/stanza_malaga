import { Permission } from './src/models/index.js';
import { sequelize } from './src/config/database.js';

async function checkPermissions() {
  try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');
    
    const count = await Permission.count();
    console.log(`Total permissions: ${count}`);
    
    if (count === 0) {
        console.log('⚠️ No permissions found! You need to seed the permissions table.');
    } else {
        const perms = await Permission.findAll();
        console.log('Permissions found:', perms.map(p => `${p.module}:${p.action}`).join(', '));
    }
    
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  } finally {
    await sequelize.close();
  }
}

checkPermissions();
