import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';
import bcrypt from 'bcryptjs';

class User extends Model {
  // Método para verificar contraseña
  async validarContrasena(contrasena) {
    return await bcrypt.compare(contrasena, this.contrasena);
  }

  // Método para hashear contraseña
  async setContrasena(contrasena) {
    const salt = await bcrypt.genSalt(10);
    this.contrasena = await bcrypt.hash(contrasena, salt);
  }

  static associate(models) {
    User.hasMany(models.UserPermission, { foreignKey: 'user_id', as: 'permisos' });
    User.hasMany(models.Ticket, { foreignKey: 'reported_by_id', as: 'tickets_solicitados' });
    User.hasMany(models.Ticket, { foreignKey: 'assigned_to_id', as: 'tickets_asignados' });
    User.hasMany(models.Equipment, { foreignKey: 'assigned_user_id', as: 'equipos_asignados' });
    // Asociación con Department
    if (models.Department) {
      User.belongsTo(models.Department, { foreignKey: 'department_id', as: 'department' });
    }
    
    // Asociaciones Activities
    if (models.Activity) {
      User.hasMany(models.Activity, { foreignKey: 'created_by', as: 'created_activities' });
    }
    if (models.ActivityParticipant) {
      User.hasMany(models.ActivityParticipant, { foreignKey: 'user_id', as: 'activity_participations' });
    }
  }

  // Método para serializar datos públicos con nombres esperados por el frontend
  toPublicJSON() {
    const data = this.dataValues;
    const {
      id,
      usuario,
      correo,
      nombre_completo,
      numero_empleado,
      rol,
      departamento,
      department,
      department_id,
      activo,
      createdAt,
      updatedAt,
      created_at,
      updated_at,
      permisos,
      permissions,
      cargo,
      // También extraer asociaciones que podrían venir en dataValues
      tickets_solicitados,
      tickets_asignados,
      equipos_asignados,
      Department, // A veces Sequelize usa el nombre del modelo con mayúscula
      ...rest
    } = data;

    // Determinar la lista de permisos (puede venir como 'permisos' o 'permissions' según la asociación)
    let userPermissions = permisos || permissions || [];
    // Mapear cada permiso a la estructura esperada por el frontend
    userPermissions = userPermissions.map(up => {
      // up puede ser instancia de UserPermission o un objeto plano
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

    // Unificar roles 'user' y 'usuario' para visualización consistente
    let unifiedRole = rol;
    if (rol === 'user') unifiedRole = 'usuario';

    // Priorizar el nombre del departamento del modelo Department
    // Intentar obtenerlo de 'department' (alias), 'Department' (modelo) o 'departamento' (columna legacy)
    const deptObj = department || Department || this.department || this.Department;
    const departmentName = (deptObj && (deptObj.display_name || deptObj.name)) || this.dependencia || (typeof departamento === 'string' ? departamento : 'Sin Departamento');

    return {
      id,
      username: usuario,
      email: correo,
      fullName: nombre_completo,
      employeeNumber: numero_empleado,
      role: unifiedRole,
      department: String(departmentName || 'Sin Departamento'),
      departmentId: department_id,
      isActive: activo,
      phone: cargo || '',
      createdAt: createdAt || (created_at ? new Date(created_at).toISOString() : undefined),
      updatedAt: updatedAt || (updated_at ? new Date(updated_at).toISOString() : undefined),
      permissions: userPermissions,
      permissionCount: userPermissions.length,
      ...rest
    };
  }

  // Asociaciones estáticas (definidas arriba)
}

// Definir el modelo
User.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  numero_empleado: {
    type: DataTypes.STRING(20),
    allowNull: true, // Cambiado a true para hacerlo opcional
    unique: true,
    validate: {
      // La validación notEmpty se elimina o se maneja en la lógica de negocio si es necesario
    }
  },
  usuario: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
      len: [3, 50]
    }
  },
  correo: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
      notEmpty: true
    }
  },
  contrasena: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [6, 255]
    }
  },
  dependencia: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  departamento: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  rol: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  cargo: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  department_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'departments',
      key: 'id'
    }
  },
  area: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  creado_por: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  nombre_completo: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  activo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  ultimo_acceso: {
    type: DataTypes.DATE,
    allowNull: true
  },
  foto_perfil: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'User',
  tableName: 'users',
    hooks: {
      beforeCreate: async (user) => {
        if (user.rol) {
          user.rol = user.rol.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        }
        if (user.correo) {
          user.correo = user.correo.toLowerCase().trim();
        }
        if (user.contrasena) {
          await user.setContrasena(user.contrasena);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('rol') && user.rol) {
          user.rol = user.rol.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        }
        if (user.changed('correo') && user.correo) {
          user.correo = user.correo.toLowerCase().trim();
        }
        if (user.changed('contrasena')) {
          await user.setContrasena(user.contrasena);
        }
      }
    },
    indexes: [
    {
      unique: true,
      fields: ['usuario']
    },
    {
      unique: true,
      fields: ['correo']
    },
    {
      unique: true,
      fields: ['numero_empleado']
    },
    {
      fields: ['rol']
    },
    {
      fields: ['dependencia']
    },
    {
      fields: ['activo']
    }
  ]
});

export default User;