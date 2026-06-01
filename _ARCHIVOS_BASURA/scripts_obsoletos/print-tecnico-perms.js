import { User, UserPermission, Permission } from './src/models/index.js';

async function printTecnicoPermissions() {
  try {
    // Buscar un usuario con rol 'tecnico'
    let user = await User.findOne({
      where: { rol: 'tecnico' },
      include: [
        {
          model: UserPermission,
          as: 'permisos',
          include: [{ model: Permission, as: 'permission' }]
        }
      ]
    });

    if (!user) {
      // Intentar mayúsculas/minúsculas variantes
      user = await User.findOne({ where: { rol: 'Tecnico' }, include: [ { model: UserPermission, as: 'permisos', include: [{ model: Permission, as: 'permission' }] } ] });
    }

    if (!user) {
      console.log('No se encontró un usuario con rol "tecnico".');
      return;
    }

    console.log(`Usuario encontrado: ${user.usuario} (id: ${user.id}, rol: ${user.rol})`);

    const permisos = (user.permisos || []).filter(p => p.is_active && (!p.expires_at || new Date(p.expires_at) > new Date()));
    console.log(`Permisos activos encontrados: ${permisos.length}`);

    permisos.forEach(p => {
      const perm = p.permission || {};
      console.log(`- ${perm.module || '?'}:${perm.action || '?'} (perm id: ${perm.id || '?'}, active: ${perm.is_active})`);
    });

  } catch (error) {
    console.error('Error al obtener permisos del tecnico:', error);
  }
}

printTecnicoPermissions();
