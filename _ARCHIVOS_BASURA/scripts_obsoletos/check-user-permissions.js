import { UserPermission, User } from './src/models/index.js';
import { sequelize } from './src/config/database.js';

async function checkUserPermissions() {
  try {
    await sequelize.authenticate();
    
    const count = await UserPermission.count();
    console.log('Total UserPermissions:', count);

    const users = await User.findAll({
      include: [{
        model: UserPermission,
        as: 'permisos'
      }]
    });

    users.forEach(u => {
      console.log(`User: ${u.usuario} (${u.rol}) - Permissions: ${u.permisos.length}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

checkUserPermissions();
