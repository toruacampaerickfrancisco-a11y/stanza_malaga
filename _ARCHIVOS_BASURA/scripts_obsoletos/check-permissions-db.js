
import { Permission } from './src/models/index.js';
import { sequelize } from './src/config/database.js';

async function checkPermissions() {
  try {
    const permissions = await Permission.findAll({
      where: { module: 'users' }
    });
    
    console.log('Permissions for module "users":');
    if (permissions.length === 0) {
      console.log('No permissions found for module "users".');
    } else {
      permissions.forEach(p => {
        console.log(`- ${p.action} (ID: ${p.id})`);
      });
    }
  } catch (error) {
    console.error('Error checking permissions:', error);
  } finally {
    await sequelize.close();
  }
}

checkPermissions();
