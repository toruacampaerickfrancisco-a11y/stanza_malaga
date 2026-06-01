import { User, Permission, UserPermission } from './src/models/index.js';
import { sequelize } from './src/config/database.js';
import bcrypt from 'bcryptjs';

async function setupTechnician() {
  try {
    const email = 'erick.torua@sedesson.gob.mx';
    console.log(`🔧 Configurando técnico: ${email}`);
    
    const user = await User.findOne({ where: { correo: email } });
    
    if (!user) {
      console.log('❌ Usuario no encontrado.');
      return;
    }

    // 1. Reset Password
    const newPassword = 'Bienestar2025';
    // No hasheamos manualmente porque el hook beforeUpdate del modelo User lo hará automáticamente
    user.contrasena = newPassword;
    
    // 2. Update Role
    user.rol = 'tecnico';
    await user.save();
    console.log(`✅ Contraseña restablecida a: ${newPassword}`);
    console.log(`✅ Rol actualizado a: tecnico`);

    // 3. Reset Permissions
    // Deactivate all current permissions
    await UserPermission.update({ is_active: false }, {
      where: { user_id: user.id }
    });
    console.log('🧹 Permisos anteriores revocados.');

    // 4. Assign Technician Permissions
    const technicianPermissions = [
      { module: 'dashboard', action: 'view' },
      { module: 'tickets', action: 'view' },
      { module: 'tickets', action: 'create' },
      { module: 'tickets', action: 'edit' }, // Technicians need to edit tickets to resolve them
      { module: 'equipment', action: 'view' },
      { module: 'equipment', action: 'edit' }, // Technicians might update equipment status
      { module: 'users', action: 'view' }, // To see info
      { module: 'profile', action: 'view' },
      { module: 'profile', action: 'edit' },
      { module: 'reports', action: 'view' }
    ];

    for (const p of technicianPermissions) {
      const perm = await Permission.findOne({ 
        where: { module: p.module, action: p.action } 
      });

      if (perm) {
        const [up, created] = await UserPermission.findOrCreate({
          where: {
            user_id: user.id,
            permission_id: perm.id
          },
          defaults: {
            granted_by_id: user.id,
            is_active: true
          }
        });

        if (!created && !up.is_active) {
          up.is_active = true;
          await up.save();
        }
        console.log(`   + Asignado: ${p.module}:${p.action}`);
      } else {
        console.log(`   ⚠️ Permiso no encontrado en DB: ${p.module}:${p.action}`);
      }
    }

    console.log('✅ Configuración de técnico completada.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
  }
}

setupTechnician();
