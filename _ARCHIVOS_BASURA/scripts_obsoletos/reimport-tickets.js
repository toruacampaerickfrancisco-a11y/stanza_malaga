import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { User, Equipment, Ticket } from './src/models/index.js';

const csvPath = path.resolve('src/csv/tickets2.csv');

async function importTickets() {
  console.log('Iniciando importación de tickets...');
  
  const ticketsData = [];
  await new Promise((resolve, reject) => {
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (row) => ticketsData.push(row))
      .on('end', resolve)
      .on('error', reject);
  });

  console.log(`Leídos ${ticketsData.length} tickets del CSV.`);

  let importados = 0;
  let errores = 0;

  for (const row of ticketsData) {
    try {
      // Buscar usuario por numero_empleado (userId en CSV)
      const user = await User.findOne({ where: { numero_empleado: row.userId } });
      
      // Buscar equipo por serial_number (equipmentId en CSV)
      const equipment = await Equipment.findOne({ where: { serial_number: row.equipmentId } });

      // Mapear status
      let status = 'nuevo';
      if (row.status === 'en_proceso') status = 'en_proceso';
      if (row.status === 'cerrado') status = 'cerrado';
      if (row.status === 'pendiente') status = 'pendiente';

      // Mapear service_type
      let service_type = 'correctivo';
      if (row.serviceType === 'preventivo') service_type = 'preventivo';
      if (row.serviceType === 'instalacion') service_type = 'instalacion';

      // Crear el ticket
      await Ticket.create({
        ticket_number: row.id,
        title: row.observations || 'Sin título',
        description: row.observations || 'Sin descripción',
        status: status,
        priority: 'media',
        service_type: service_type,
        reported_by_id: user ? user.id : null,
        equipment_id: equipment ? equipment.id : null,
        diagnosis: row.diagnostic || '',
        solution: row.repair || '',
        parts: row.parts ? JSON.stringify(row.parts.split(',').map(p => p.trim())) : '[]'
      });

      importados++;
    } catch (error) {
      console.error(`Error importando ticket ${row.id}:`, error.message);
      errores++;
    }
  }

  console.log(`Importación finalizada.`);
  console.log(`Tickets importados: ${importados}`);
  console.log(`Errores: ${errores}`);
  process.exit(0);
}

importTickets().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
