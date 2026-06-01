import { User } from '../../src/models/index.js';

async function actualizarContrasenaAdmin(password, email) {
  if (!password) {
    console.error('Error: se requiere la nueva contraseña como argumento o mediante la variable de entorno ADMIN_PASSWORD');
    process.exit(1);
  }

  let admin = null;
  if (email) {
    admin = await User.findOne({ where: { correo: email } });
    if (!admin) {
      admin = await User.findOne({ where: { usuario: email } });
    }
  }

  // Si no se pasa email, intentar detectar el admin por usuario/rol
  if (!admin) {
    admin = await User.findOne({ where: { usuario: 'admin' } });
  }
  if (!admin) {
    // intentar buscar por rol comúnmente usado
    try {
      admin = await User.findOne({ where: { rol: 'admin' } });
    } catch (e) {}
  }

  if (!admin) {
    console.error('Usuario admin no encontrado. Pase un email con el que exista el admin, por ejemplo: node hash-admin-password.js <password> <email>');
    return;
  }

  console.log('Actualizando contraseña para:', admin.correo || admin.usuario || admin.id);
  // Evitar doble-hashing: asignar la contraseña en texto y permitir que el hook beforeUpdate la hashee
  admin.contrasena = password;
  await admin.save();
  console.log('Contraseña de admin actualizada y hasheada correctamente.');
}

const pwd = process.argv[2] || process.env.ADMIN_PASSWORD;
const emailArg = process.argv[3] || process.env.ADMIN_EMAIL;

actualizarContrasenaAdmin(pwd, emailArg)
  .then(() => process.exit(0))
  .catch(err => { console.error(err); process.exit(1); });
