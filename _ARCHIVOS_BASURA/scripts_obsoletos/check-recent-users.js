import { User } from './src/models/index.js';
import { sequelize } from './src/config/database.js';

async function listRecentUsers() {
  try {
    console.log('Listing recent users...');
    
    const users = await User.findAll({
      limit: 5,
      order: [['created_at', 'DESC']],
      attributes: ['id', 'usuario', 'correo', 'activo', 'rol', 'departamento', 'created_at']
    });

    console.log(`Found ${users.length} users.`);
    users.forEach(u => {
      console.log(`- ${u.usuario} (${u.correo}) | Role: ${u.rol} | Dept: ${u.departamento} | Active: ${u.activo}`);
    });

  } catch (error) {
    console.error('Error listing users:', error);
  } finally {
    await sequelize.close();
  }
}

listRecentUsers();
