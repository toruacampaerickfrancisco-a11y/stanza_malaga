import { User } from './src/models/index.js';
import { sequelize } from './src/config/database.js';

async function verify() {
  try {
    const email = 'admin@bienestar.gob.mx';
    const password = 'Admin123';

    console.log(`Verificando usuario: ${email}`);
    const user = await User.findOne({ where: { correo: email } });

    if (!user) {
      console.log('❌ Usuario no encontrado');
      return;
    }

    console.log('✅ Usuario encontrado:', user.usuario);
    console.log('Hash en DB:', user.contrasena);

    const isValid = await user.validarContrasena(password);
    console.log(`Validando contraseña '${password}'...`);
    
    if (isValid) {
      console.log('✅ Contraseña CORRECTA');
    } else {
      console.log('❌ Contraseña INCORRECTA');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

verify();
