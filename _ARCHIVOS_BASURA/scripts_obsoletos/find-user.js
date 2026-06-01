
import { User } from './src/models/index.js';
import { Op } from 'sequelize';

async function findUser() {
  try {
    const users = await User.findAll({
      where: {
        nombre_completo: {
          [Op.iLike]: '%RASCON PAREDES ALBA LUZ%'
        }
      }
    });

    if (users.length > 0) {
      console.log('Usuarios encontrados:');
      users.forEach(u => {
        console.log(`ID: ${u.id}`);
        console.log(`Nombre: ${u.nombre_completo}`);
        console.log(`Correo: ${u.correo}`);
        console.log(`Usuario: ${u.usuario}`);
        console.log(`Rol: ${u.rol}`);
        console.log(`Activo: ${u.activo}`);
        // No podemos ver la contraseña porque está hasheada
      });
    } else {
      console.log('No se encontró el usuario.');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

findUser();
