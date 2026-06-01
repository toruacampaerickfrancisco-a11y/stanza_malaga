import { Sequelize, DataTypes } from 'sequelize';
import config from './src/config/config.js';

const sequelize = new Sequelize(
  config.database.database,
  config.database.username,
  config.database.password,
  {
    host: config.database.host,
    port: config.database.port,
    dialect: 'postgres',
    logging: console.log
  }
);

async function createMissingTables() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a la BD.');

    const queryInterface = sequelize.getQueryInterface();

    // 1. Crear tabla Permissions
    console.log('🔧 Verificando tabla permissions...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS permissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        module VARCHAR(50) NOT NULL,
        action VARCHAR(50) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // 2. Crear tabla UserPermissions
    console.log('🔧 Verificando tabla user_permissions...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS user_permissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
        granted_by_id UUID REFERENCES users(id),
        granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        expires_at TIMESTAMP WITH TIME ZONE,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // 3. Poblar permisos básicos si está vacía
    const [results] = await sequelize.query('SELECT count(*) as count FROM permissions');
    if (results[0].count === '0') {
      console.log('🔧 Poblando permisos iniciales...');
      const modules = ['dashboard', 'users', 'equipment', 'tickets', 'reports', 'profile', 'permissions', 'supplies'];
      const actions = ['view', 'create', 'edit', 'delete', 'export', 'assign'];
      
      const permissionsToInsert = [];
      
      modules.forEach(module => {
        actions.forEach(action => {
          // Lógica simple para descripción
          let desc = `Permite ${action === 'view' ? 'ver' : action} en el módulo ${module}`;
          
          permissionsToInsert.push(`(gen_random_uuid(), '${module}:${action}', '${module}', '${action}', '${desc}', true, NOW(), NOW())`);
        });
      });

      if (permissionsToInsert.length > 0) {
        await sequelize.query(`
          INSERT INTO permissions (id, name, module, action, description, is_active, created_at, updated_at)
          VALUES ${permissionsToInsert.join(',\n')};
        `);
        console.log(`✅ Se insertaron ${permissionsToInsert.length} permisos.`);
      }
    }

    // 4. Asignar permisos de administrador al usuario 'admin' (o al primer usuario que encontremos si no hay admin)
    console.log('🔧 Asignando permisos al administrador...');
    // Buscar usuario admin
    const [users] = await sequelize.query("SELECT id FROM users WHERE usuario = 'admin' OR rol = 'admin' LIMIT 1");
    
    if (users.length > 0) {
      const adminId = users[0].id;
      console.log(`👤 Usuario administrador encontrado: ${adminId}`);
      
      // Obtener todos los permisos
      const [allPermissions] = await sequelize.query("SELECT id FROM permissions");
      
      // Verificar cuáles le faltan
      const [existingPerms] = await sequelize.query(`SELECT permission_id FROM user_permissions WHERE user_id = '${adminId}'`);
      const existingIds = new Set(existingPerms.map(p => p.permission_id));
      
      const newPerms = allPermissions.filter(p => !existingIds.has(p.id));
      
      if (newPerms.length > 0) {
        const values = newPerms.map(p => `(gen_random_uuid(), '${adminId}', '${p.id}', '${adminId}', NOW(), true, NOW(), NOW())`).join(',');
        await sequelize.query(`
          INSERT INTO user_permissions (id, user_id, permission_id, granted_by_id, granted_at, is_active, created_at, updated_at)
          VALUES ${values};
        `);
        console.log(`✅ Se asignaron ${newPerms.length} permisos nuevos al administrador.`);
      } else {
        console.log('✅ El administrador ya tiene todos los permisos.');
      }
    } else {
      console.log('⚠️ No se encontró usuario admin para asignar permisos.');
    }

    console.log('✅ Tablas de permisos creadas y configuradas correctamente.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
  }
}

createMissingTables();
