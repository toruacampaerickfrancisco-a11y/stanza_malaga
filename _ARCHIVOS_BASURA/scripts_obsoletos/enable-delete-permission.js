import { User, UserPermission, Permission } from './src/models/index.js';

async function enableDeletePermission() {
  try {
    const username = 'erick.torua';
    const user = await User.findOne({ where: { usuario: username } });

    if (!user) {
      console.log(`Usuario ${username} no encontrado.`);
      return;
    }

    const permission = await Permission.findOne({
      where: {
        module: 'users',
        action: 'delete'
      }
    });

    if (!permission) {
      console.log('Permiso users:delete no encontrado.');
      return;
    }

    const userPermission = await UserPermission.findOne({
      where: {
        user_id: user.id,
        permission_id: permission.id
      }
    });

    if (userPermission) {
      userPermission.is_active = true;
      await userPermission.save();
      console.log(`✅ Permiso users:delete activado para ${username}`);
    } else {
      await UserPermission.create({
        user_id: user.id,
        permission_id: permission.id,
        granted_by_id: user.id, // Auto-granted for fix
        is_active: true
      });
      console.log(`✅ Permiso users:delete creado y activado para ${username}`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit();
  }
}

enableDeletePermission();
