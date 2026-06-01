import { User } from '../../src/models/index.js';

// Script para eliminar todos los usuarios de la base de datos
(async () => {
  try {
    const deleted = await User.destroy({ where: {}, truncate: true });
    console.log(`Usuarios eliminados: ${deleted}`);
  } catch (err) {
    console.error('Error eliminando usuarios:', err);
  }
})();
