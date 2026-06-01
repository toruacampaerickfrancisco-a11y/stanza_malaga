import { User } from './src/models/index.js';
import { Op } from 'sequelize';

async function findAlba() {
  try {
    const users = await User.findAll({
      where: {
        [Op.or]: [
          { usuario: { [Op.like]: '%alba%' } },
          { correo: { [Op.like]: '%alba%' } },
          { nombre_completo: { [Op.like]: '%alba%' } }
        ]
      }
    });

    console.log(`Found ${users.length} users matching 'alba':`);
    users.forEach(u => {
      console.log(`- ID: ${u.id}, User: ${u.usuario}, Email: ${u.correo}, Active: ${u.activo}, Role: ${u.rol}, CreatedAt: ${u.createdAt}`);
    });
  } catch (error) {
    console.error('Error searching user:', error);
  }
}

findAlba();
