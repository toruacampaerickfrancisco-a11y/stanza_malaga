import { User, UserPermission } from './src/models/index.js';
import userController from './src/controllers/userController.js';
import { sequelize } from './src/config/database.js';

async function resetAllPermissions() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión establecida.');

    const users = await User.findAll();
    console.log(`🔍 Encontrados ${users.length} usuarios. Reasignando permisos...`);

    for (const user of users) {
      // 1. Eliminar permisos actuales
      await UserPermission.destroy({ where: { user_id: user.id } });
      
      // 2. Asignar nuevos permisos basados en el rol
      if (user.rol) {
         try {
            await userController.assignDefaultPermissions(user, user.rol, user.id);
            console.log(`   ✅ Permisos actualizados para ${user.usuario} (${user.rol})`);
         } catch (e) {
            console.error(`   ❌ Error asignando permisos a ${user.usuario}:`, e.message);
         }
      } else {
        console.log(`   ⚠️ Usuario ${user.usuario} no tiene rol asignado. Se omitió.`);
      }
    }

    console.log('✨ Proceso completado.');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

resetAllPermissions();
