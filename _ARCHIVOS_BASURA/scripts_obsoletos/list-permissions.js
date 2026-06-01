
import { Permission, UserPermission } from './src/models/index.js';

async function listPermissions() {
  try {
    const permissions = await Permission.findAll();
    console.log('Permisos disponibles:', permissions.map(p => `${p.module}:${p.action} (ID: ${p.id})`));
  } catch (error) {
    console.error('Error:', error);
  }
}

listPermissions();
