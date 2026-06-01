import { User, Permission, UserPermission } from './src/models/index.js';
import { v4 as uuidv4 } from 'uuid';

async function createUser() {
  const correo = 'pruebasonora@sonora.gob.mx';
  const contrasena = 'prueba12';
  try {
    let user = await User.findOne({ where: { correo } });
    if (user) {
      console.log('Usuario ya existe:', user.usuario, '=> actualizando contraseña y rol a tecnico');
      await user.update({ contrasena: contrasena, rol: 'tecnico' });
    } else {
      // Crear nuevo usuario con datos mínimos
      const nuevo = {
        id: uuidv4(),
        numero_empleado: `TMP-${Date.now()}`,
        usuario: correo,
        correo,
        contrasena,
        nombre_completo: 'Usuario Prueba Sonora',
        rol: 'tecnico',
        activo: true
      };
      user = await User.create(nuevo);
      console.log('Usuario creado:', user.usuario, user.id);
    }

    // Asignar permiso supplies:view si existe
    const perm = await Permission.findOne({ where: { module: 'supplies', action: 'view' } });
    if (!perm) {
      console.log('No se encontró permiso supplies:view. Ejecuta seed-permissions o crea el permiso manualmente.');
      return;
    }

    // Crear UserPermission si no existe
    const existing = await UserPermission.findOne({ where: { user_id: user.id, permission_id: perm.id } });
    if (existing) {
      console.log('Permiso supplies:view ya asignado al usuario.');
    } else {
      await UserPermission.create({ user_id: user.id, permission_id: perm.id, granted_by_id: user.id, is_active: true });
      console.log('Permiso supplies:view asignado al usuario.');
    }

  } catch (err) {
    console.error('Error creando/actualizando usuario tecnico:', err);
  }
}

createUser();
