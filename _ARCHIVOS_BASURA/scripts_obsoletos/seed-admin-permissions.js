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

async function seedAdminPermissions() {
  try {
    await sequelize.authenticate();
    console.log('Conectado a la base de datos.');

    // Find admin user - try 'usuario' username or common admin emails
    const [admin] = await sequelize.query(
      "SELECT id FROM users WHERE usuario = 'admin' OR correo = 'admin@example.com' OR rol = 'admin' LIMIT 1",
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (!admin) {
      console.error('Usuario admin no encontrado.');
      process.exit(1);
    }

    console.log(`Admin encontrado: ${admin.id}`);

    // Get all permissions
    const permissions = await sequelize.query(
      "SELECT id, name FROM permissions",
      { type: Sequelize.QueryTypes.SELECT }
    );

    console.log(`Encontrados ${permissions.length} permisos.`);

    let assignedCount = 0;

    for (const p of permissions) {
      const [existing] = await sequelize.query(
        "SELECT id FROM user_permissions WHERE user_id = :userId AND permission_id = :permId",
        {
          replacements: { userId: admin.id, permId: p.id },
          type: Sequelize.QueryTypes.SELECT
        }
      );

      if (!existing) {
        await sequelize.query(
          `INSERT INTO user_permissions (id, user_id, permission_id, granted_by_id, is_active, created_at, updated_at)
           VALUES (:id, :userId, :permId, :grantedBy, true, NOW(), NOW())`,
          {
            replacements: {
              id: uuidv4(),
              userId: admin.id,
              permId: p.id,
              grantedBy: admin.id
            }
          }
        );
        assignedCount++;
      }
    }

    console.log(`Asignados ${assignedCount} nuevos permisos al admin.`);
    process.exit(0);
  } catch (error) {
    console.error('Error al asignar permisos al admin:', error);
    process.exit(1);
  }
}

seedAdminPermissions();
