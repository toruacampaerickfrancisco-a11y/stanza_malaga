import { User, UserPermission, Permission } from './src/models/index.js';
import { Op } from 'sequelize';

async function test() {
  try {
    const limit = 100;
    const offset = 0;
    
    const { count, rows } = await User.findAndCountAll({
      limit: parseInt(limit),
      offset: parseInt(offset),
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

    console.log(`Count: ${count}`);
    console.log(`Rows length: ${rows.length}`);
    
    const userCounts = {};
    rows.forEach(u => {
      const name = u.nombre_completo;
      userCounts[name] = (userCounts[name] || 0) + 1;
    });

    console.log('Duplicates check:');
    for (const [name, count] of Object.entries(userCounts)) {
      if (count > 1) {
        console.log(`- ${name}: ${count} times`);
        // Check IDs
        const ids = rows.filter(u => u.nombre_completo === name).map(u => u.id);
        console.log(`  IDs: ${ids.join(', ')}`);
      }
    }

  } catch (error) {
    console.error(error);
  }
}

test();
