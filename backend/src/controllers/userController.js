import { User, UserPermission, Permission, Department } from '../models/index.js';
import permissionService from '../services/permissionService.js';
import { Op } from 'sequelize';

class UserController {
  constructor() {
    // bind instance methods so they keep 'this' when passed as router handlers
    this.createUser = this.createUser.bind(this);
    this.updateUser = this.updateUser.bind(this);
    this.deleteUser = this.deleteUser.bind(this);
    this.getProfile = this.getProfile.bind(this);
    this.updateProfile = this.updateProfile.bind(this);
    this.getUserPermissions = this.getUserPermissions.bind(this);
    this.getUserModules = this.getUserModules.bind(this);
    this.assignPermission = this.assignPermission.bind(this);
    this.revokePermission = this.revokePermission.bind(this);
  }

  // Obtener permisos del usuario por ID (para /users/:id/permissions)
  async getUserPermissions(ctx) {
    try {
      const { id } = ctx.params;
      const user = await User.findByPk(id, {
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
      if (!user) {
        ctx.status = 404;
        ctx.body = { success: false, message: 'Usuario no encontrado' };
        return;
      }
      // Retornar solo el arreglo de permisos
      ctx.status = 200;
      ctx.body = user.permisos.map(up => {
        const upVal = up.dataValues || up;
        return {
          id: upVal.id,
          userId: upVal.usuario_id || upVal.user_id,
          permissionId: upVal.permission_id,
          grantedById: upVal.granted_by_id,
          grantedAt: upVal.granted_at,
          expiresAt: upVal.expires_at,
          isActive: upVal.is_active,
          permission: upVal.permission ? {
            id: upVal.permission.id,
            name: upVal.permission.name,
            module: upVal.permission.module,
            action: upVal.permission.action,
            description: upVal.permission.description,
            isActive: upVal.permission.is_active,
            createdAt: upVal.permission.created_at || upVal.permission.createdAt
          } : undefined
        };
      });
    } catch (error) {
      console.error('Error al obtener permisos del usuario:', error);
      ctx.status = 500;
      ctx.body = { success: false, message: 'Error interno del servidor' };
    }
  }

  // Obtener módulos a los que el usuario tiene acceso (para /users/:id/modules)
  async getUserModules(ctx) {
    try {
      const { id } = ctx.params;
      const user = await User.findByPk(id, {
        include: [
          {
            model: UserPermission,
            as: 'permisos',
            include: [
              {
                model: Permission,
                as: 'permission'
              }
            ],
            where: { is_active: true },
            required: false
          }
        ]
      });
      if (!user) {
        ctx.status = 404;
        ctx.body = { success: false, message: 'Usuario no encontrado' };
        return;
      }
      // Extraer módulos únicos con permiso de vista
      const modules = (user.permisos || [])
        .filter(up => up.permission && up.permission.action === 'view' && up.is_active)
        .map(up => up.permission.module);
      ctx.status = 200;
      ctx.body = Array.from(new Set(modules));
    } catch (error) {
      console.error('Error al obtener módulos del usuario:', error);
      ctx.status = 500;
      ctx.body = { success: false, message: 'Error interno del servidor' };
    }
  }
  // Obtener todos los usuarios con paginación y filtros
  async getAllUsers(ctx) {
    try {
      const {
        page = 1,
        limit = 10,
        search = '',
        role = '',
        department = '',
        isActive = ''
      } = ctx.query;

      const offset = (page - 1) * limit;
      const where = {};

      // Filtros
      if (search) {
        const orConditions = [
          { nombre_completo: { [Op.iLike]: `%${search}%` } },
          { usuario: { [Op.iLike]: `%${search}%` } },
          { correo: { [Op.iLike]: `%${search}%` } },
          { numero_empleado: { [Op.iLike]: `%${search}%` } },
          { dependencia: { [Op.iLike]: `%${search}%` } },
          { departamento: { [Op.iLike]: `%${search}%` } },
          { cargo: { [Op.iLike]: `%${search}%` } },
          { area: { [Op.iLike]: `%${search}%` } },
          { rol: { [Op.iLike]: `%${search}%` } }
        ];

        // Unificar búsqueda de roles user/usuario
        const s = search.toLowerCase();
        if (s.includes('user') || s.includes('usuario')) {
          orConditions.push({ rol: 'user' });
          orConditions.push({ rol: 'usuario' });
        }

        // Búsqueda por número de permisos
        const searchNum = Number(search);
        if (!isNaN(searchNum)) {
          orConditions.push(
            User.sequelize.where(
              User.sequelize.literal('(SELECT COUNT(*) FROM "user_permissions" WHERE "user_permissions"."user_id" = "User"."id")'),
              searchNum
            )
          );
        }

        where[Op.or] = orConditions;
      }

      if (role) {
        const r = role.toLowerCase().trim();
        if (r === 'tecnico' || r === 'técnico') {
           where.rol = { [Op.or]: [{ [Op.iLike]: 'tecnico' }, { [Op.iLike]: 'técnico' }] };
        } else if (r === 'usuario' || r === 'user') {
           where.rol = { [Op.or]: [{ [Op.iLike]: 'usuario' }, { [Op.iLike]: 'user' }] };
        } else {
           where.rol = { [Op.iLike]: r };
        }
      }

      if (department) {
        // Si es un UUID, filtrar por department_id, si no, por dependencia (legacy)
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(department);
        if (isUUID) {
          where.department_id = department;
        } else {
          where.dependencia = { [Op.iLike]: `%${department}%` };
        }
      }

      if (isActive !== '') {
        where.activo = isActive === 'true';
      }

      const { count, rows } = await User.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['createdAt', 'DESC']],
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
          },
          {
            model: Department,
            as: 'department'
          }
        ]
      });

      ctx.status = 200;
      ctx.body = {
        success: true,
        data: rows.map(user => user.toPublicJSON()),
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      };

    } catch (error) {
      console.error('Error al obtener usuarios:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: 'Error interno del servidor'
      };
    }
  }

  // Obtener usuario por ID
  async getUserById(ctx) {
    try {
      const { id } = ctx.params;

      const user = await User.findByPk(id, {
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
          },
          {
            model: Department,
            as: 'department'
          }
        ]
      });

      if (!user) {
        ctx.status = 404;
        ctx.body = {
          success: false,
          message: 'Usuario no encontrado'
        };
        return;
      }

      ctx.status = 200;
      ctx.body = {
        success: true,
        message: 'Usuario obtenido exitosamente',
        data: user.toPublicJSON()
      };

    } catch (error) {
      console.error('Error al obtener usuario:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: 'Error interno del servidor'
      };
    }
  }

  // Crear nuevo usuario
  async createUser(ctx) {
    try {
      let {
        username,
        email,
        password,
        fullName,
        employeeNumber,
        role = 'user',
        department,
        isActive = true,
        phone = ''
      } = ctx.request.body;

      // Normalizar rol para consistencia en BD (siempre minúsculas y sin acentos)
      if (role) {
        role = role.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      }
      // Si no se proporcionó rol, usar 'usuario' como fallback por defecto
      if (!role) role = 'usuario';

      // Validaciones
      if (!username || !email || !password || !fullName || !employeeNumber || !department) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: 'Todos los campos obligatorios deben ser proporcionados'
        };
        return;
      }

      // Verificar si ya existe un usuario con el mismo username, email o employeeNumber
      const orConditions = [
        { usuario: username },
        { correo: email }
      ];
      if (employeeNumber && employeeNumber.trim() !== '') {
        orConditions.push({ numero_empleado: employeeNumber });
      }

      const existingUsers = await User.findAll({
        where: {
          [Op.or]: orConditions
        }
      });

      if (existingUsers.length > 0) {
        // Verificar si alguno está activo
        const activeUser = existingUsers.find(u => u.activo);
        
        if (activeUser) {
          ctx.status = 409;
          ctx.body = {
            success: false,
            message: 'Ya existe un usuario activo con ese username, email o número de empleado'
          };
          return;
        }

        // Si solo hay usuarios inactivos, reactivamos el primero que encontremos
        const userToReactivate = existingUsers[0];
        
        console.log(`Reactivando usuario previamente eliminado: ${userToReactivate.usuario}`);
        
        // Determinar department_id y dependencia
        let department_id = null;
        let dependencia = department;
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(department);
        
        if (isUUID) {
          department_id = department;
          const dept = await Department.findByPk(department_id);
          if (dept) {
            dependencia = dept.display_name || dept.name;
          }
        }

        // Actualizar todos los campos
        await userToReactivate.update({
          usuario: username,
          correo: email,
          contrasena: password, // El hook beforeUpdate se encargará de hashear
          nombre_completo: fullName,
          numero_empleado: employeeNumber && employeeNumber.trim() !== '' ? employeeNumber : null,
          rol: role,
          department_id,
          dependencia,
          cargo: phone,
          activo: true
        });

        // Reasignar permisos
        try {
          const grantedById = ctx.state.user?.id || userToReactivate.id;
          await permissionService.assignDefaultPermissions(userToReactivate, role, grantedById);
        } catch (permError) {
          console.error('Error al reasignar permisos:', permError);
        }

        ctx.status = 200;
        ctx.body = {
          success: true,
          message: 'Usuario reactivado exitosamente',
          data: userToReactivate.toPublicJSON()
        };
        return;
      }

      // Determinar department_id y dependencia
      let department_id = null;
      let dependencia = department;
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(department);
      
      if (isUUID) {
        department_id = department;
        const dept = await Department.findByPk(department_id);
        if (dept) {
          dependencia = dept.display_name || dept.name;
        }
      }

      // Crear usuario
      const user = await User.create({
        usuario: username,
        correo: email,
        contrasena: password,
        nombre_completo: fullName,
        numero_empleado: employeeNumber && employeeNumber.trim() !== '' ? employeeNumber : null,
        rol: role,
        department_id,
        dependencia,
        cargo: phone,
        activo: isActive
      });

      // Asignar permisos por defecto según el rol (asegurando que realmente queden asignados)
      try {
        const grantedById = ctx.state.user?.id || user.id;
        console.log(`Asignando permisos automáticos para ${user.usuario} (Rol: ${role}) otorgados por ${grantedById}`);
        await permissionService.assignDefaultPermissions(user, role, grantedById);

        // Verificar que al menos un permiso fue creado; si no, reintentar una vez más
        const existingCount = await UserPermission.count({ where: { user_id: user.id } });
        if (existingCount === 0) {
          console.warn(`Usuario ${user.usuario} no tiene permisos asignados después del intento inicial. Reintentando asignación.`);
          try {
            await permissionService.assignDefaultPermissions(user, role, grantedById);
          } catch (secondErr) {
            console.error('Segundo intento de asignar permisos falló:', secondErr);
          }
        }
        // Si después del reintento no hay permisos, otorgar un conjunto mínimo seguro para evitar bloqueos
        const finalCount = await UserPermission.count({ where: { user_id: user.id } });
        if (finalCount === 0) {
          try {
            console.warn(`Fallback: asignando permisos mínimos a ${user.usuario} porque no se asignaron permisos automáticos.`);
            // Asignar permisos mínimos: tickets:view,tickets:create y profile:view,profile:edit
            const fallbackModules = {
              tickets: ['view', 'create'],
              profile: ['view', 'edit']
            };
            const allPermissions = await Permission.findAll();
            const toGrant = allPermissions.filter(p => {
              const mod = (p.module || '').toString().toLowerCase();
              const act = (p.action || '').toString().toLowerCase();
              return (fallbackModules[mod] && fallbackModules[mod].includes(act));
            });

            for (const perm of toGrant) {
              await UserPermission.findOrCreate({
                where: { user_id: user.id, permission_id: perm.id },
                defaults: { granted_by_id: grantedById, is_active: true }
              });
            }
            const grantedNow = await UserPermission.count({ where: { user_id: user.id } });
            console.log(`Fallback asignó ${grantedNow} permisos a ${user.usuario}`);
          } catch (fbErr) {
            console.error('Error en fallback de asignación de permisos:', fbErr);
          }
        }
      } catch (permError) {
        console.error('Error al asignar permisos por defecto:', permError);
        // No hacemos fallar la creación del usuario, pero dejamos registro claro
      }

      ctx.status = 201;
      ctx.body = {
        success: true,
        message: 'Usuario creado exitosamente',
        data: user.toPublicJSON()
      };

    } catch (error) {
      console.error('Error al crear usuario:', error);
      
      if (error.name === 'SequelizeValidationError') {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: 'Datos de usuario inválidos',
          errors: error.errors.map(err => ({
            field: err.path,
            message: err.message
          }))
        };
      } else {
        ctx.status = 500;
        ctx.body = {
          success: false,
          message: 'Error interno del servidor'
        };
      }
    }
  }

  async updateUser(ctx) {
    try {
      const { id } = ctx.params;
      let {
        username,
        email,
        password,
        fullName,
        employeeNumber,
        role,
        department,
        isActive,
        phone
      } = ctx.request.body;

      // Normalizar rol si se proporciona
      if (role) {
        role = role.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      }

      const user = await User.findByPk(id);
      if (!user) {
        ctx.status = 404;
        ctx.body = {
          success: false,
          message: 'Usuario no encontrado'
        };
        return;
      }

      // Verificar duplicados si se cambian valores únicos
      const orConditions = [];
      if (username && username !== user.usuario) orConditions.push({ usuario: username });
      if (email && email !== user.correo) orConditions.push({ correo: email });
      if (employeeNumber && employeeNumber.trim() !== '' && employeeNumber !== user.numero_empleado) {
        orConditions.push({ numero_empleado: employeeNumber });
      }

      const shouldCheckDuplicates = orConditions.length > 0;

      if (shouldCheckDuplicates) {
        const existingUser = await User.findOne({
          where: {
            id: { [Op.ne]: id },
            [Op.or]: orConditions
          }
        });

        if (existingUser) {
          ctx.status = 409;
          ctx.body = {
            success: false,
            message: 'Ya existe otro usuario con ese username, email o número de empleado'
          };
          return;
        }
      }

      // Determinar department_id y dependencia si se proporciona department
      let department_id = undefined;
      let dependencia = undefined;
      if (department !== undefined) {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(department);
        if (isUUID) {
          department_id = department;
          const dept = await Department.findByPk(department_id);
          if (dept) {
            dependencia = dept.display_name || dept.name;
          }
        } else {
          dependencia = department;
          department_id = null;
        }
      }

      // Actualizar usuario
      await user.update({
        ...(username && { usuario: username }),
        ...(email && { correo: email }),
        ...(password && { contrasena: password }),
        ...(fullName && { nombre_completo: fullName }),
        ...(employeeNumber !== undefined && { numero_empleado: employeeNumber && employeeNumber.trim() !== '' ? employeeNumber : null }),
        ...(role && { rol: role }),
        ...(department_id !== undefined && { department_id }),
        ...(dependencia !== undefined && { dependencia }),
        ...(phone !== undefined && { cargo: phone }),
        ...(isActive !== undefined && { activo: isActive })
      });

      // Si se actualizó el rol, asegurar que tenga los permisos por defecto
      if (role) {
        try {
          const grantedById = ctx.state.user?.id || user.id;
          await permissionService.assignDefaultPermissions(user, role, grantedById);
        } catch (permError) {
          console.error(`Error al reasignar permisos por defecto para el rol ${role}:`, permError);
        }
      }

      ctx.status = 200;
      ctx.body = {
        success: true,
        message: 'Usuario actualizado exitosamente',
        data: user.toPublicJSON()
      };

    } catch (error) {
      console.error('Error al actualizar usuario:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: 'Error interno del servidor'
      };
    }
  }

  // Eliminar un usuario (soft delete)
  async deleteUser(ctx) {
    try {
      const { id } = ctx.params;
      const user = await User.findByPk(id);

      if (!user) {
        ctx.status = 404;
        ctx.body = {
          success: false,
          message: 'Usuario no encontrado'
        };
        return;
      }

      // Soft delete: marcar como inactivo en lugar de borrar
      await user.update({ activo: false });
      
      // Opcional: revocar todos los permisos del usuario al desactivarlo
      await UserPermission.destroy({ where: { user_id: id } });

      ctx.status = 200;
      ctx.body = {
        success: true,
        message: 'Usuario desactivado exitosamente'
      };

    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: 'Error interno del servidor'
      };
    }
  }

  // Obtener el perfil del usuario autenticado (para /profile)
  async getProfile(ctx) {
    try {
      const user = ctx.state.user;
      ctx.status = 200;
      ctx.body = {
        success: true,
        data: user.toPublicJSON()
      };
    } catch (error) {
      console.error('Error al obtener perfil:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: 'Error interno del servidor'
      };
    }
  }

  // Actualizar perfil del usuario autenticado
  async updateProfile(ctx) {
    try {
      const user = ctx.state.user;
      const { fullName, email, department } = ctx.request.body;

      // Verificar email único si se cambia
      if (email && email !== user.correo) {
        const existingUser = await User.findOne({
          where: {
            id: { [Op.ne]: user.id },
            correo: email
          }
        });

        if (existingUser) {
          ctx.status = 409;
          ctx.body = {
            success: false,
            message: 'Ya existe otro usuario con ese email'
          };
          return;
        }
      }

      // Actualizar perfil
      await user.update({
        ...(fullName && { nombre_completo: fullName }),
        ...(email && { correo: email }),
        ...(department && { dependencia: department })
      });

      ctx.status = 200;
      ctx.body = {
        success: true,
        message: 'Perfil actualizado exitosamente',
        data: user.toPublicJSON()
      };

    } catch (error) {
      console.error('Error al actualizar perfil:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: 'Error interno del servidor'
      };
    }
  }
  // Obtener usuarios por rol
  async getUsersByRole(ctx) {
    try {
      const { role } = ctx.params;
      if (!role) {
        ctx.status = 400;
        ctx.body = { success: false, message: 'Rol requerido' };
        return;
      }
      const users = await User.findAll({ where: { rol: role } });
      ctx.status = 200;
      ctx.body = {
        success: true,
        message: 'Usuarios obtenidos exitosamente',
        data: users.map(u => u.toPublicJSON())
      };
    } catch (error) {
      console.error('Error al obtener usuarios por rol:', error);
      ctx.status = 500;
      ctx.body = { success: false, message: 'Error interno del servidor' };
    }
  }

  // Obtener todos los usuarios con sus permisos
  async getAllUsersWithPermissions(ctx) {
    try {
      const users = await User.findAll({
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

      const data = users.map(user => {
        const permissions = (user.permisos || []).map(up => {
          const upVal = up.dataValues || up;
          return {
            id: upVal.id,
            userId: upVal.usuario_id || upVal.user_id,
            permissionId: upVal.permission_id,
            grantedById: upVal.granted_by_id,
            grantedAt: upVal.granted_at,
            expiresAt: upVal.expires_at,
            isActive: upVal.is_active,
            permission: upVal.permission ? {
              id: upVal.permission.id,
              name: upVal.permission.name,
              module: upVal.permission.module,
              action: upVal.permission.action,
              description: upVal.permission.description,
              isActive: upVal.permission.is_active,
              createdAt: upVal.permission.created_at || upVal.permission.createdAt
            } : undefined
          };
        });

        return {
          id: user.id,
          userId: user.id, // For compatibility
          permissions
        };
      });

      ctx.status = 200;
      ctx.body = { success: true, data };
    } catch (error) {
      console.error('Error al obtener usuarios con permisos:', error);
      ctx.status = 500;
      ctx.body = { success: false, message: 'Error interno del servidor' };
    }
  }

  // Asignar permiso a usuario
  async assignPermission(ctx) {
    try {
      const { id } = ctx.params;
      const { permissionId } = ctx.request.body;
      const grantedById = ctx.state.user.id;

      if (!permissionId) {
        ctx.status = 400;
        ctx.body = { success: false, message: 'Permission ID requerido' };
        return;
      }

      // Verificar si ya existe
      const existing = await UserPermission.findOne({
        where: {
          user_id: id,
          permission_id: permissionId
        }
      });

      if (existing) {
        if (!existing.is_active) {
          existing.is_active = true;
          await existing.save();
        }
        ctx.status = 200;
        ctx.body = { success: true, message: 'Permiso asignado' };
        return;
      }

      await UserPermission.create({
        user_id: id,
        permission_id: permissionId,
        granted_by_id: grantedById,
        is_active: true
      });

      ctx.status = 201;
      ctx.body = { success: true, message: 'Permiso asignado exitosamente' };
    } catch (error) {
      console.error('Error al asignar permiso:', error);
      ctx.status = 500;
      ctx.body = { success: false, message: 'Error interno del servidor' };
    }
  }

  // Revocar permiso a usuario
  async revokePermission(ctx) {
    try {
      const { id, permissionId } = ctx.params;

      const userPermission = await UserPermission.findOne({
        where: {
          user_id: id,
          permission_id: permissionId
        }
      });

      if (userPermission) {
        await userPermission.destroy(); // O userPermission.update({ is_active: false });
      }

      ctx.status = 200;
      ctx.body = { success: true, message: 'Permiso revocado exitosamente' };
    } catch (error) {
      console.error('Error al revocar permiso:', error);
      ctx.status = 500;
      ctx.body = { success: false, message: 'Error interno del servidor' };
    }
  }
}

export default new UserController();