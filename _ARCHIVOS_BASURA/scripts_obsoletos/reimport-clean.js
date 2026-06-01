import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { User, Equipment, Ticket, Permission, UserPermission, sequelize } from './src/models/index.js';
import bcrypt from 'bcryptjs';

const USERS_CSV = path.resolve('src/csv/users_valid.csv');
const EQUIP_CSV = path.resolve('src/csv/equipment.csv');
const TEMP_PASSWORD = 'Bienestar2025';

async function reimport() {
  try {
    console.log('🚀 Iniciando re-importación limpia...');

    // 1. Truncar tablas
    console.log('🧹 Truncando tablas...');
    await sequelize.query('TRUNCATE TABLE "user_permissions" RESTART IDENTITY CASCADE;');
    await sequelize.query('TRUNCATE TABLE "users" RESTART IDENTITY CASCADE;');
    await sequelize.query('TRUNCATE TABLE "equipment" RESTART IDENTITY CASCADE;');
    await sequelize.query('TRUNCATE TABLE "tickets" RESTART IDENTITY CASCADE;');
    await sequelize.query('TRUNCATE TABLE "ticket_comments" RESTART IDENTITY CASCADE;');

    // 2. Importar Usuarios
    console.log(`👥 Importando usuarios desde ${USERS_CSV}...`);
    const users = [];
    if (fs.existsSync(USERS_CSV)) {
      await new Promise((resolve) => {
        fs.createReadStream(USERS_CSV)
          .pipe(csv())
          .on('data', (data) => users.push(data))
          .on('end', resolve);
      });

      const hashedPass = await bcrypt.hash(TEMP_PASSWORD, 10);
      let userCount = 0;

      for (const u of users) {
        try {
          await User.create({
            numero_empleado: u.numero_empleado || `EMP-${Date.now()}-${userCount}`,
            usuario: u.usuario,
            correo: u.correo,
            contrasena: hashedPass, // Usar contraseña temporal para TODOS
            nombre_completo: u.nombre_completo || u.usuario,
            rol: u.rol || 'usuario',
            dependencia: u.dependencia,
            departamento: u.departamento,
            cargo: u.cargo,
            area: u.area,
            activo: true
          });
          userCount++;
        } catch (err) {
          console.error(`❌ Error al crear usuario ${u.usuario}:`, err.message);
        }
      }
      console.log(`✅ ${userCount} usuarios importados con contraseña: ${TEMP_PASSWORD}`);
    } else {
      console.error('❌ No se encontró el archivo de usuarios.');
    }

    // 3. Importar Equipos (opcional, si el usuario quiere todo de nuevo)
    console.log(`💻 Importando equipos desde ${EQUIP_CSV}...`);
    if (fs.existsSync(EQUIP_CSV)) {
      const equipment = [];
      await new Promise((resolve) => {
        fs.createReadStream(EQUIP_CSV)
          .pipe(csv())
          .on('data', (data) => equipment.push(data))
          .on('end', resolve);
      });

      let equipCount = 0;
      for (const e of equipment) {
        try {
          await Equipment.create({
            codigo_inventario: e.codigo_inventario,
            tipo_equipo: e.tipo_equipo,
            marca: e.marca,
            modelo: e.modelo,
            serie: e.serie,
            estado: e.estado || 'activo',
            ubicacion: e.ubicacion,
            responsable: e.responsable
          });
          equipCount++;
        } catch (err) {
          // Ignorar errores de duplicados o campos faltantes
        }
      }
      console.log(`✅ ${equipCount} equipos importados.`);
    }

    console.log('✨ Proceso finalizado con éxito.');
    process.exit(0);
  } catch (error) {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  }
}

reimport();
