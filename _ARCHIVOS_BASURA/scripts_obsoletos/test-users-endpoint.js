import { User, UserPermission, Permission } from './src/models/index.js';
import { sequelize } from './src/config/database.js';

async function testGetUsers() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a la BD.');

    console.log('🔍 Buscando usuarios...');
    const { count, rows } = await User.findAndCountAll({
      limit: 10,
      offset: 0,
      order: [['created_at', 'DESC']],
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

    console.log(`✅ Encontrados ${count} usuarios.`);
    console.log('Primer usuario:', JSON.stringify(rows[0].toPublicJSON(), null, 2));

  } catch (error) {
    console.error('❌ Error al obtener usuarios:', error);
  } finally {
    await sequelize.close();
  }
}

testGetUsers();
