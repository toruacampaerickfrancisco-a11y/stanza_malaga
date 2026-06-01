import { UserPermission, Permission, Department } from '../models/index.js';
import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import config from '../config/config.js';

// Middleware para verificar JWT token
export const authenticateToken = async (ctx, next) => {
  try {
    const authHeader = ctx.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: 'Token de acceso requerido'
      };
      return;
    }

    // Verificar token
    const decoded = jwt.verify(token, config.jwt.secret);
    
    // Buscar usuario en la base de datos
    const user = await User.findByPk(decoded.userId, {
      include: [
        {
          model: Department,
          as: 'department'
        }
      ]
    });
    
    if (!user) {
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: 'Token inválido - usuario no encontrado'
      };
      return;
    }

    if (!user.activo) {
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: 'Usuario desactivado'
      };
      return;
    }

    // Agregar usuario al contexto
    ctx.state.user = user;
    
    await next();

  } catch (error) {
    console.error('Error en autenticación:', error);
    
    if (error.name === 'JsonWebTokenError') {
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: 'Token inválido'
      };
    } else if (error.name === 'TokenExpiredError') {
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: 'Token expirado'
      };
    } else {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: 'Error interno del servidor'
      };
    }
  }
};

// Middleware para verificar roles
export const requireRole = (...allowedRoles) => {
  return async (ctx, next) => {
    try {
      const user = ctx.state.user;
      
      if (!user) {
        ctx.status = 401;
        ctx.body = {
          success: false,
          message: 'Usuario no autenticado'
        };
        return;
      }

      // Normalize role value
      let userRole = ((user.rol || user.role || '') + '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      // If role is empty, try to derive a sensible role from active permissions by querying DB
      if (!userRole) {
        try {
          const userWithPermissions = await User.findByPk(user.id, {
            include: [
              {
                model: UserPermission,
                as: 'permisos',
                include: [ { model: Permission, as: 'permission' } ]
              }
            ]
          });
          const permisos = (userWithPermissions?.permisos || []).filter(p => p.is_active && (!p.expires_at || new Date(p.expires_at) > new Date()));
          const permModules = permisos.map(p => (p.permission && p.permission.module || '').toString().toLowerCase());
          if (permModules.some(m => ['supplies', 'insumos', 'equipment', 'equipos'].includes(m))) {
            userRole = 'tecnico';
          } else if (permModules.some(m => ['tickets'].includes(m))) {
            userRole = 'usuario';
          }
        } catch (e) {
          // ignore derivation errors
        }
      }
      const normalized = allowedRoles.map(r => r.toString().toLowerCase());
      if (!normalized.includes(userRole)) {
        ctx.status = 403;
        ctx.body = {
          success: false,
          message: 'No tienes permisos para acceder a este recurso'
        };
        return;
      }

      await next();

    } catch (error) {
      console.error('Error en verificación de rol:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: 'Error interno del servidor'
      };
    }
  };
};

// Middleware para verificar permisos específicos
export const requirePermission = (module, action) => {
  return async (ctx, next) => {
    try {
      const user = ctx.state.user;
      
      if (!user) {
        ctx.status = 401;
        ctx.body = {
          success: false,
          message: 'Usuario no autenticado'
        };
        return;
      }

      // Los admins (cualquier capitalización) tienen todos los permisos
      if (((user.rol || user.role || '') + '').toLowerCase() === 'admin') {
        await next();
        return;
      }

      // Buscar permisos del usuario
      const userWithPermissions = await User.findByPk(user.id, {
        include: [
          {
            model: UserPermission,
            as: 'permisos',
            include: [
              {
                model: Permission,
                as: 'permission'
              }
            ]
          }
        ]
      });

      const permisos = (userWithPermissions?.permisos || []).filter(p => p.is_active && (!p.expires_at || new Date(p.expires_at) > new Date()));

      // Mostrar permisos con detalle (módulo:acción) para diagnóstico
      try {
        const permList = permisos.map(p => (p.permission ? `${p.permission.module}:${p.permission.action}` : `id:${p.id}`));
        console.log(`[Auth Debug] Permission details: ${permList.join(', ')}`);
      } catch (e) {
        // ignore logging errors
      }

      // Build bidirectional alias map for modules to maintain backward compatibility
      // e.g. group ['supplies','insumos'] should match either name
      const aliasGroups = [
        ['supplies', 'insumos'],
        ['users', 'usuarios'],
        ['equipment', 'equipos']
      ];

      const moduleAliases = {};
      aliasGroups.forEach(group => {
        group.forEach(name => {
          moduleAliases[name] = group;
        });
      });

      const allowedModules = moduleAliases[module] || [module];
      const hasPermission = permisos.some(up => up.permission && allowedModules.includes(up.permission.module) && up.permission.action === action);

      console.log(`[Auth Debug] User: ${user.usuario} (${user.id})`);
      console.log(`[Auth Debug] Requesting: ${module}:${action} (allowed: ${allowedModules.join(',')})`);
      console.log(`[Auth Debug] Total Perms: ${userWithPermissions?.permisos?.length || 0}`);
      console.log(`[Auth Debug] Active Perms: ${permisos.length}`);
      console.log(`[Auth Debug] Has Permission: ${hasPermission}`);

      if (!hasPermission) {
        // En entorno de desarrollo, permitir por rol si el rol implica el permiso por defecto
        if (process.env.NODE_ENV === 'development') {
          // Developer-friendly fallback: permitir acceso a `supplies` si el usuario tiene permisos
          // sobre `tickets` (ver/crear) para facilitar pruebas locales cuando las asignaciones
          // de permisos no estén completas.
          const hasTicketPerm = permisos.some(up => up.permission && up.permission.module === 'tickets' && ['view', 'create'].includes(up.permission.action));
          if ((module === 'supplies' || module === 'insumos') && hasTicketPerm) {
            console.log(`[Auth Debug] DEV fallback: allowing supplies access because user has ticket perms`);
            await next();
            return;
          }
        }

        // Outside development: still allow supplies access if the user has direct ticket perms
        const hasTicketPermAlways = permisos.some(up => up.permission && up.permission.module === 'tickets' && ['view', 'create'].includes(up.permission.action));
        if ((module === 'supplies' || module === 'insumos') && hasTicketPermAlways) {
          console.log('[Auth Debug] Allowing supplies access because user has tickets permissions (global fallback)');
          await next();
          return;
        }

        // Role fallback check: normalize role safely
        const role = ((user.rol || user.role || '') + '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const rolePermissionsFallback = {
          admin: [{ module: module, actions: ['view', 'create', 'edit', 'delete'] }],
          presidente: [{ module: module, actions: ['view', 'create', 'edit', 'delete'] }],
          vicepresidente: [{ module: module, actions: ['view', 'create', 'edit', 'delete'] }],
          tecnico: [
            { module: 'tickets', actions: ['view', 'create', 'edit'] },
            { module: 'supplies', actions: ['view', 'create', 'edit'] },
            { module: 'equipment', actions: ['view', 'create', 'edit'] }
          ],
          tesorero: [
            { module: 'equipment', actions: ['view', 'create', 'edit', 'delete'] },
            { module: 'reports', actions: ['view', 'create', 'edit', 'delete'] },
            { module: 'dashboard', actions: ['view', 'create', 'edit', 'delete'] },
            { module: 'tickets', actions: ['view', 'create'] }
          ],
          eventos: [
            { module: 'tickets', actions: ['view', 'create', 'edit', 'delete', 'assign'] },
            { module: 'users', actions: ['view', 'create', 'edit', 'delete'] },
            { module: 'profile', actions: ['view', 'edit'] }
          ],
          guardia: [
            { module: 'supplies', actions: ['view', 'create', 'edit', 'delete'] },
            { module: 'profile', actions: ['view', 'edit'] }
          ],
          inventario: [
            { module: 'supplies', actions: ['view', 'create', 'edit', 'delete'] },
            { module: 'equipment', actions: ['view', 'create', 'edit', 'delete'] }
          ],
          usuario: [
            { module: 'tickets', actions: ['view', 'create'] },
            { module: 'profile', actions: ['view', 'edit'] }
          ],
          user: [
            { module: 'tickets', actions: ['view', 'create'] },
            { module: 'profile', actions: ['view', 'edit'] }
          ],
          residente: [
            { module: 'tickets', actions: ['view', 'create'] },
            { module: 'profile', actions: ['view', 'edit'] }
          ]
        };

        const permsForRole = rolePermissionsFallback[role] || [];
        const roleAllows = permsForRole.some(rp => {
          const aliases = (rp.module === 'supplies') ? ['supplies', 'insumos'] : [rp.module];
          return aliases.includes(module) && rp.actions.includes(action);
        });

        console.log(`[Auth Debug] Role fallback for user ${user.usuario}: role=${role}, roleAllows=${roleAllows}`);

        if (roleAllows) {
          await next();
          return;
        }

        ctx.status = 403;
        ctx.body = {
          success: false,
          message: `No tienes permisos para ${action} en ${module}`
        };
        return;
      }

      await next();

    } catch (error) {
      console.error('Error en verificación de permisos:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: 'Error interno del servidor'
      };
    }
  };
};

// Middleware opcional para usuario autenticado (no falla si no hay token)
export const optionalAuth = async (ctx, next) => {
  try {
    const authHeader = ctx.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      try {
        const decoded = jwt.verify(token, config.jwt.secret);
        const user = await User.findByPk(decoded.userId);
        if (user && user.activo) {
          ctx.state.user = user;
        }
      } catch (error) {
        // Ignorar errores de token en auth opcional
      }
    }

    await next();

  } catch (error) {
    console.error('Error en autenticación opcional:', error);
    await next();
  }
};