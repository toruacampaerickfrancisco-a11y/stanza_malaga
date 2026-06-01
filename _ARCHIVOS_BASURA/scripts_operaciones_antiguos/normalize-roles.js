   import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Cargar .env desde la raíz del backend (dos niveles arriba de scripts/)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { User } from '../../src/models/index.js';

async function normalizeRoles() {
  try {
    console.log('Iniciando normalización de roles en la base de datos...');

    const users = await User.findAll();
    let count = 0;

    for (const user of users) {
      if (user.rol) {
        const originalRole = user.rol;
        // Normalizar: minúsculas, trim, quitar acentos
        const normalizedRole = originalRole
          .toLowerCase()
          .trim()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");

        // Si el rol actual es diferente al normalizado (ej: "Técnico" vs "tecnico")
        if (originalRole !== normalizedRole) {
          console.log(`Actualizando usuario ${user.usuario} (${user.correo}): "${originalRole}" -> "${normalizedRole}"`);
          user.rol = normalizedRole;
          await user.save();
          count++;
        }
      }
    }

    console.log(`\nNormalización completada.`);
    console.log(`Total de usuarios actualizados: ${count}`);
    
    // Salir explícitamente para cerrar conexiones
    process.exit(0);
  } catch (error) {
    console.error('Error al normalizar roles:', error);
    process.exit(1);
  }
}

normalizeRoles();
