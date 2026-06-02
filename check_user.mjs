import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

async function main() {
  const { default: config } = await import('./src/config/config.js');
  const { sequelize } = await import('./src/config/database.js');
  const { default: User } = await import('./src/models/User.js');
  
  const user = await User.findOne({ where: { correo: 'eftcampa@gmail.com' } });
  if(!user) {
    console.log('NO_USER');
    return;
  }
  
  console.log('User:', user.usuario);
  console.log('Activo:', user.activo);
  console.log('Hash:', user.contrasena);
  
  const valid = await user.validarContrasena('Erick123');
  console.log('Valid:', valid);
  process.exit(0);
}
main();
