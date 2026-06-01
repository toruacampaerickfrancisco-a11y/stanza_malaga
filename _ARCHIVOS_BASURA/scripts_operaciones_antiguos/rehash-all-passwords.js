import bcrypt from 'bcryptjs';
import { User } from '../../src/models/index.js';

function isBcryptHash(value) {
  return typeof value === 'string' && /^\$2[aby]?\$\d{2}\$[./A-Za-z0-9]{53}$/.test(value);
}

async function rehashAll() {
  const users = await User.findAll();
  let updated = 0;
  for (const u of users) {
    try {
      if (!isBcryptHash(u.contrasena)) {
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(u.contrasena || 'usuario123', salt);
        await u.update({ contrasena: hash });
        updated++;
        console.log(`Hasheada contraseña de: ${u.usuario || u.correo || u.id}`);
      }
    } catch (e) {
      console.error(`Error hasheando usuario ${u.id}:`, e.message);
    }
  }
  console.log(`Listo. Contraseñas actualizadas: ${updated}/${users.length}`);
}

rehashAll().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
