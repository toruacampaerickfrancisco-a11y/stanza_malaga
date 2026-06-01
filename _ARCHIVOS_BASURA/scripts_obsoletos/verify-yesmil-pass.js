import { Sequelize } from 'sequelize';
import bcrypt from 'bcryptjs';

const sequelize = new Sequelize('respaldo-sistema-mantenimiento', 'postgres', 'Bienestar25', {
  host: '127.0.0.1',
  dialect: 'postgres',
  logging: false
});

async function verify() {
  const email = 'yesmil.figueroa@sonora.gob.mx';
  const passwords = [
    'Sbs2025admgen', 
    'Bienestar25', 
    'Yesmil25', 
    'Bienestar2025', 
    'TempPass2025', 
    'Yes25', 
    'password123',
    'Temporal123',
    'Erick1093',
    'admin123',
    'prueba12'
  ];

  try {
    await sequelize.authenticate();
    console.log('Conexion a BD exitosa.');

    const [users] = await sequelize.query(`SELECT * FROM users WHERE correo = '${email}'`);
    const user = users[0];

    if (!user) {
      console.log('Usuario no encontrado.');
      return;
    }

    console.log('Usuario encontrado: ' + user.usuario);
    console.log('Hash en DB: ' + user.contrasena);

    for (const pass of passwords) {
      const match = await bcrypt.compare(pass, user.contrasena);
      if (match) {
        console.log('CONTRASE�A ENCONTRADA: ' + pass);
        return;
      } else {
        console.log(pass + ' no coincide.');
      }
    }
    console.log('Ninguna de las contrase�as probadas coincide.');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

verify();
