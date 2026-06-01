import { User, Permission, UserPermission } from '../../src/models/index.js';
import { Op } from 'sequelize';

async function fixMissingPermissions() {
  try {
    console.log('Iniciando reparación de permisos para todos los usuarios...');
    
    const users = await User.findAll();
    console.log(`Encontrados ${users.length} usuarios.`);

    const rolePermissions = {
      'admin': 'ALL',
      'tecnico': [
        { module: 'dashboard', actions: ['view'] },
        { module: 'profile', actions: ['view', 'edit'] },
        { module: 'users', actions: ['view'] },
        { module: 'equipment', actions: ['view', 'create', 'edit'] },
        { module: 'tickets', actions: ['view', 'create', 'edit'] },
        { module: 'reports', actions: ['view', 'export'] },
        { module: 'supplies', actions: ['view', 'create', 'edit'] }
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
      ]
    };

    for (const user of users) {
      const role = (user.rol || '')
        .toLowerCase()
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      
      // Default to 'usuario' if role not found
      const permissionsToAssign = rolePermissions[role] || rolePermissions['usuario'];
      
      console.log(`Procesando usuario: ${user.usuario} (${role})`);

      // Obtener TODOS los permisos disponibles (Estrategia robusta)
      const allPermissions = await Permission.findAll();

      if (permissionsToAssign === 'ALL') {
        for (const perm of allPermissions) {
          await UserPermission.findOrCreate({
            where: { user_id: user.id, permission_id: perm.id },
            defaults: { granted_by_id: user.id, is_active: true }
          });
        }
      } else {
        // Filtrar permisos en memoria
        const permissionsToGrant = allPermissions.filter(perm => {
          return permissionsToAssign.some(p => 
            p.module === perm.module && p.actions.includes(perm.action)
          );
        });

        if (permissionsToGrant.length === 0) {
          console.warn(`  Advertencia: No se encontraron permisos para asignar al usuario ${user.usuario}`);
        }

        for (const perm of permissionsToGrant) {
          await UserPermission.findOrCreate({
            where: { user_id: user.id, permission_id: perm.id },
            defaults: { granted_by_id: user.id, is_active: true }
          });
        }
      }
    }

    console.log('Reparación de permisos completada.');

  } catch (error) {
    console.error('Error reparando permisos:', error);
  }
}

fixMissingPermissions();
