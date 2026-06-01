
import { User, UserPermission } from './src/models/index.js';

async function assignPermissions() {
  try {
    const userId = '6f81d18c-7af1-48f9-aaec-c5b4899d5c68'; // ID de RASCON PAREDES ALBA LUZ
    
    // IDs de permisos básicos para un usuario normal
    const permissionIds = [
      'd7261827-6f80-4fbf-93d6-e1a7bf9a1aaf', // dashboard:view
      'd0a62fa8-7b76-4a90-b926-9ce2458c326f', // tickets:view
      '1ac37269-46ec-4ce2-87c1-381fbd43e700', // tickets:create
      '2a2b07a7-6246-4cff-8043-05f65018baee', // profile:view
      '86e2a77f-3ee8-469b-8227-c1d984fb6f23'  // profile:edit
    ];

    console.log(`Asignando ${permissionIds.length} permisos al usuario...`);

    for (const permId of permissionIds) {
      const [up, created] = await UserPermission.findOrCreate({
        where: {
          user_id: userId,
          permission_id: permId
        },
        defaults: {
          granted_by_id: userId, // Auto-asignado por script
          is_active: true
        }
      });

      if (created) {
        console.log(`Permiso ${permId} asignado.`);
      } else {
        console.log(`Permiso ${permId} ya existía.`);
        if (!up.is_active) {
            up.is_active = true;
            await up.save();
            console.log(`Permiso ${permId} reactivado.`);
        }
      }
    }

    console.log('Proceso completado.');

  } catch (error) {
    console.error('Error al asignar permisos:', error);
  }
}

assignPermissions();
