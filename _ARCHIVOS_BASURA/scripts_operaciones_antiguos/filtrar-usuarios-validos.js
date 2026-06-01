// Script para filtrar y exportar solo usuarios válidos de users.csv
// Genera un nuevo archivo users_valid.csv solo con usuarios con correo y contraseña válidos

const fs = require('fs');
const csv = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const inputPath = 'src/csv/users.csv';
const outputPath = 'src/csv/users_valid.csv';

const isValidEmail = (email) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);

const validRows = [];

fs.createReadStream(inputPath)
  .pipe(csv())
  .on('data', (row) => {
    if (
      row.correo &&
      isValidEmail(row.correo) &&
      row.contrasena &&
      row.contrasena !== 'Faltan Datos' &&
      row.correo !== 'Faltan Datos'
    ) {
      validRows.push(row);
    }
  })
  .on('end', () => {
    if (validRows.length === 0) {
      console.log('No se encontraron usuarios válidos.');
      return;
    }
    const headers = Object.keys(validRows[0]).map((h) => ({ id: h, title: h }));
    const csvWriter = createCsvWriter({
      path: outputPath,
      header: headers,
      alwaysQuote: true
    });
    csvWriter.writeRecords(validRows).then(() => {
      console.log(`Usuarios válidos exportados a ${outputPath}`);
      console.log(`Total: ${validRows.length}`);
    });
  });
