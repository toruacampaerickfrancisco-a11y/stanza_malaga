import { User, Permission, UserPermission } from './src/models/index.js';
import { sequelize } from './src/config/database.js';

async function assignPermissions() {
  try {
    const email = 'fernando.rendon@sedesson.gob.mx';
    console.log(`Assigning permissions to: ${email}`);
    
    const user = await User.findOne({ where: { correo: email } });
    if (!user) {
      console.log('User not found');
      return;
    }

    // Get all permissions
    const allPermissions = await Permission.findAll({ where: { is_active: true } });
    console.log(`Found ${allPermissions.length} available permissions.`);

    if (allPermissions.length === 0) {
      console.log('No permissions found in database to assign.');
      return;
    }

    // Create permission assignments per permission using findOrCreate to avoid unique constraint errors
    let createdCount = 0;
    for (const p of allPermissions) {
      const [up, created] = await UserPermission.findOrCreate({
        where: {
          user_id: user.id,
          permission_id: p.id
        },
        defaults: {
          granted_by_id: user.id, // Self-granted for fix
          is_active: true
        }
      });
      if (created) createdCount++;
    }
    console.log(`Successfully assigned ${createdCount} new permissions to ${user.nombre_completo || user.usuario}.`);

    console.log(`Successfully assigned ${permissionsToAssign.length} permissions to ${user.nombre_completo || user.usuario}.`);

  } catch (error) {
    console.error('Error assigning permissions:', error);
  } finally {
    await sequelize.close();
  }
}

assignPermissions();
