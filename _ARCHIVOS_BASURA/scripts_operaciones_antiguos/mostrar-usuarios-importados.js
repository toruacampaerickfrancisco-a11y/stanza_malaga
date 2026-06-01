import { User } from '../../src/models/index.js';

async function mostrarUsuariosImportados() {
  const users = await User.findAll({
    attributes: ['id', 'usuario', 'correo', 'rol', 'activo', 'createdAt']
  });
  console.table(users.map(u => u.toJSON()));
  console.log(`Total de usuarios importados: ${users.length}`);
}

mostrarUsuariosImportados()
  .then(() => process.exit(0))
  .catch(err => { console.error(err); process.exit(1); });
