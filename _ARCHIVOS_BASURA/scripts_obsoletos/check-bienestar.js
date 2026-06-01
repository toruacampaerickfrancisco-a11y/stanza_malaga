import { User, UserPermission, Permission } from './src/models/index.js';

async function checkBienestar() {
  try {
    const user = await User.findOne({ where: { usuario: 'bienestar' } });
    if (!user) {
      console.log('Usuario bienestar no encontrado');
      return;
    }
    console.log(`Usuario: ${user.usuario}`);
    console.log(`Rol: ${user.rol}`);
    console.log(`ID: ${user.id}`);
    
    const perms = await UserPermission.findAll({ where: { user_id: user.id } });
    console.log(`Permisos actuales: ${perms.length}`);
  } catch (error) {
    console.error(error);
  } finally {
    process.exit();
  }
}

checkBienestar();
