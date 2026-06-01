import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { Equipment } from '../../src/models/index.js';

const csvPath = path.resolve('src/csv/equipment.csv');

async function validarEquiposDesdeCSV() {
  const equipos = [];
  await new Promise((resolve, reject) => {
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (row) => {
        equipos.push(row);
      })
      .on('end', resolve)
      .on('error', reject);
  });

  let errores = [];
  for (const [i, row] of equipos.entries()) {
    const {
      numero_serie,
      tipo
    } = row;
    let motivo = [];
    if (!numero_serie) motivo.push('Falta numero_serie');
    if (!tipo) motivo.push('Falta tipo');
    // Puedes agregar más validaciones según tu modelo
    if (motivo.length > 0) {
      errores.push({ fila: i + 2, motivo, row }); // +2 por encabezado y base 0
      continue;
    }
    // Verifica si ya existe
    const existe = await Equipment.findOne({ where: { numero_serie } });
    if (existe) {
      errores.push({ fila: i + 2, motivo: ['Equipo ya existe'], row });
    }
  }
  if (errores.length === 0) {
    console.log('No se encontraron errores.');
  } else {
    console.log('Errores encontrados al validar el CSV de equipos:');
    errores.slice(0, 20).forEach(e => {
      console.log(`Fila ${e.fila}: ${e.motivo.join(', ')} | Datos:`, e.row);
    });
    if (errores.length > 20) {
      console.log(`...y ${errores.length - 20} errores más.`);
    }
    console.log(`Total de errores: ${errores.length}`);
  }
}

validarEquiposDesdeCSV()
  .then(() => process.exit(0))
  .catch(err => { console.error(err); process.exit(1); });
