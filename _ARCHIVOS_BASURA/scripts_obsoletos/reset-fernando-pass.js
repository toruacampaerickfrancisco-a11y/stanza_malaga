import { User } from './src/models/index.js';
import { sequelize } from './src/config/database.js';

async function resetPassword() {
  try {
    // Requerir confirmación explícita
    const forced = process.argv.includes('--force') || process.env.FORCE === 'true';
    if (!forced) {
      console.log('Operación cancelada: este script modifica contraseñas. Use --force o FORCE=true para confirmar.');
      return;
    }

    const email = 'fernando.rendon@sedesson.gob.mx';
    const newPassword = 'password123'; // Temporary password

    console.log(`Resetting password for: ${email}`);
    
    const user = await User.findOne({
      where: {
        correo: email
      }
    });

    if (!user) {
      console.log('User NOT FOUND.');
      return;
    }

    // The hook beforeUpdate will hash this password
    user.contrasena = newPassword;
    await user.save();

    console.log('Password reset successfully (password not shown).');

  } catch (error) {
    console.error('Error resetting password:', error);
  } finally {
    await sequelize.close();
  }
}

resetPassword();
