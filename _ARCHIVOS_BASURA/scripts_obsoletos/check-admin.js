import { User, sequelize } from './src/models/index.js';

async function showAdmin() {
  try {
    await sequelize.authenticate();
    const admin = await User.findOne({ where: { correo: 'admin@sedesson.gob.mx' }, attributes: ['id','correo','usuario','created_at','updated_at'] });
    if (!admin) {
      console.log('Admin no encontrado');
    } else {
      console.log(JSON.stringify(admin.get({ plain: true }), null, 2));
    }
  } catch (err) {
    console.error('Error verificando admin:', err);
  } finally {
    await sequelize.close();
  }
}

showAdmin();
