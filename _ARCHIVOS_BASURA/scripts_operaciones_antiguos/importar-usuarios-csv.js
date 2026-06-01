import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { User, Permission, UserPermission } from '../../src/models/index.js';
import { Op } from 'sequelize';

// ATENCIÓN: Este script importa usuarios desde src/csv/users.csv (base de datos original)
const csvPath = path.resolve('src/csv/users.csv');

async function importarUsuariosDesdeCSV() {
  const usuarios = [];
  // Leer el CSV y cargar usuarios en memoria
  await new Promise((resolve, reject) => {
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (row) => {
        usuarios.push(row);
      })
      .on('end', resolve)
      .on('error', reject);
  });

  let importados = 0;
  let omitidos = 0;
  const omitidosDetalle = [];
  const bcrypt = (await import('bcryptjs')).default;
  for (const row of usuarios) {
    // Ajusta los nombres de columna según tu CSV
    const {
      numero_empleado,
      usuario,
      correo,
      contrasena,
      dependencia,
      departamento,
      rol,
      cargo,
      area,
      creado_por,
      nombre_completo,
      activo,
      ultimo_acceso,
      foto_perfil
    } = row;

    // Validar datos mínimos
    if (!usuario || !correo || !contrasena) {
      omitidos++;
      omitidosDetalle.push({ usuario, correo, motivo: 'Faltan datos obligatorios (usuario, correo o contraseña)' });
      continue;
    }
    // Validar formato de correo
    const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if (!emailRegex.test(correo)) {
      omitidos++;
      omitidosDetalle.push({ usuario, correo, motivo: 'Correo no válido' });
      continue;
    }
    // Validar longitud de contraseña
    if (contrasena.length < 6) {
      omitidos++;
      omitidosDetalle.push({ usuario, correo, motivo: 'Contraseña menor a 6 caracteres' });
      continue;
    }
    // Buscar si ya existe el usuario por correo o usuario
    const existe = await User.findOne({
      where: {
        [User.sequelize.Sequelize.Op.or]: [
          { usuario },
          { correo }
        ]
      }
    });
    if (existe) {
      omitidos++;
      omitidosDetalle.push({ usuario, correo, motivo: 'Usuario o correo ya existe en la base de datos' });
      continue;
    }
    try {
      // Guardar la contraseña en texto plano, el modelo la hasheará automáticamente
      const newUser = await User.create({
        numero_empleado,
        usuario,
        correo,
        contrasena,
        dependencia,
        departamento,
        rol,
        cargo,
        area,
        creado_por,
        nombre_completo,
        activo: activo === '1' || activo === 1,
        ultimo_acceso: ultimo_acceso || null,
        foto_perfil
      });

      // Asignar permisos por defecto
      await assignDefaultPermissions(newUser, rol, newUser.id);

      importados++;
    } catch (err) {
      omitidos++;
      omitidosDetalle.push({ usuario, correo, motivo: 'Error al crear usuario: ' + (err.message || err) });
    }
  }
  
  if (omitidosDetalle.length > 0) {
    console.log('Detalle de usuarios omitidos:');
    omitidosDetalle.forEach(u => {
      console.log(`Usuario: ${u.usuario || '-'} | Correo: ${u.correo || '-'} | Motivo: ${u.motivo}`);
    });
  }
}

// Helper para asignar permisos por defecto (copiado de userController)
async function assignDefaultPermissions(user, role, grantedById) {
  const rolePermissions = {
    'admin': 'ALL',
    'tecnico': [
      { module: 'dashboard', actions: ['view'] },
      { module: 'users', actions: ['view'] },
      { module: 'equipment', actions: ['view', 'create', 'edit'] },
      { module: 'tickets', actions: ['view', 'create', 'edit'] },
      { module: 'reports', actions: ['view', 'export'] },
      { module: 'supplies', actions: ['view', 'create', 'edit'] }
    ],
    'inventario': [
      { module: 'users', actions: ['view'] },
      { module: 'equipment', actions: ['view', 'create', 'edit', 'delete'] },
      { module: 'tickets', actions: ['view', 'create'] },
      { module: 'supplies', actions: ['view', 'create', 'edit'] }
    ],
    'usuario': [
      { module: 'tickets', actions: ['view', 'create'] }
    ]
  };

  const normalizedRole = (role || '').toLowerCase().trim();
  const permissionsToAssign = rolePermissions[normalizedRole] || rolePermissions['usuario'];

  if (permissionsToAssign === 'ALL') {
    const allPermissions = await Permission.findAll();
    for (const perm of allPermissions) {
      await UserPermission.findOrCreate({
        where: { user_id: user.id, permission_id: perm.id },
        defaults: { granted_by_id: grantedById, is_active: true }
      });
    }
  } else {
    for (const p of permissionsToAssign) {
      const perms = await Permission.findAll({
        where: {
          module: p.module,
          action: { [Op.in]: p.actions }
        }
      });
      for (const perm of perms) {
        await UserPermission.findOrCreate({
          where: { user_id: user.id, permission_id: perm.id },
          defaults: { granted_by_id: grantedById, is_active: true }
        });
      }
    }
  }
}

// Ejecutar siempre que se invoque el script
importarUsuariosDesdeCSV();


// Ejecutar siempre que se invoque el script
importarUsuariosDesdeCSV();
