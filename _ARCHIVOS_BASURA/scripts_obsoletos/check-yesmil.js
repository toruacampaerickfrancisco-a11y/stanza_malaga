import { User } from './src/models/index.js';
import { Op } from 'sequelize';

async function checkYesmil() {
  try {
    // 1. Find Yesmil
    const yesmil = await User.findOne({
      where: {
        correo: { [Op.like]: '%yesmil.figueroa%' }
      }
    });

    if (!yesmil) {
      console.log('User yesmil.figueroa not found.');
      return;
    }

    console.log('--- User Yesmil ---');
    console.log(`ID: ${yesmil.id}`);
    console.log(`Username: ${yesmil.usuario}`);
    console.log(`Email: ${yesmil.correo}`);
    console.log(`Role: ${yesmil.rol}`);
    console.log(`Active: ${yesmil.activo}`);
    console.log('-------------------');

    // 2. Find users created by Yesmil (assuming creado_por stores ID or username)
    // We'll try searching by ID first if it's a UUID, or username.
    // The model definition usually maps 'creado_por' to 'createdBy'. Let's check the model if possible, but raw query might be safer or just try both.
    
    // Let's look at recent users again and see their 'creado_por' field.
    const recentUsers = await User.findAll({
      order: [['createdAt', 'DESC']],
      limit: 5
    });

    console.log('--- Recent Users ---');
    recentUsers.forEach(u => {
      console.log(`User: ${u.usuario} (${u.correo})`);
      console.log(`  Created By: ${u.creado_por}`);
      console.log(`  Created At: ${u.createdAt}`);
    });

  } catch (error) {
    console.error('Error checking yesmil:', error);
  }
}

checkYesmil();
