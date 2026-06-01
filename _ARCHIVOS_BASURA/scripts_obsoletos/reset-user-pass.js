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

    const email = 'yesmil.figueroa@sonora.gob.mx';
    const newPassword = 'Bienestar2025';
    
    console.log(`🔄 Restableciendo contraseña para: ${email}`);
    
    const user = await User.findOne({ where: { correo: email } });
    
    if (user) {
      // Asignamos la contraseña en texto plano, el hook del modelo la hasheará
      user.contrasena = newPassword;
      await user.save();
      
      console.log('✅ Contraseña actualizada exitosamente.');
      console.log('🔑 Nueva contraseña actualizada (no mostrarla en entornos públicos).');
      console.log(`👤 Usuario para login: ${user.usuario}`);
    } else {
      console.log('❌ Usuario no encontrado.');
    }
  } catch (error) {
    console.error('❌ Error al restablecer contraseña:', error);
  } finally {
    await sequelize.close();
  }
}

resetPassword();
