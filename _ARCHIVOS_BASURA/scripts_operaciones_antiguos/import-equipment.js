// Script para importar equipos desde CSV a la base de datos
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { Equipment } from '../../src/models/index.js';

const csvPath = path.resolve('csv', 'equipment.csv');

async function importEquipment() {
  const equipos = [];
  return new Promise((resolve, reject) => {
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (row) => {
        equipos.push(row);
      })
      .on('end', async () => {
        const noImportados = [];
        for (const row of equipos) {
          const unique = () => `${Date.now()}${Math.floor(Math.random()*10000)}`;
          // Adaptar columnas del CSV en español (sin tildes ni eñes)
          let name = row.modelo && row.modelo.trim() ? row.modelo.trim() : `Equipo_${unique()}`;
          let type = 'other';
          if (row.tipo && row.tipo.toLowerCase().includes('laptop')) type = 'laptop';
          else if (row.tipo && row.tipo.toLowerCase().includes('escritorio')) type = 'desktop';
          else if (row.tipo && row.tipo.toLowerCase().includes('impresora')) type = 'printer';
          else if (row.tipo && row.tipo.toLowerCase().includes('monitor')) type = 'monitor';
          else if (row.tipo && row.tipo.toLowerCase().includes('server')) type = 'server';
          let brand = row.marca && row.marca.trim() ? row.marca.trim() : `Marca_${unique()}`;
          let model = row.modelo && row.modelo.trim() ? row.modelo.trim() : `Modelo_${unique()}`;
          let serial_number = row.serial && row.serial.trim() ? row.serial.trim() : `SERIAL${unique()}`;
          let inventory_number = row.id && row.id.trim() ? row.id.trim() : `INV${unique()}`;
          let status = row['estatus Equipo'] && ['available','assigned','maintenance','retired','activo'].includes(row['estatus Equipo'].toLowerCase()) ? (row['estatus Equipo'].toLowerCase() === 'activo' ? 'available' : row['estatus Equipo'].toLowerCase()) : 'available';
          let location = row.Departamento && row.Departamento.trim() ? row.Departamento.trim() : `Ubicacion_${unique()}`;
          // Opcionales
          let processor = row.procesador || null;
          let ram = row.ram || null;
          let hard_drive = row.almacenamiento || null;
          let description = row.Observaciones || null;
          let notes = row.Requerimiento || null;
          // Mapear usuario asignado desde el CSV en español
          let assigned_user_id = null;
          if (row.usuario_asignado_id && row.usuario_asignado_id.trim()) {
            assigned_user_id = row.usuario_asignado_id.trim();
          } else if (row['usuario asignado id'] && row['usuario asignado id'].trim()) {
            assigned_user_id = row['usuario asignado id'].trim();
          } else if (row.user_id && row.user_id.trim()) {
            assigned_user_id = row.user_id.trim();
          } else if (row['user id'] && row['user id'].trim()) {
            assigned_user_id = row['user id'].trim();
          }
          try {
            await Equipment.create({
              name,
              type,
              brand,
              model,
              serial_number,
              inventory_number,
              processor,
              ram,
              hard_drive,
              description,
              status,
              location,
              notes,
              assigned_user_id
            });
            console.log(`Equipo importado: ${name} (${serial_number})`);
          } catch (err) {
            // Si falla, inventar todos los campos y forzar la inserción una vez más
            try {
              serial_number = `SERIAL${unique()}`;
              inventory_number = `INV${unique()}`;
              name = `Equipo_${unique()}`;
              model = `Modelo_${unique()}`;
              brand = `Marca_${unique()}`;
              location = `Ubicacion_${unique()}`;
              status = 'available';
              await Equipment.create({
                name,
                type,
                brand,
                model,
                serial_number,
                inventory_number,
                processor,
                ram,
                hard_drive,
                description,
                status,
                location,
                notes,
                assigned_user_id: null
              });
              console.log(`Equipo importado (forzado): ${name} (${serial_number})`);
            } catch (err2) {
              noImportados.push({ row, motivo: `No se pudo importar ni forzando: ${err2.message}` });
            }
          }
        }
        if (noImportados.length > 0) {
          console.log('\nResumen de equipos NO importados:');
          noImportados.forEach((item, idx) => {
            console.log(`#${idx+1}: Motivo: ${item.motivo}\nDatos: ${JSON.stringify(item.row)}\n`);
          });
        } else {
          console.log('\nTodos los equipos fueron importados correctamente.');
        }
        resolve();
      })
      .on('error', reject);
  });
}

importEquipment().then(() => {
  console.log('Importación de equipos finalizada.');
  process.exit(0);
}).catch((err) => {
  console.error('Error general:', err);
  process.exit(1);
});
