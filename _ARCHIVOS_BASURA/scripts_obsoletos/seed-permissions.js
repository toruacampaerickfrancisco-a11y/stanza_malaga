import { Sequelize } from 'sequelize';
import config from './src/config/config.js';
import { v4 as uuidv4 } from 'uuid';

const sequelize = new Sequelize(
  config.database.database,
  config.database.username,
  config.database.password,
  {
    host: config.database.host,
    port: config.database.port,
    dialect: 'postgres',
    logging: false
  }
);

const permissions = [
  // Dashboard
  { module: 'dashboard', action: 'view', name: 'Ver Dashboard', description: 'Acceso al panel principal' },

  // Users
  { module: 'users', action: 'view', name: 'Ver Usuarios', description: 'Ver lista de usuarios' },
  { module: 'users', action: 'create', name: 'Crear Usuarios', description: 'Crear nuevos usuarios' },
  { module: 'users', action: 'edit', name: 'Editar Usuarios', description: 'Editar usuarios existentes' },
  { module: 'users', action: 'delete', name: 'Eliminar Usuarios', description: 'Eliminar usuarios' },

  // Equipment
  { module: 'equipment', action: 'view', name: 'Ver Equipos', description: 'Ver inventario de equipos' },
  { module: 'equipment', action: 'create', name: 'Crear Equipos', description: 'Registrar nuevos equipos' },
  { module: 'equipment', action: 'edit', name: 'Editar Equipos', description: 'Editar información de equipos' },
  { module: 'equipment', action: 'delete', name: 'Eliminar Equipos', description: 'Dar de baja equipos' },

  // Tickets
  { module: 'tickets', action: 'view', name: 'Ver Tickets', description: 'Ver lista de tickets' },
  { module: 'tickets', action: 'create', name: 'Crear Tickets', description: 'Crear nuevos tickets' },
  { module: 'tickets', action: 'edit', name: 'Editar Tickets', description: 'Editar tickets' },
  { module: 'tickets', action: 'delete', name: 'Eliminar Tickets', description: 'Eliminar tickets' },

  // Reports
  { module: 'reports', action: 'view', name: 'Ver Reportes', description: 'Acceso a reportes' },
  { module: 'reports', action: 'export', name: 'Exportar Reportes', description: 'Exportar reportes a PDF/Excel' },

  // Permissions
  { module: 'permissions', action: 'view', name: 'Ver Permisos', description: 'Ver gestión de permisos' },
  { module: 'permissions', action: 'assign', name: 'Asignar Permisos', description: 'Asignar permisos a usuarios' },

  // Profile
  { module: 'profile', action: 'view', name: 'Ver Perfil', description: 'Ver perfil propio' },
  { module: 'profile', action: 'edit', name: 'Editar Perfil', description: 'Editar perfil propio' },

  // Supplies (Insumos)
  { module: 'supplies', action: 'view', name: 'Ver Insumos', description: 'Ver lista de insumos' },
  { module: 'supplies', action: 'create', name: 'Crear Insumos', description: 'Crear nuevos insumos' },
  { module: 'supplies', action: 'edit', name: 'Editar Insumos', description: 'Editar insumos existentes' },
  { module: 'supplies', action: 'delete', name: 'Eliminar Insumos', description: 'Eliminar insumos' },
];

async function seedPermissions() {
  try {
    await sequelize.authenticate();
    console.log('Conectado a la base de datos.');

    for (const p of permissions) {
      const [permission] = await sequelize.query(
        `SELECT id FROM permissions WHERE module = :module AND action = :action`,
        {
          replacements: { module: p.module, action: p.action },
          type: Sequelize.QueryTypes.SELECT
        }
      );

      if (!permission) {
        await sequelize.query(
          `INSERT INTO permissions (id, name, module, action, description, is_active, created_at, updated_at)
           VALUES (:id, :name, :module, :action, :description, true, NOW(), NOW())`,
          {
            replacements: {
              id: uuidv4(),
              name: p.name,
              module: p.module,
              action: p.action,
              description: p.description
            }
          }
        );
        console.log(`+ Creado permiso: ${p.name}`);
      } else {
        console.log(`= Ya existe: ${p.name}`);
      }
    }

    console.log('Semilla de permisos completada.');
    process.exit(0);
  } catch (error) {
    console.error('Error al sembrar permisos:', error);
    process.exit(1);
  }
}

seedPermissions();
