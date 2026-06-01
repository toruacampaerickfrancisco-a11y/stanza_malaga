import dotenv from 'dotenv';
dotenv.config();

import { User, UserPermission, Permission } from './src/models/index.js';
import userController from './src/controllers/userController.js';

async function run() {
  const adminUser = await User.findOne({ where: { rol: 'admin' } });
  const adminId = adminUser ? adminUser.id : null;

  const ctx = {
    request: {
      body: {
        username: `route_test_tecnico_${Date.now()}`,
        email: `route_test_tecnico_${Date.now()}@test.com`,
        password: 'TestPass123!',
        fullName: 'Route Test Tecnico',
        employeeNumber: `RTE-${Date.now()}`,
        role: 'tecnico',
        department: 'Sistemas',
        isActive: true
      }
    },
    state: {
      user: adminUser
    },
    status: 200,
    body: undefined
  };

  try {
    await userController.createUser(ctx);
    console.log('Controller createUser result status:', ctx.status);
    if (ctx.status >= 400) {
      console.log('Response:', ctx.body);
      return;
    }
    const createdUserId = ctx.body?.data?.id;
    const user = await User.findByPk(createdUserId, {
      include: [
        { model: UserPermission, as: 'permisos', include: [ { model: Permission, as: 'permission' } ] }
      ]
    });

    console.log(`Permisos asignados a ${user.usuario} (${user.id}): ${user.permisos.length}`);
    console.table(user.permisos.map(up => ({ module: up.permission.module, action: up.permission.action })));

    // Cleanup
    await UserPermission.destroy({ where: { user_id: user.id } });
    await user.destroy();
    console.log('Usuario de prueba eliminado.');

  } catch (error) {
    console.error('Error en prueba:', error);
  }
}

run();
