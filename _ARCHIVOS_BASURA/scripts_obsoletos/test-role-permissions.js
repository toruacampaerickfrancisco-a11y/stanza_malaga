import dotenv from 'dotenv';
dotenv.config();

import { User, UserPermission, Permission, sequelize } from './src/models/index.js';
import userController from './src/controllers/userController.js';

async function runTest() {
  console.log('Iniciando prueba de creación de usuarios y asignación de permisos...');

  // Roles a probar
  const rolesToTest = ['admin', 'tecnico', 'inventario', 'usuario'];
  const createdUsers = [];

  try {
    // Necesitamos un ID de "admin" para el campo granted_by_id. Usaremos el primero que encontremos o null.
    const adminUser = await User.findOne({ where: { rol: 'admin' } });
    const adminId = adminUser ? adminUser.id : null;

    for (const role of rolesToTest) {
      console.log(`\n--- Probando rol: ${role} ---`);
      const username = `test_${role}_${Date.now()}`;
      const email = `${username}@test.com`;

      // 1. Crear Usuario
      console.log(`Creando usuario: ${username}`);
      const user = await User.create({
        usuario: username,
        correo: email,
        contrasena: 'password123',
        nombre_completo: `Test User ${role}`,
        numero_empleado: `T-${role.substring(0,1)}-${Date.now().toString().slice(-8)}`, // Shorten to fit varchar(20)
        rol: role,
        departamento: 'Sistemas',
        activo: true
      });
      createdUsers.push(user);

      // 2. Asignar Permisos (Simulando lo que hace el controlador)
      console.log('Asignando permisos por defecto...');
      await userController.assignDefaultPermissions(user, role, adminId || user.id);

      // 3. Verificar Permisos
      const userWithPerms = await User.findByPk(user.id, {
        include: [{
          model: UserPermission,
          as: 'permisos',
          include: [{ model: Permission, as: 'permission' }]
        }]
      });

      const permissions = userWithPerms.permisos.map(up => ({
        module: up.permission.module,
        action: up.permission.action
      }));

      console.log(`Permisos asignados (${permissions.length}):`);
      
      // Agrupar por módulo para facilitar lectura
      const groupedPerms = permissions.reduce((acc, curr) => {
        if (!acc[curr.module]) acc[curr.module] = [];
        acc[curr.module].push(curr.action);
        return acc;
      }, {});

      console.table(groupedPerms);

      // Validaciones básicas según lo definido en userController
      if (role === 'tecnico') {
        const hasTicketsCreate = permissions.some(p => p.module === 'tickets' && p.action === 'create');
        const hasUsersView = permissions.some(p => p.module === 'users' && p.action === 'view');
        console.log(`Validación Técnico: Tickets Create? ${hasTicketsCreate ? '✅' : '❌'}, Users View? ${hasUsersView ? '✅' : '❌'}`);
      } else if (role === 'usuario') {
        const hasTicketsCreate = permissions.some(p => p.module === 'tickets' && p.action === 'create');
        const hasEquipmentEdit = permissions.some(p => p.module === 'equipment' && p.action === 'edit');
        console.log(`Validación Usuario: Tickets Create? ${hasTicketsCreate ? '✅' : '❌'}, Equipment Edit? ${!hasEquipmentEdit ? '✅ (Correcto, no tiene)' : '❌ (Error, tiene permiso)'}`);
      } else if (role === 'inventario') {
         const hasEquipmentDelete = permissions.some(p => p.module === 'equipment' && p.action === 'delete');
         console.log(`Validación Inventario: Equipment Delete? ${hasEquipmentDelete ? '✅' : '❌'}`);
      }
    }

  } catch (error) {
    console.error('Error durante la prueba:', error);
  } finally {
    // Limpieza
    console.log('\n--- Limpiando usuarios de prueba ---');
    for (const user of createdUsers) {
      // Eliminar permisos primero (cascade debería encargarse, pero por seguridad)
      await UserPermission.destroy({ where: { user_id: user.id } });
      await user.destroy();
      console.log(`Usuario eliminado: ${user.usuario}`);
    }
    await sequelize.close();
  }
}

runTest();