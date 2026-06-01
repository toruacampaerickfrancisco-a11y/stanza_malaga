import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { Equipment } from '../../src/models/index.js';

// ATENCIÓN: Este script importa equipos desde src/csv/equipment2.csv
const csvPath = path.resolve('src/csv/equipment2.csv');

async function importarEquiposDesdeCSV() {
  const equipos = [];
  // Leer el CSV y cargar equipos en memoria
  await new Promise((resolve, reject) => {
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (row) => {
        equipos.push(row);
      })
      .on('end', resolve)
      .on('error', reject);
  });

  let importados = 0;
  let omitidos = 0;
  for (const row of equipos) {
    try {
      // Mapear los nombres de columna reales del CSV
      const {
        serial_number,
        type,
        brand,
        model,
        description,
        location,
        assigned_user_id,
        status,
        inventory_number,
        processor,
        ram,
        hard_drive,
        name,
        notes,
        requirement
      } = row;
      if (!serial_number) {
        omitidos++;
        continue;
      }
      // Normalizar type
      let validTypes = ['desktop', 'laptop', 'printer', 'server', 'monitor', 'other'];
      let typeValue = (type || '').toLowerCase();
      if (!validTypes.includes(typeValue)) {
        if (name && name.toLowerCase().includes('laptop')) typeValue = 'laptop';
        else if (name && name.toLowerCase().includes('impresora')) typeValue = 'printer';
        else if (name && name.toLowerCase().includes('monitor')) typeValue = 'monitor';
        else if (name && name.toLowerCase().includes('server')) typeValue = 'server';
        else if (name && name.toLowerCase().includes('escritorio') || (brand && brand.toLowerCase().includes('dell'))) typeValue = 'desktop';
        else typeValue = 'other';
      }

      // Normalizar status
      let validStatus = ['available', 'assigned', 'maintenance', 'retired'];
      let statusValue = (status || '').toLowerCase();
      if (statusValue === 'activo') statusValue = 'available';
      else if (statusValue === 'asignado') statusValue = 'assigned';
      else if (statusValue === 'mantenimiento') statusValue = 'maintenance';
      else if (statusValue === 'baja' || statusValue === 'retirado') statusValue = 'retired';
      else if (!validStatus.includes(statusValue)) statusValue = 'available';

      // Limpiar campos requeridos
      const clean = v => (v === undefined || v === null || v === '' ? null : v);

      // Normalizar assigned_user_id: si es 'Ninguno', 'pendiente', vacío o no es UUID válido, poner null
      let assignedUserId = (assigned_user_id || '').toString().trim();
      if (!assignedUserId || assignedUserId.toLowerCase() === 'ninguno' || assignedUserId.toLowerCase() === 'pendiente' || !esUUIDValido(assignedUserId)) {
          assignedUserId = null;
      }

      // Verifica si ya existe (por serial_number)
      const existe = await Equipment.findOne({ where: { serial_number } });
      if (existe) {
        omitidos++;
        continue;
      }
      const now = new Date();
      await Equipment.create({
        serial_number: clean(serial_number),
        type: typeValue,
        brand: clean(brand),
        model: clean(model),
        description: clean(description),
        location: clean(location),
        assigned_user_id: clean(assignedUserId),
        status: statusValue,
        inventory_number: clean(inventory_number),
        processor: clean(processor),
        ram: clean(ram),
        hard_drive: clean(hard_drive),
        name: clean(name),
        notes: clean(notes),
        requirement: clean(requirement),
        created_at: row.created_at && row.created_at !== '' ? new Date(row.created_at) : now,
        updated_at: row.updated_at && row.updated_at !== '' ? new Date(row.updated_at) : now
      });
      // Función para validar si un string es un UUID v4 válido
      function esUUIDValido(uuid) {
        const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidV4Regex.test(uuid);
      }
      importados++;
    } catch (err) {
      console.error('Error importando equipo:', row, err);
      omitidos++;
    }
  }
  console.log(`Equipos importados: ${importados}`);
  console.log(`Equipos omitidos: ${omitidos}`);
}

importarEquiposDesdeCSV()
  .then(() => process.exit(0))
  .catch(err => { console.error(err); process.exit(1); });
