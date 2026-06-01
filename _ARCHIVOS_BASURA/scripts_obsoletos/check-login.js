import { Sequelize } from 'sequelize';
import config from './src/config/config.js';
import User from './src/models/User.js';
import bcrypt from 'bcryptjs';

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

async function checkLogin(username, password) {
  try {
    await sequelize.authenticate();
    console.log(`🔍 Verificando usuario: ${username}`);

    const user = await User.findOne({
      where: {
        [Sequelize.Op.or]: [
          { usuario: username },
          { correo: username }
        ]
      }
    });

    if (!user) {
      console.log('❌ Usuario no encontrado');
      return;
    }

    console.log(`✅ Usuario encontrado: ${user.usuario} (${user.correo})`);
    console.log(`🔑 Hash almacenado: ${user.contrasena}`);
    console.log(`🔑 Contraseña a probar: ${password}`);

    const isValid = await bcrypt.compare(password, user.contrasena);
    
    if (isValid) {
      console.log('✅ ¡Contraseña CORRECTA!');
      try {
        const json = user.toPublicJSON();
        console.log('✅ toPublicJSON() funciona:', JSON.stringify(json, null, 2));
      } catch (err) {
        console.error('❌ Error en toPublicJSON():', err);
      }
    } else {
      console.log('❌ Contraseña INCORRECTA');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

// Probar con el usuario admin y la contraseña que vimos en la BD legacy
checkLogin('admin', 'Sbs2025admgen');
