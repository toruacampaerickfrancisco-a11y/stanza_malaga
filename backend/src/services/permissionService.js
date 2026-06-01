import { sequelize } from '../config/database.js';
import Permission from '../models/Permission.js';
import UserPermission from '../models/UserPermission.js';

/**
 * Servicio para asignar permisos por rol de forma reutilizable y transaccional.
 * Adaptado para el sistema residencial Stanza Malaga - Seccion Almeria.
 */
export async function assignDefaultPermissions(user, role, grantedById, options = {}) {
  const transactionProvided = !!options.transaction;
  const t = options.transaction || await sequelize.transaction();

  try {
    const normalizedRole = (role || '')
      .toString()
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    // Definición de permisos por rol residencial
    const rolePermissions = {
      'admin': 'ALL',
      'presidente': 'ALL',
      'vicepresidente': 'ALL',
      'tesorero': [
        { module: 'dashboard', actions: ['view'] },
        { module: 'profile', actions: ['view', 'edit'] },
        { module: 'equipment', actions: ['view', 'create', 'edit', 'delete'] }, // Balance de Cuotas
        { module: 'reports', actions: ['view', 'export'] },
        { module: 'tickets', actions: ['view'] }
      ],
      'eventos': [
        { module: 'dashboard', actions: ['view'] },
        { module: 'profile', actions: ['view', 'edit'] },
        { module: 'tickets', actions: ['view', 'create', 'edit', 'delete'] }, // Reservación de Áreas
        { module: 'departments', actions: ['view', 'create', 'edit', 'delete'] }, // Catálogo de Eventos
        { module: 'calendar', actions: ['view'] }
      ],
      'guardia': [
        { module: 'dashboard', actions: ['view'] },
        { module: 'profile', actions: ['view', 'edit'] },
        { module: 'supplies', actions: ['view', 'create', 'edit'] }, // Entradas a la Cerrada
        { module: 'tickets', actions: ['view'] }
      ],
      'residente': [
        { module: 'dashboard', actions: ['view'] },
        { module: 'profile', actions: ['view', 'edit'] },
        { module: 'tickets', actions: ['view', 'create'] }, // Sus propias reservaciones
        { module: 'calendar', actions: ['view'] }
      ],
      // Fallbacks para compatibilidad
      'usuario': [
        { module: 'dashboard', actions: ['view'] },
        { module: 'profile', actions: ['view', 'edit'] },
        { module: 'tickets', actions: ['view', 'create'] }
      ],
      'user': [
        { module: 'dashboard', actions: ['view'] },
        { module: 'profile', actions: ['view', 'edit'] },
        { module: 'tickets', actions: ['view', 'create'] }
      ],
      'tecnico': [
        { module: 'dashboard', actions: ['view'] },
        { module: 'profile', actions: ['view', 'edit'] },
        { module: 'tickets', actions: ['view', 'create', 'edit'] },
        { module: 'equipment', actions: ['view', 'create', 'edit'] },
        { module: 'supplies', actions: ['view', 'create', 'edit'] }
      ]
    };

    const permissionsToAssign = rolePermissions[normalizedRole] || rolePermissions['residente'];

    // Grupos de alias para asegurar que si un módulo tiene varios nombres en la BD se cubran todos
    const aliasGroups = [
      ['supplies', 'insumos', 'entradas'],
      ['users', 'usuarios', 'residentes'],
      ['equipment', 'equipos', 'cuotas', 'balance'],
      ['tickets', 'reservaciones', 'eventos_reservas'],
      ['departments', 'departamentos', 'areas', 'catalogo_eventos'],
      ['reports', 'reportes']
    ];

    const moduleAliases = {};
    aliasGroups.forEach(group => group.forEach(n => moduleAliases[n] = group));

    const allPermissions = await Permission.findAll({ transaction: t });

    let assignedCount = 0;

    if (permissionsToAssign === 'ALL') {
      for (const perm of allPermissions) {
        const [up, created] = await UserPermission.findOrCreate({
          where: { user_id: user.id, permission_id: perm.id },
          defaults: { granted_by_id: grantedById, is_active: true },
          transaction: t
        });
        if (created) assignedCount++;
      }
    } else {
      const permissionsToGrant = [];
      for (const p of permissionsToAssign) {
        const aliases = moduleAliases[p.module] || [p.module];
        for (const perm of allPermissions) {
          const permModule = (perm.module || '').toLowerCase();
          const permAction = (perm.action || '').toLowerCase();

          if (aliases.includes(permModule) && p.actions.includes(permAction)) {
            permissionsToGrant.push(perm);
          }
        }
      }

      // Eliminar duplicados de permisos a asignar
      const uniquePermissions = Array.from(new Map(permissionsToGrant.map(r => [r.id, r])).values());

      for (const perm of uniquePermissions) {
        const [up, created] = await UserPermission.findOrCreate({
          where: { user_id: user.id, permission_id: perm.id },
          defaults: { granted_by_id: grantedById, is_active: true },
          transaction: t
        });
        if (created) assignedCount++;
      }
    }

    if (!transactionProvided) await t.commit();
    console.log(`Asignados ${assignedCount} permisos a usuario ${user.usuario || user.id} para rol ${normalizedRole}`);
    return assignedCount;
  } catch (error) {
    if (!transactionProvided) await t.rollback();
    console.error('Error en assignDefaultPermissions:', error);
    throw error;
  }
}

export default { assignDefaultPermissions };
