import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar las variables de entorno de la carpeta backend antes de cargar el config
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function main() {
  const { default: config } = await import('../src/config/config.js');
  const { sequelize } = await import('../src/config/database.js');
  const { default: User } = await import('../src/models/User.js');
  const { v4: uuidv4 } = await import('uuid');

  console.log('Conectando a la base de datos...');
  await sequelize.authenticate();
  console.log('¡Conexión establecida correctamente!');

  const email = 'eftcampa@gmail.com';
  const password = 'Erick123';

  // Buscar si el usuario ya existe
  const existingUser = await User.findOne({ where: { correo: email } });
  
  let user;
  if (existingUser) {
    console.log(`El usuario ${email} ya existe. Actualizando contraseña...`);
    existingUser.contrasena = password; // Se activará el hook beforeUpdate para hashearla
    existingUser.rol = 'admin';
    existingUser.activo = true;
    user = await existingUser.save();
    console.log('¡Usuario actualizado!');
  } else {
    console.log(`Creando el usuario ${email}...`);
    user = await User.create({
      id: uuidv4(),
      usuario: email,
      correo: email,
      contrasena: password, // Se activará el hook beforeCreate para hashearla
      nombre_completo: 'Erick Campa',
      numero_empleado: 'RES000',
      rol: 'admin',
      departamento: 'Administración',
      activo: true
    });
    console.log('¡Usuario creado correctamente!');
  }

  // Darle todos los permisos de la base de datos
  console.log('Asignando todos los permisos disponibles en la base de datos...');
  const queryInterface = sequelize.getQueryInterface();
  const permissions = await sequelize.query(
    "SELECT id FROM permissions;",
    { type: sequelize.QueryTypes.SELECT }
  );

  if (permissions.length > 0) {
    const now = new Date();
    const userPermissions = permissions.map(p => ({
      id: uuidv4(),
      user_id: user.id,
      permission_id: p.id,
      granted_by_id: user.id,
      granted_at: now,
      is_active: true,
      created_at: now,
      updated_at: now
    }));

    // Limpiar permisos existentes de este usuario primero
    await queryInterface.bulkDelete('user_permissions', { user_id: user.id }, {});
    
    // Insertar todos los permisos
    await queryInterface.bulkInsert('user_permissions', userPermissions, {
      ignoreDuplicates: true
    });
    console.log(`¡Se asignaron con éxito ${permissions.length} permisos a ${email}!`);
  } else {
    console.warn('No se encontraron permisos en la tabla permissions para asignar.');
  }

  console.log('Cerrando conexión...');
  await sequelize.close();
  console.log('¡Listo! Proceso completado con éxito.');
}

main().catch(err => {
  console.error('Error al ejecutar el script:', err);
  process.exit(1);
});
