import { User, Permission, UserPermission } from './src/models/index.js';
import { syncDatabase } from './src/config/database.js';
import { v4 as uuidv4 } from 'uuid';

async function createAdmin() {
  const correo = 'admin@bienestar.gob.mx';
  const contrasena = 'Admin123';
  
  try {
    console.log('Sincronizando base de datos...');
    await syncDatabase(false);

    const userCount = await User.count();
    const permCount = await Permission.count();
    console.log(`Usuarios existentes: ${userCount}`);
    console.log(`Permisos existentes: ${permCount}`);

    console.log('Iniciando creación de administrador...');
    
    let user = await User.findOne({ where: { correo } });
    
    if (user) {
      console.log('El usuario ya existe. Actualizando contraseña y rol...');
      await user.update({ 
        contrasena: contrasena, 
        rol: 'admin',
        activo: true 
      });
    } else {
      console.log('Creando nuevo usuario administrador...');
      user = await User.create({
        id: uuidv4(),
        numero_empleado: 'ADMIN-001',
        usuario: 'admin',
        correo: correo,
        contrasena: contrasena,
        nombre_completo: 'Administrador del Sistema',
        rol: 'admin',
        activo: true
      });
    }
    
    console.log(`Usuario: ${correo}`);
    console.log(`Contraseña: ${contrasena}`);
    console.log('ID:', user.id);

    // Asignar todos los permisos disponibles
    console.log('Asignando permisos...');
    const allPermissions = await Permission.findAll();
    
    if (allPermissions.length === 0) {
        console.log('⚠️ No se encontraron permisos en la base de datos. Asegúrate de ejecutar los seeders.');
    }

    for (const perm of allPermissions) {
      const existing = await UserPermission.findOne({ 
        where: { user_id: user.id, permission_id: perm.id } 
      });
      
      if (!existing) {
        await UserPermission.create({
          user_id: user.id,
          permission_id: perm.id,
          granted_by_id: user.id,
          is_active: true
        });
      }
    }
    
    console.log(`✅ Se asignaron ${allPermissions.length} permisos al administrador.`);
    console.log('¡Proceso completado exitosamente!');

  } catch (err) {
    console.error('❌ Error al crear administrador:', err);
  }
}

createAdmin();
