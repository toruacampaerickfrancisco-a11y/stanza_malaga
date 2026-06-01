import { sequelize, syncDatabase } from './src/config/database.js';
import { Permission } from './src/models/index.js';
import { v4 as uuidv4 } from 'uuid';

const permissions = [
  { module: 'dashboard', action: 'view', name: 'Ver Dashboard', description: 'Acceso al panel principal' },
  { module: 'users', action: 'view', name: 'Ver Usuarios', description: 'Ver lista de usuarios' },
  { module: 'users', action: 'create', name: 'Crear Usuarios', description: 'Crear nuevos usuarios' },
  { module: 'users', action: 'edit', name: 'Editar Usuarios', description: 'Editar usuarios existentes' },
  { module: 'users', action: 'delete', name: 'Eliminar Usuarios', description: 'Eliminar usuarios' },
  { module: 'equipment', action: 'view', name: 'Ver Equipos', description: 'Ver inventario de equipos' },
  { module: 'equipment', action: 'create', name: 'Crear Equipos', description: 'Registrar nuevos equipos' },
  { module: 'equipment', action: 'edit', name: 'Editar Equipos', description: 'Editar información de equipos' },
  { module: 'equipment', action: 'delete', name: 'Eliminar Equipos', description: 'Dar de baja equipos' },
  { module: 'tickets', action: 'view', name: 'Ver Tickets', description: 'Ver lista de tickets' },
  { module: 'tickets', action: 'create', name: 'Crear Tickets', description: 'Crear nuevos tickets' },
  { module: 'tickets', action: 'edit', name: 'Editar Tickets', description: 'Editar tickets' },
  { module: 'tickets', action: 'delete', name: 'Eliminar Tickets', description: 'Eliminar tickets' },
  { module: 'reports', action: 'view', name: 'Ver Reportes', description: 'Acceso a reportes' },
  { module: 'reports', action: 'export', name: 'Exportar Reportes', description: 'Exportar reportes a PDF/Excel' },
  { module: 'permissions', action: 'view', name: 'Ver Permisos', description: 'Ver gestión de permisos' },
  { module: 'permissions', action: 'assign', name: 'Asignar Permisos', description: 'Asignar permisos a usuarios' },
  { module: 'profile', action: 'view', name: 'Ver Perfil', description: 'Ver perfil propio' },
  { module: 'profile', action: 'edit', name: 'Editar Perfil', description: 'Editar perfil propio' },
  { module: 'supplies', action: 'view', name: 'Ver Insumos', description: 'Ver inventario de insumos' },
  { module: 'supplies', action: 'create', name: 'Crear Insumos', description: 'Registrar nuevos insumos' },
  { module: 'supplies', action: 'edit', name: 'Editar Insumos', description: 'Editar insumos' },
  { module: 'supplies', action: 'delete', name: 'Eliminar Insumos', description: 'Eliminar insumos' },
  { module: 'departments', action: 'view', name: 'Ver Departamentos', description: 'Ver departamentos' },
  { module: 'departments', action: 'create', name: 'Crear Departamentos', description: 'Crear departamentos' },
  { module: 'departments', action: 'edit', name: 'Editar Departamentos', description: 'Editar departamentos' },
  { module: 'departments', action: 'delete', name: 'Eliminar Departamentos', description: 'Eliminar departamentos' },
];

async function seed() {
  try {
    console.log('Conectando a la base de datos...');
    await syncDatabase(false);
    await sequelize.authenticate();
    console.log('Conexión exitosa.');

    console.log('Sincronizando permisos...');
    for (const p of permissions) {
      const [perm, created] = await Permission.findOrCreate({
        where: { module: p.module, action: p.action },
        defaults: {
          id: uuidv4(),
          ...p
        }
      });
      if (created) console.log(`Permiso creado: ${p.module}:${p.action}`);
    }
    console.log('Sembrado de permisos completado.');
  } catch (error) {
    console.error('Error al sembrar permisos:', error);
  }
}

seed();
