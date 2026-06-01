import { User, Permission, UserPermission } from './src/models/index.js';
import { sequelize } from './src/config/database.js';
import bcrypt from 'bcryptjs';

const usersToSetup = [
  { email: 'maximo.peralta@sonora.gob.mx', name: 'Maximo Peralta', role: 'usuario' },
  { email: 'arturo.sanchez@sedesson.gob.mx', name: 'Arturo Sanchez', role: 'usuario' },
  { email: 'monica.mejia@sonora.gob.mx', name: 'Monica Mejia', role: 'usuario' }
];

const userPermissions = [
  { module: 'dashboard', action: 'view' },
  { module: 'tickets', action: 'view' },
  { module: 'tickets', action: 'create' },
  { module: 'profile', action: 'view' },
  { module: 'profile', action: 'edit' },
  { module: 'equipment', action: 'view' }
];

async function setupTestUsers() {
  try {
    console.log('Starting test users setup...');

    // 1. Get Permission IDs for the user role set
    const permissionIds = [];
    for (const p of userPermissions) {
      const perm = await Permission.findOne({
        where: { module: p.module, action: p.action }
      });
      if (perm) {
        permissionIds.push(perm.id);
      } else {
        console.warn(`Warning: Permission ${p.module}:${p.action} not found.`);
      }
    }

    console.log(`Found ${permissionIds.length} permissions for 'usuario' role.`);

    // 2. Process each user
    for (const userData of usersToSetup) {
      console.log(`Processing user: ${userData.email}`);

      let user = await User.findOne({ where: { correo: userData.email } });

      if (!user) {
        console.log(`- Creating new user...`);
        // Generate a username from email (e.g. maximo.peralta)
        const username = userData.email.split('@')[0];
        
        user = await User.create({
          nombre_completo: userData.name,
          correo: userData.email,
          usuario: username,
          numero_empleado: 'TEMP-' + Math.floor(Math.random() * 10000), // Temp employee number
          rol: userData.role,
          contrasena: 'password123', // Will be hashed by hook
          activo: true,
          departamento: 'General'
        });
      } else {
        console.log(`- Updating existing user...`);
        user.contrasena = 'password123';
        user.rol = userData.role;
        user.activo = true;
        await user.save();
      }

      // 3. Assign Permissions
      console.log(`- Assigning permissions...`);
      
      // Remove existing permissions to be clean
      await UserPermission.destroy({ where: { user_id: user.id } });

      // Add new permissions
      const permissionsToAssign = permissionIds.map(pid => ({
        user_id: user.id,
        permission_id: pid,
        granted_by_id: user.id, // Self-granted for test
        is_active: true
      }));

      if (permissionsToAssign.length > 0) {
        await UserPermission.bulkCreate(permissionsToAssign);
      }
      
      console.log(`- Done. Password: password123`);
    }

    console.log('All users setup successfully.');

  } catch (error) {
    console.error('Error setting up users:', error);
  } finally {
    await sequelize.close();
  }
}

setupTestUsers();
