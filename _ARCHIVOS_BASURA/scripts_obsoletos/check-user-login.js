import { User } from './src/models/index.js';
import { sequelize } from './src/config/database.js';
import bcrypt from 'bcryptjs';

async function checkUser() {
  try {
    const email = 'yesmil.figueroa@sonora.gob.mx';
    console.log(`Checking user: ${email}`);
    
    const user = await User.findOne({
      where: {
        correo: email
      }
    });

    if (!user) {
      console.log('User NOT FOUND in database.');
    } else {
      console.log('User FOUND:');
      console.log(`ID: ${user.id}`);
      console.log(`Username: ${user.usuario}`);
      console.log(`Email: ${user.correo}`);
      console.log(`Active: ${user.activo}`);
      console.log(`Password Hash: ${user.contrasena}`);
      
      const isHash = user.contrasena && (user.contrasena.startsWith('$2a$') || user.contrasena.startsWith('$2b$'));
      console.log(`Password looks like bcrypt hash: ${isHash}`);

      // Compare with provided password for quick check
      const provided = 'Yesmil25';
      const match = bcrypt.compareSync(provided, user.contrasena || '');
      console.log(`Password match for '${provided}': ${match}`);
    }

  } catch (error) {
    console.error('Error checking user:', error);
  } finally {
    await sequelize.close();
  }
}

checkUser();
