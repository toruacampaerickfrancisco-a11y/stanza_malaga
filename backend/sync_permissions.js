import { Sequelize } from 'sequelize';
import models from './src/models/index.js';
import { assignDefaultPermissions } from './src/services/permissionService.js';

(async () => {
  try {
    const users = await models.User.findAll();
    for (const user of users) {
      if (user.rol) {
        console.log(`Syncing permissions for ${user.usuario} (Rol: ${user.rol})`);
        await assignDefaultPermissions(user, user.rol, null);
      }
    }
    console.log('Permissions synced successfully.');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
