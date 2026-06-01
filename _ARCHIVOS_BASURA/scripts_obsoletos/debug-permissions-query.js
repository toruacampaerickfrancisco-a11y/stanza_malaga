import { User, UserPermission, Permission, sequelize } from './src/models/index.js';

async function debugPermissions() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a la BD.');

    // 1. Check Users
    const usersCount = await User.count();
    console.log(`Users count: ${usersCount}`);

    // 2. Check Permissions
    const permissionsCount = await Permission.count();
    console.log(`Permissions count: ${permissionsCount}`);

    // 3. Check UserPermissions
    const userPermissionsCount = await UserPermission.count();
    console.log(`UserPermissions count: ${userPermissionsCount}`);

    // 4. Run the controller query
    console.log('Running controller query...');
    const users = await User.findAll({
      include: [
        {
          model: UserPermission,
          as: 'permisos',
          include: [
            {
              model: Permission,
              as: 'permission'
            }
          ]
        }
      ]
    });

    console.log(`Query returned ${users.length} users.`);
    
    if (users.length > 0) {
      const admin = users.find(u => u.usuario === 'admin' || u.rol === 'admin');
      if (admin) {
        console.log(`Admin user found: ${admin.usuario} (${admin.id})`);
        console.log(`Admin permissions count: ${admin.permisos ? admin.permisos.length : 0}`);
        if (admin.permisos && admin.permisos.length > 0) {
          console.log('First permission sample:', JSON.stringify(admin.permisos[0], null, 2));
        }
      } else {
        console.log('Admin user not found in result set.');
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

debugPermissions();
