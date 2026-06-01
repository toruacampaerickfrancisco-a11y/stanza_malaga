import { User, UserPermission, Permission } from './src/models/index.js';
import { sequelize } from './src/config/database.js';

async function checkPermissions() {
  try {
    const email = 'fernando.rendon@sedesson.gob.mx';
    console.log(`Checking permissions for: ${email}`);
    
    const user = await User.findOne({
      where: { correo: email },
      include: [
        {
          model: UserPermission,
          as: 'permisos',
          include: [{ model: Permission, as: 'permission' }]
        }
      ]
    });

    if (!user) {
      console.log('User NOT FOUND.');
      return;
    }

    console.log(`User Role: ${user.rol}`);
    console.log(`Permissions count: ${user.permisos ? user.permisos.length : 0}`);
    
    if (user.permisos && user.permisos.length > 0) {
      user.permisos.forEach(p => {
        if (p.permission) {
          console.log(`- ${p.permission.module}: ${p.permission.action}`);
        } else {
          console.log(`- Permission ID ${p.permission_id} (details not found)`);
        }
      });
    } else {
      console.log('No explicit permissions found.');
    }

  } catch (error) {
    console.error('Error checking permissions:', error);
  } finally {
    await sequelize.close();
  }
}

checkPermissions();
