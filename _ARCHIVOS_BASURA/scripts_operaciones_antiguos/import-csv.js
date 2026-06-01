import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { sequelize, User, Equipment, Ticket } from '../../src/models/index.js';

async function importCSV(model, filePath, mapFn) {
  return new Promise((resolve, reject) => {
    const results = [];
    const seenEmails = new Set();
    const skipped = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => {
        const mapped = mapFn(data);
        const correo = mapped.correo && mapped.correo.trim();
        if (!correo || correo === 'Faltan Datos' || seenEmails.has(correo)) {
          skipped.push({ ...mapped, motivo: !correo || correo === 'Faltan Datos' ? 'Correo inválido' : 'Correo duplicado' });
        } else {
          seenEmails.add(correo);
          results.push(mapped);
        }
      })
      .on('end', async () => {
        try {
          await model.bulkCreate(results);
          if (skipped.length > 0) {
            console.log('Usuarios omitidos por correo inválido o duplicado:', skipped.length);
            skipped.slice(0, 10).forEach(u => console.log(u));
            if (skipped.length > 10) console.log('...');
          }
          resolve();
        } catch (err) {
          reject(err);
        }
      });
  });
}

async function main() {
  try {
    await sequelize.sync({ force: true }); // Borra todo y recrea tablas
    // Importar solo usuarios
    await importCSV(User, path.resolve('src/csv/users.csv'), (row) => ({
      numero_empleado: row.numero_empleado,
      usuario: row.usuario,
      correo: row.correo,
      contrasena: row.contrasena,
      dependencia: row.dependencia || null,
      departamento: row.departamento || null,
      rol: row.rol || null,
      cargo: row.cargo || null,
      area: row.area || null,
      creado_por: row.creado_por || null,
      nombre_completo: row.nombre_completo || null,
      activo: row.activo === 'true' || row.activo === true || row.activo === 1 || row.activo === '1',
    }));
    console.log('✅ Importación de CSVs completada.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error importando CSVs:', err);
    process.exit(1);
  }
}

main();
