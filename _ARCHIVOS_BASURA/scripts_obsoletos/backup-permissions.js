import fs from 'fs';
import path from 'path';
import { Permission } from './src/models/index.js';

async function backupPermissions() {
  try {
    const perms = await Permission.findAll({ raw: true });
    const out = {
      created_at: new Date().toISOString(),
      count: perms.length,
      data: perms
    };
    const filename = path.resolve(process.cwd(), `permissions_backup_${Date.now()}.json`);
    fs.writeFileSync(filename, JSON.stringify(out, null, 2), 'utf8');
    console.log('Backup creado en:', filename);
  } catch (err) {
    console.error('Error creando backup de permissions:', err);
    process.exit(1);
  }
}

backupPermissions();
