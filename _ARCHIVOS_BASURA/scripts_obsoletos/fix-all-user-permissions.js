import { User } from './src/models/index.js';
import userController from './src/controllers/userController.js';
import { sequelize } from './src/config/database.js';

async function fixUserPermissions() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión establecida.');

    const users = await User.findAll();
    console.log(`🔍 Encontrados ${users.length} usuarios.`);

    for (const user of users) {
      console.log(`Processing user: ${user.usuario} (${user.rol})`);
      if (user.rol) {
         try {
            await userController.assignDefaultPermissions(user, user.rol, user.id); // Grant by self
            console.log(`   ✅ Permisos asignados para ${user.usuario}`);
         } catch (e) {
            console.error(`   ❌ Error asignando permisos a ${user.usuario}:`, e.message);
         }
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

fixUserPermissions();
