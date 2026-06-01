import { User } from './src/models/index.js';

async function testLogin() {
  const username = 'pruebasonora@sonora.gob.mx';
  const password = 'prueba12';

  try {
    const Op = User.sequelize.Sequelize.Op;
    const user = await User.findOne({ where: { [Op.or]: [{ usuario: username }, { correo: username }] } });
    if (!user) {
      console.log('Usuario no encontrado para:', username);
      return;
    }
    console.log('Usuario encontrado:', user.usuario, 'activo:', user.activo);
    const ok = await user.validarContrasena(password);
    console.log('Resultado validarContrasena:', ok);
  } catch (err) {
    console.error('Error en test-login-creds:', err);
  }
}

testLogin();
