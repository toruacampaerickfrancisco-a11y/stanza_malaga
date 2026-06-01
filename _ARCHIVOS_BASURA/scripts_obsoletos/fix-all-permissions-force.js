import { User, UserPermission, Permission } from './src/models/index.js';
import { Op } from 'sequelize';

async function fixAllPermissions() {
  try {
    console.log('Iniciando reparación masiva de permisos...');
    
    // 1. Obtener todos los permisos disponibles para tener sus IDs
    const allPermissions = await Permission.findAll();
    console.log(`Total de permisos en sistema: ${allPermissions.length}`);

    // 2. Obtener todos los usuarios
    const users = await User.findAll();
    console.log(`Total de usuarios a revisar: ${users.length}`);

    // Definición de permisos por rol (Copia exacta de la lógica deseada)
    const rolePermissionsConfig = {
      'admin': 'ALL',
      
      'tecnico': [
        { module: 'dashboard', actions: ['view'] },
        { module: 'profile', actions: ['view', 'edit'] },
        { module: 'tickets', actions: ['view', 'create', 'edit'] },
        { module: 'equipment', actions: ['view', 'create', 'edit'] },
        { module: 'supplies', actions: ['view', 'create', 'edit'] },
        { module: 'users', actions: ['view'] }, 
        { module: 'reports', actions: ['view', 'export'] }
      ],
      
      'inventario': [
        { module: 'dashboard', actions: ['view'] },
        { module: 'profile', actions: ['view', 'edit'] },
        { module: 'equipment', actions: ['view', 'create', 'edit', 'delete'] },
        { module: 'supplies', actions: ['view', 'create', 'edit', 'delete'] },
        { module: 'tickets', actions: ['view'] }
      ],
      
      'usuario': [
        { module: 'dashboard', actions: ['view'] },
        { module: 'profile', actions: ['view', 'edit'] },
        { module: 'tickets', actions: ['view', 'create'] }
      ],
      
      'user': [
        { module: 'dashboard', actions: ['view'] },
        { module: 'profile', actions: ['view', 'edit'] },
        { module: 'tickets', actions: ['view', 'create'] }
      ]
    };

    for (const user of users) {
      console.log(`\nProcesando usuario: ${user.usuario} (Rol: ${user.rol})`);
      
      // Normalizar rol
      const normalizedRole = (user.rol || 'user')
        .toLowerCase()
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

      // Determinar qué permisos debe tener
      const targetConfig = rolePermissionsConfig[normalizedRole] || rolePermissionsConfig['user'];
      
      let permissionsToGrant = [];
      if (targetConfig === 'ALL') {
        permissionsToGrant = allPermissions;
      } else {
        permissionsToGrant = allPermissions.filter(perm => {
          return targetConfig.some(p => 
            p.module === perm.module && p.actions.includes(perm.action)
          );
        });
      }

      console.log(` -> Debe tener ${permissionsToGrant.length} permisos.`);

      // Verificar permisos actuales
      const currentPermissions = await UserPermission.findAll({ where: { user_id: user.id } });
      
      // Si tiene 0 permisos o menos de los esperados, reasignar
      // (Para estar seguros, vamos a asegurar que tenga TODOS los que le tocan)
      
      let addedCount = 0;
      for (const perm of permissionsToGrant) {
        const [up, created] = await UserPermission.findOrCreate({
          where: {
            user_id: user.id,
            permission_id: perm.id
          },
          defaults: {
            granted_by_id: user.id, // Auto-grant para fix
            is_active: true,
            granted_at: new Date()
          }
        });

        if (created) {
          addedCount++;
        } else if (!up.is_active) {
          up.is_active = true;
          await up.save();
          addedCount++;
        }
      }

      if (addedCount > 0) {
        console.log(` -> Se agregaron/activaron ${addedCount} permisos.`);
      } else {
        console.log(` -> Permisos ya estaban correctos.`);
      }
    }

    console.log('\nReparación completada.');

  } catch (error) {
    console.error('Error fatal:', error);
  } finally {
    process.exit();
  }
}

fixAllPermissions();
