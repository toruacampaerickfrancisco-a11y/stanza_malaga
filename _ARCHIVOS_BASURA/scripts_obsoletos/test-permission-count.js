import { User, UserPermission } from './src/models/index.js';

async function testPermissionCount() {
  try {
    const users = await User.findAll({
      limit: 5,
      include: [{ model: UserPermission, as: 'permisos' }]
    });

    console.log('Usuarios con conteo de permisos:');
    users.forEach(u => {
      const userJson = u.toPublicJSON();
      console.log(`${u.nombre_completo}: ${userJson.permissionCount} permisos`);
    });
  } catch (err) {
    console.error('Error:', err.message);
  }
  process.exit(0);
}

testPermissionCount();