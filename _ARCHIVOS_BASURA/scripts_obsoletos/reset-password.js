import { Sequelize } from 'sequelize';
import config from './src/config/config.js';
import User from './src/models/User.js';

// Configurar conexión
const sequelize = new Sequelize(
  config.database.database,
  config.database.username,
  config.database.password,
  {
    host: config.database.host,
    port: config.database.port,
    dialect: 'postgres',
    logging: false
  }
);

async function resetPassword() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a la BD.');

    // Seguridad: requerir confirmación explícita para evitar sobrescribir contraseñas
    const forced = process.argv.includes('--force') || process.env.FORCE === 'true';
    if (!forced) {
      console.log('Operación cancelada: este script sobrescribe la contraseña del admin.');
      console.log('Ejecute con --force o establezca la variable FORCE=true para confirmar.');
      return;
    }

    const user = await User.findOne({ where: { usuario: 'admin' } });
    if (!user) {
      console.log('❌ Usuario admin no encontrado');
      return;
    }

    // El hook beforeUpdate se encargará de hashear la contraseña
    user.contrasena = 'admin123';
    await user.save();

    console.log('✅ Contraseña de admin restablecida a: admin123');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

resetPassword();
