import { User, Permission, UserPermission } from './src/models/index.js';
import { sequelize } from './src/config/database.js';

async function checkUserAndPermissions() {
  try {
    const email = 'erick.torua@sedesson.gob.mx';
    console.log(`🔍 Buscando usuario: ${email}`);
    
    const user = await User.findOne({ where: { correo: email } });
    
    if (!user) {
      console.log('❌ Usuario no encontrado.');
      return;
    }

    console.log(`✅ Usuario encontrado: ${user.nombre_completo} (ID: ${user.id})`);
    console.log(`   Rol actual: ${user.rol}`);
    console.log(`   Activo: ${user.activo}`);

    const permissions = await UserPermission.findAll({
      where: { user_id: user.id, is_active: true },
      include: [{ model: Permission, as: 'permission' }]
    });

    console.log(`📋 Permisos actuales (${permissions.length}):`);
    permissions.forEach(p => {
      if (p.permission) {
        console.log(`   - ${p.permission.module}:${p.permission.action}`);
      }
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
  }
}

checkUserAndPermissions();
