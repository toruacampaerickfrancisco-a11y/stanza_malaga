import { User, UserPermission, Permission, sequelize } from './src/models/index.js';

async function verifyTecnicoPermissions() {
  try {
    await sequelize.authenticate();
    console.log('Conectado a la base de datos.');

    // Buscar un usuario con rol 'tecnico'
    const tecnicoUser = await User.findOne({
      where: { rol: 'tecnico', activo: true },
      include: [
        {
          model: UserPermission,
          as: 'permisos',
          include: [
            {
              model: Permission,
              as: 'permission'
            }
          ]
        }
      ]
    });

    if (!tecnicoUser) {
      console.log('No se encontró ningún usuario activo con rol "tecnico".');
      return;
    }

    console.log(`\nVerificando permisos para el usuario: ${tecnicoUser.usuario} (Rol: ${tecnicoUser.rol})`);
    console.log('---------------------------------------------------');

    if (!tecnicoUser.permisos || tecnicoUser.permisos.length === 0) {
      console.log('❌ El usuario no tiene permisos asignados.');
    } else {
      console.log(`✅ Total de permisos asignados: ${tecnicoUser.permisos.length}`);
      
      // Agrupar por módulo para mejor visualización
      const permissionsByModule = {};
      tecnicoUser.permisos.forEach(up => {
        if (up.permission) {
          const module = up.permission.module;
          if (!permissionsByModule[module]) {
            permissionsByModule[module] = [];
          }
          permissionsByModule[module].push(up.permission.action);
        }
      });

      Object.keys(permissionsByModule).forEach(module => {
        console.log(`   - ${module.toUpperCase()}: ${permissionsByModule[module].join(', ')}`);
      });
    }
    console.log('---------------------------------------------------');

  } catch (error) {
    console.error('Error al verificar permisos:', error);
  } finally {
    await sequelize.close();
  }
}

verifyTecnicoPermissions();
