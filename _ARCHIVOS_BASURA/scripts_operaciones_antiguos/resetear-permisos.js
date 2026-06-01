import { Permission } from '../../src/models/index.js';

async function resetearPermisos() {
  try {
    // Vaciar la tabla de permisos
    await Permission.destroy({ where: {}, truncate: true, cascade: true });
    console.log('Tabla permissions vaciada.');
    process.exit(0);
  } catch (err) {
    console.error('Error al vaciar la tabla permissions:', err);
    process.exit(1);
  }
}

resetearPermisos();
