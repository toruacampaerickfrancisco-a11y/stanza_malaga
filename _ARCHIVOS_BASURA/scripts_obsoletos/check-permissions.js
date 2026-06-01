import { User, UserPermission, Permission } from './src/models/index.js';
import { sequelize } from './src/config/database.js';

async function checkPermissions() {
  try {
    const email = 'yesmil.figueroa@sonora.gob.mx';
    console.log(`🔍 Verificando permisos para: ${email}`);
    
    const user = await User.findOne({ 
      where: { correo: email },
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
    
    if (user) {
      console.log(`👤 Usuario: ${user.usuario} (${user.rol})`);
      if (user.permisos && user.permisos.length > 0) {
        console.log('✅ Permisos asignados:');
        user.permisos.forEach(up => {
          if (up.permission) {
            console.log(`   - ${up.permission.module}:${up.permission.action} (${up.permission.description})`);
          }
        });
      } else {
        console.log('⚠️ El usuario NO tiene permisos asignados.');
      }
    } else {
      console.log('❌ Usuario no encontrado.');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
  }
}

checkPermissions();
