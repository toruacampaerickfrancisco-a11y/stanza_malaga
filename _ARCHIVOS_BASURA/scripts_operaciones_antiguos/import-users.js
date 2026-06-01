// Script para importar usuarios desde CSV a la base de datos
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import csv from 'csv-parser';
import bcrypt from 'bcryptjs';
import { User, Permission, UserPermission } from '../../src/models/index.js';
import userController from '../controllers/userController.js';
import { Op } from 'sequelize';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const csvPath = path.resolve(__dirname, '../csv/users.csv');

async function importUsers() {
  const users = [];
  return new Promise((resolve, reject) => {
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (row) => {
        users.push(row);
      })
      .on('end', async () => {
        const noImportados = [];
        try {
          for (const row of users) {
            try {
              // Función para generar valores únicos
              const unique = () => `${Date.now()}${Math.floor(Math.random()*10000)}`;

              // nombre_completo: mínimo 2 caracteres, obligatorio (si no existe, usar usuario o correo)
              let nombre_completo = row.nombre_completo && row.nombre_completo.trim().length >= 2
                ? row.nombre_completo.trim()
                : (row.usuario && row.usuario.trim().length >= 2
                    ? row.usuario.trim()
                    : (row.correo && row.correo.trim().length >= 2
                        ? row.correo.trim()
                        : `Usuario_${unique()}`));

              // numero_empleado: opcional, si viene vacío se deja null
              let numero_empleado = row.numero_empleado && row.numero_empleado.trim() !== '' ? row.numero_empleado.trim() : null;

              // departamento: obligatorio
              let departamento = row.departamento && row.departamento.trim().length > 0 ? row.departamento.trim() : `Departamento_${unique()}`;

              // correo: obligatorio, único, formato válido
              function isValidEmail(correo) {
                return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo);
              }
              let correo = row.correo && isValidEmail(row.correo.trim()) ? row.correo.trim() : `user${unique()}@example.com`;

              // usuario: obligatorio, único, 3-50 caracteres
              let usuario = row.usuario && row.usuario.trim().length >= 3 ? row.usuario.trim() : correo.split('@')[0];
              if (usuario.length < 3) usuario = `user_${unique()}`;
              if (usuario.length > 50) usuario = usuario.slice(0, 50);

              // contrasena: obligatorio, mínimo 6 caracteres (sin eñe, como en el CSV)
              let rawPassword = row['contrasena'] || '';
              if (!rawPassword || rawPassword.length < 6 || rawPassword === 'Faltan Datos') rawPassword = 'usuario123';
              let contrasena = await bcrypt.hash(rawPassword, 10);

              // rol: obligatorio, debe ser uno de los permitidos
              let rol = row.rol && ['admin','tecnico','usuario','user'].includes(row.rol.toLowerCase()) ? row.rol.toLowerCase() : 'usuario';

              // Los demás pueden ir vacíos
              let dependencia = row.dependencia || '';
              let cargo = row.cargo || '';
              let area = row.area || '';
              let creado_por = row.creado_por || '';

              let created = false;
              let intentos = 0;
              while (!created && intentos < 10) {
                try {
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
                    activo: true
                  });
                  
                  // Asignar permisos por defecto (usar helper centralizado en el controller)
                  try {
                    await userController.assignDefaultPermissions(newUser, rol, newUser.id);
                  } catch (permErr) {
                    console.error('Error asignando permisos por defecto a usuario importado:', newUser.usuario, permErr);
                  }

                  console.log(`Usuario importado: ${usuario} (${correo})`);
                  created = true;
                } catch (err) {
                  // Si el error es por duplicado o formato, regenerar los campos únicos
                  intentos++;
                  usuario = `user_${unique()}`;
                  correo = `user${unique()}@example.com`;
                  // Si numero_empleado era null, sigue siendo null. Si tenía valor y falló, quizás sea duplicado, pero aquí la lógica original regeneraba.
                  // Si era null, no debería causar conflicto de unique a menos que la DB no soporte multiples nulls (Postgres sí soporta).
                  // Mantenemos la lógica de regenerar solo si tenía valor original o si queremos forzar uno nuevo.
                  // Para simplificar, si falló, intentamos sin numero_empleado si es que eso fue el problema, o regeneramos si era un valor.
                  if (numero_empleado) numero_empleado = `EMP${unique()}`; 
                  
                  if (intentos >= 10) {
                    noImportados.push({ motivo: 'No se pudo importar tras varios intentos', datos: row, error: err.message, errorFull: err });
                  }
                }
              }
            } catch (err) {
              noImportados.push({ motivo: 'Error inesperado', datos: row, error: err.message });
            }
          }
          // Mostrar resumen de no importados
          if (noImportados.length > 0) {
            console.log('\nResumen de registros NO importados:');
            noImportados.forEach((item, idx) => {
              console.log(`#${idx + 1}: Motivo: ${item.motivo}\nDatos: ${JSON.stringify(item.datos)}`);
              if (item.error) {
                console.log(`Error: ${item.error}`);
              }
              if (item.errorFull && item.errorFull.errors) {
                item.errorFull.errors.forEach((e, i) => {
                  console.log(`  [${i}] SequelizeError: ${e.message}`);
                });
              }
            });
          }
          console.log('Importación de usuarios finalizada.');
          resolve();
        } catch (err) {
          console.error('Error global en importación:', err);
          reject(err);
        }
      });
  });
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

importUsers().catch((err) => {
  console.error('Error general:', err);
  process.exit(1);
});
