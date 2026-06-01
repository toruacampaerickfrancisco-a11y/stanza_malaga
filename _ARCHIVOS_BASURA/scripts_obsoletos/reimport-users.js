import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import csv from 'csv-parser';
import { User, Department, Permission, UserPermission } from './src/models/index.js';
import * as permissionService from './src/services/permissionService.js';
import { sequelize } from './src/config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const csvPath = path.resolve(__dirname, 'src/csv/users.csv');

async function reimportUsers() {
  const users = [];
  
  console.log('Reading CSV...');
  await new Promise((resolve, reject) => {
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (row) => {
        users.push(row);
      })
      .on('end', resolve)
      .on('error', reject);
  });

  console.log(`Found ${users.length} users in CSV.`);
  
  const tempPassword = 'Bienestar2025';
  let imported = 0;
  let errors = 0;

  for (const row of users) {
    try {
      const {
        numero_empleado,
        usuario,
        correo,
        dependencia,
        departamento,
        rol,
        cargo,
        area,
        creado_por,
        nombre_completo,
        activo
      } = row;

      // Validar datos mínimos
      if (!usuario || !correo || correo === 'Faltan Datos') continue;

      // Buscar o crear departamento
      let departmentId = null;
      if (departamento && departamento.trim() !== '') {
        const [dept] = await Department.findOrCreate({
          where: { display_name: departamento.trim() },
          defaults: { is_active: true }
        });
        departmentId = dept.id;
      }

      // Crear usuario
      const newUser = await User.create({
        numero_empleado: numero_empleado || null,
        usuario: usuario.trim(),
        correo: correo.trim(),
        contrasena: tempPassword, // El hook beforeCreate lo hasheará
        dependencia: dependencia || null,
        department_id: departmentId,
        rol: (rol || 'usuario').toLowerCase(),
        cargo: cargo || null,
        area: area || null,
        creado_por: creado_por || null,
        nombre_completo: nombre_completo || usuario,
        activo: activo === '1' || activo === 1 || activo === true
      });

      // Asignar permisos por defecto
      try {
        await permissionService.assignDefaultPermissions(newUser, newUser.rol, newUser.id);
      } catch (permErr) {
        console.error(`Error assigning permissions to ${newUser.usuario}:`, permErr.message);
      }

      imported++;
      if (imported % 10 === 0) console.log(`Imported ${imported} users...`);

    } catch (err) {
      console.error(`Error importing user ${row.usuario}:`, err.message);
      errors++;
    }
  }

  console.log(`\nImport finished!`);
  console.log(`Successfully imported: ${imported}`);
  console.log(`Errors: ${errors}`);
  process.exit(0);
}

reimportUsers();
