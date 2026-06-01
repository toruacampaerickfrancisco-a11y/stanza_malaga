import { User } from './src/models/index.js';
import { Op } from 'sequelize';

async function checkYesmil3() {
  try {
    const user = await User.findOne({
      where: {
        correo: { [Op.like]: '%yesmil.figueroa3%' }
      }
    });

    if (user) {
      console.log(`User found: ${user.usuario}`);
      console.log(`Email: ${user.correo}`);
      console.log(`ID: ${user.id}`);
      console.log(`Password Hash: ${user.contrasena.substring(0, 10)}...`);
    } else {
      console.log('User yesmil.figueroa3 not found');
    }
  } catch (error) {
    console.error(error);
  }
}

checkYesmil3();
