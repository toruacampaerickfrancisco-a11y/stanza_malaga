import { User, Equipment } from '../../src/models/index.js';

async function eliminarTodoExceptoAdmin() {
  try {
    // Buscar el usuario admin por correo
    const admin = await User.findOne({ where: { correo: 'admin@sedesson.gob.mx' } });
    if (!admin) {
      console.error('No se encontró el usuario admin.');
      process.exit(1);
    }

    // Eliminar todos los equipos
    await Equipment.destroy({ where: {}, truncate: true, cascade: true });

    // Eliminar todos los usuarios excepto el admin
    await User.destroy({ where: { id: { [User.sequelize.Sequelize.Op.ne]: admin.id } } });

    console.log('Todos los usuarios (excepto admin) y equipos han sido eliminados.');
    process.exit(0);
  } catch (err) {
    console.error('Error eliminando usuarios y equipos:', err);
    process.exit(1);
  }
}

eliminarTodoExceptoAdmin();