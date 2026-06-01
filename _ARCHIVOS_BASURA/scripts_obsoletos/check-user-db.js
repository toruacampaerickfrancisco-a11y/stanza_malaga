import { User } from './src/models/index.js';
import { sequelize } from './src/config/database.js';

async function checkUser() {
  try {
    const email = 'yesmil.figueroa@sonora.gob.mx';
    console.log(`🔍 Buscando usuario con correo: ${email}`);
    
    const user = await User.findOne({ where: { correo: email } });
    
    if (user) {
      console.log('✅ Usuario encontrado:');
      console.log(`   ID: ${user.id}`);
      console.log(`   Usuario (Username): ${user.usuario}`);
      console.log(`   Correo: ${user.correo}`);
      console.log(`   Rol: ${user.rol}`);
      console.log(`   Activo: ${user.activo}`);
      console.log(`   Hash de contraseña: ${user.contrasena.substring(0, 20)}...`);
    } else {
      console.log('❌ Usuario no encontrado en la base de datos.');
      
      // Listar algunos usuarios para ver qué hay
      const allUsers = await User.findAll({ limit: 5 });
      console.log('\n📋 Primeros 5 usuarios en la base de datos:');
      allUsers.forEach(u => console.log(`   - ${u.usuario} (${u.correo})`));
    }
  } catch (error) {
    console.error('❌ Error al buscar usuario:', error);
  } finally {
    await sequelize.close();
  }
}

checkUser();
