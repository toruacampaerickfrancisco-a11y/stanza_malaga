import { User, Permission, UserPermission } from './src/models/index.js';
import { Op } from 'sequelize';

async function assignAllPermissions() {
  try {
    console.log('Iniciando asignación masiva de permisos basada en roles...');

    // 1. Obtener todos los permisos y organizarlos
    const allPermissions = await Permission.findAll();
    const permMap = {}; // "module:action" -> id
    allPermissions.forEach(p => {
      permMap[`${p.module}:${p.action}`] = p.id;
    });

    // 2. Definir reglas de permisos por rol
    const adminPerms = Object.values(permMap);
    const tecnicoPerms = [
        permMap['dashboard:view'],
        permMap['tickets:view'],
        permMap['tickets:create'],
        permMap['tickets:edit'],
        permMap['tickets:assign'],
        permMap['tickets:export'],
        permMap['equipment:view'],
        permMap['equipment:create'],
        permMap['equipment:edit'],
        permMap['equipment:export'],
        permMap['reports:view'],
        permMap['reports:create'],
        permMap['reports:export'],
        permMap['users:view'], // Para ver a quién asignar
        permMap['profile:view'],
        permMap['profile:edit'],
        permMap['supplies:view'] // Permiso para ver insumos
      ].filter(id => id);
    
    const usuarioPerms = [
        permMap['dashboard:view'],
        permMap['tickets:view'],
        permMap['tickets:create'],
        permMap['profile:view'],
        permMap['profile:edit']
      ].filter(id => id);

    const roleRules = {
      'admin': adminPerms,
      'tecnico': tecnicoPerms,
      'technician': tecnicoPerms, // Alias
      'usuario': usuarioPerms,
      'user': usuarioPerms // Alias
    };

    // 3. Obtener todos los usuarios
    const users = await User.findAll();
    console.log(`Procesando ${users.length} usuarios...`);

    let count = 0;
    for (const user of users) {
      const role = user.rol || 'usuario'; // Default a usuario si no tiene rol
      const permissionsToAssign = roleRules[role];

      if (!permissionsToAssign) {
        console.warn(`Rol desconocido '${role}' para usuario ${user.usuario}. Saltando.`);
        continue;
      }

      // console.log(`Asignando permisos para ${user.usuario} (${role})...`);

      for (const permId of permissionsToAssign) {
        await UserPermission.findOrCreate({
          where: {
            user_id: user.id,
            permission_id: permId
          },
          defaults: {
            granted_by_id: user.id, // Auto-asignado por sistema
            is_active: true
          }
        });
      }
      count++;
      if (count % 10 === 0) process.stdout.write('.');
    }

    console.log('\nAsignación de permisos completada exitosamente.');

  } catch (error) {
    console.error('Error en la asignación masiva:', error);
  }
}

assignAllPermissions();
