import bcrypt from 'bcryptjs';
import { User } from './src/models/index.js';
import { sequelize } from './src/config/database.js';

async function run() {
  try {
    const newPassword = 'Bienestar2025';
    console.log('Hashing password...');
    const hashed = await bcrypt.hash(newPassword, 10);

    console.log('Updating all users passwords...');
    const [updatedCount] = await User.update({ contrasena: hashed }, { where: {} });
    console.log(`Updated contraseñas para ${updatedCount} usuarios.`);

    // Verificar un usuario de ejemplo
    const exampleEmail = 'yesmil.figueroa@sonora.gob.mx';
    const user = await User.findOne({ where: { correo: exampleEmail } });
    if (!user) {
      console.log(`Usuario de ejemplo ${exampleEmail} no encontrado.`);
    } else {
      const match = await bcrypt.compare(newPassword, user.contrasena || '');
      console.log(`Verificación para ${exampleEmail}: ${match ? 'OK' : 'FALLÓ'}`);
    }

  } catch (err) {
    console.error('Error al restablecer contraseñas:', err);
  } finally {
    await sequelize.close();
  }
}

run();
