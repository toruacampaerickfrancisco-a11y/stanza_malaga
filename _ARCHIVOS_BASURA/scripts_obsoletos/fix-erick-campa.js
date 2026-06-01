import { User, UserPermission, Permission, sequelize } from './src/models/index.js';

async function fixErickCampa() {
  try {
    await sequelize.authenticate();
    console.log('Conectado a la base de datos.');

    // Buscar al usuario específico
    const userId = '9958d3f7-838f-4769-a7d9-2f1a897ce22a';
    const user = await User.findByPk(userId);

    if (!user) {
      console.log('❌ Usuario no encontrado.');
      return;
    }

    console.log(`Usuario encontrado: ${user.usuario} (Rol: ${user.rol})`);

    // Importar el controlador para usar su lógica
    const userController = (await import('./src/controllers/userController.js')).default;

    // Asignar permisos
    console.log('Asignando permisos...');
    await userController.assignDefaultPermissions(user, user.rol, user.id);
    
    console.log('✅ Permisos asignados correctamente.');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

fixErickCampa();
