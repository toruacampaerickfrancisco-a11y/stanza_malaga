
import { User } from './src/models/index.js';

async function resetPassword() {
  try {
    // Requerir confirmación explícita
    const forced = process.argv.includes('--force') || process.env.FORCE === 'true';
    if (!forced) {
      console.log('Operación cancelada: este script modifica contraseñas. Use --force o FORCE=true para confirmar.');
      return;
    }

    const userId = '6f81d18c-7af1-48f9-aaec-c5b4899d5c68'; // ID de RASCON PAREDES ALBA LUZ
    const newPassword = 'Temporal123';

    const user = await User.findByPk(userId);
    if (!user) {
      console.log('Usuario no encontrado');
      return;
    }

    console.log(`Restableciendo contraseña para: ${user.nombre_completo}`);
    
    // Solo asignamos la contraseña en texto plano, el hook beforeUpdate del modelo se encargará de hashearla
    user.contrasena = newPassword;
    await user.save();

    console.log('Contraseña actualizada exitosamente (no mostrar la contraseña en logs públicos).');

  } catch (error) {
    console.error('Error al restablecer contraseña:', error);
  }
}

resetPassword();
