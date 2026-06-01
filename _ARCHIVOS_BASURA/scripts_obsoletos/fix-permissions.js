import { User, Permission, UserPermission } from './src/models/index.js';
import { sequelize } from './src/config/database.js';

async function fixPermissions() {
  try {
    const email = 'yesmil.figueroa@sonora.gob.mx';
    console.log(`🔧 Arreglando permisos para: ${email}`);
    
    const user = await User.findOne({ where: { correo: email } });
    
    if (!user) {
      console.log('❌ Usuario no encontrado.');
      return;
    }

    // Obtener todos los permisos de 'view' (lectura)
    const viewPermissions = await Permission.findAll({
      where: {
        action: 'view'
      }
    });

    console.log(`📋 Encontrados ${viewPermissions.length} permisos de lectura.`);

    // Asignar permisos
    for (const perm of viewPermissions) {
      const [up, created] = await UserPermission.findOrCreate({
        where: {
          user_id: user.id,
          permission_id: perm.id
        },
        defaults: {
          granted_by_id: user.id, // Auto-asignado por script
          is_active: true
        }
      });
      
      if (created) {
        console.log(`   + Asignado: ${perm.module}:${perm.action}`);
      } else if (!up.is_active) {
        up.is_active = true;
        await up.save();
        console.log(`   + Reactivado: ${perm.module}:${perm.action}`);
      }
    }
    
    // También asignar permisos básicos de creación de tickets si es necesario
    const ticketCreate = await Permission.findOne({ where: { module: 'tickets', action: 'create' } });
    if (ticketCreate) {
       await UserPermission.findOrCreate({
        where: { user_id: user.id, permission_id: ticketCreate.id },
        defaults: { granted_by_id: user.id, is_active: true }
      });
      console.log(`   + Asignado: tickets:create`);
    }

    console.log('✅ Permisos actualizados correctamente.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
  }
}

fixPermissions();
