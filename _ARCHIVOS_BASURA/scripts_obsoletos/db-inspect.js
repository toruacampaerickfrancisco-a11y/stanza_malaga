import { User, Equipment, sequelize } from './src/models/index.js';

async function inspect() {
  try {
    console.log('Conectando a la base de datos...');
    await sequelize.authenticate();

    const usersCount = await User.count();
    const equipmentCount = await Equipment.count();

    console.log(`Usuarios: ${usersCount}`);
    console.log(`Equipos: ${equipmentCount}`);

    const recentUsers = await User.findAll({
      limit: 5,
      order: [['created_at', 'DESC']],
      attributes: ['id', 'usuario', 'correo', 'rol', 'activo', 'departamento', 'created_at']
    });

    console.log('\nÚltimos 5 usuarios:');
    recentUsers.forEach(u => console.log(JSON.stringify(u.get({ plain: true }), null, 2)));

    const recentEquip = await Equipment.findAll({
      limit: 5,
      order: [['created_at', 'DESC']],
      attributes: ['id', 'name', 'serial_number', 'type', 'status', 'created_at']
    });

    console.log('\nÚltimos 5 equipos:');
    recentEquip.forEach(e => console.log(JSON.stringify(e.get({ plain: true }), null, 2)));

  } catch (err) {
    console.error('Error inspeccionando la base:', err);
  } finally {
    await sequelize.close();
  }
}

inspect();
