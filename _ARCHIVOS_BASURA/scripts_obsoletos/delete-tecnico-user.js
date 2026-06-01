import { User, UserPermission } from './src/models/index.js';

async function deleteUser() {
  const correo = 'pruebasonora@sonora.gob.mx';
  try {
    const user = await User.findOne({ where: { correo } });
    if (!user) {
      console.log('No existe usuario con correo', correo);
      return;
    }

    // Eliminar permisos asociados
    const upDeleted = await UserPermission.destroy({ where: { user_id: user.id } });
    // Eliminar usuario
    await user.destroy();
    console.log(`Usuario eliminado: ${correo} (id: ${user.id}). UserPermissions eliminados: ${upDeleted}`);
  } catch (err) {
    console.error('Error eliminando usuario tecnico:', err);
  }
}

deleteUser();
