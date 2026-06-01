import { User } from './src/models/index.js';
import { Op } from 'sequelize';

async function checkYesmilDate() {
  try {
    const yesmil = await User.findOne({
      where: {
        correo: { [Op.like]: '%yesmil.figueroa%' }
      }
    });

    if (yesmil) {
      console.log(`User: ${yesmil.usuario}`);
      console.log(`Created At: ${yesmil.createdAt}`);
      console.log(`Updated At: ${yesmil.updatedAt}`);
    } else {
      console.log('Yesmil not found');
    }
  } catch (error) {
    console.error(error);
  }
}

checkYesmilDate();
