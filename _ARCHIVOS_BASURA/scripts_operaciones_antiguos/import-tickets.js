// Script para importar tickets desde CSV a la base de datos
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { Ticket } from '../../src/models/index.js';

const csvPath = path.resolve('csv', 'tickets.csv');

async function importTickets() {
  const tickets = [];
  return new Promise((resolve, reject) => {
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (row) => {
        tickets.push(row);
      })
      .on('end', async () => {
        const noImportados = [];

        // Obtener un usuario y un equipo válidos para relaciones ficticias
        let userIdFicticio = null;
        let equipmentIdFicticio = null;
        try {
          const models = await import('../../src/models/index.js');
          const User = models.User;
          const Equipment = models.Equipment;
          let user = await User.findOne();
          if (!user) {
            user = await User.create({
              username: `ficticio_${Date.now()}`,
              email: `ficticio${Date.now()}@example.com`,
              password: 'usuario123',
              full_name: 'Usuario Ficticio',
              employee_number: `EMP${Date.now()}`,
              role: 'usuario',
              department: 'Ficticio',
              is_active: true
            });
          }
          userIdFicticio = user.id;
          const eq = await Equipment.findOne();
          if (eq) equipmentIdFicticio = eq.id;
        } catch {}

        for (const row of tickets) {
          try {
            const unique = () => `${Date.now()}${Math.floor(Math.random()*10000)}`;
            // Campos requeridos y mapeo
            let title = row.observations && row.observations.trim().length >= 5 ? row.observations.trim() : `Ticket_${unique()}`;
            let description = row.diagnostic && row.diagnostic.trim().length >= 10 ? row.diagnostic.trim() : `Descripción generada automáticamente ${unique()}`;
            let status = row.status && ['nuevo','en_proceso','cerrado'].includes(row.status?.toLowerCase()) ? row.status.toLowerCase() : 'nuevo';
            let priority = ['baja','media','alta','critica'].includes(row.priority?.toLowerCase()) ? row.priority.toLowerCase() : 'media';
            let service_type = row.serviceType && ['preventivo','correctivo','instalacion'].includes(row.serviceType?.toLowerCase()) ? row.serviceType.toLowerCase() : 'correctivo';
            // ticket_number único
            let ticket_number = row.id && row.id.trim() ? row.id.trim() : `SBDI/${unique()}`;
            // Relaciones: si no existen, asignar ficticio
            let reported_by_id = userIdFicticio;
            let assigned_to_id = null;
            let equipment_id = equipmentIdFicticio;
            // Insertar
            let created = false;
            let intentos = 0;
            while (!created && intentos < 10) {
              try {
                await Ticket.create({
                  ticket_number,
                  title,
                  description,
                  status,
                  priority,
                  service_type,
                  reported_by_id,
                  assigned_to_id,
                  equipment_id
                });
                console.log(`Ticket importado: ${ticket_number}`);
                created = true;
              } catch (err) {
                const msg = err.message.toLowerCase();
                if (msg.includes('ticket_number')) ticket_number = `SBDI/${unique()}`;
                if (msg.includes('title')) title = `Ticket_${unique()}`;
                if (msg.includes('description')) description = `Descripción generada automáticamente ${unique()}`;
                if (msg.includes('reported_by_id')) reported_by_id = userIdFicticio;
                if (msg.includes('equipment_id')) equipment_id = equipmentIdFicticio;
                if (msg.includes('priority')) priority = 'media';
                if (msg.includes('service_type')) service_type = 'correctivo';
                if (msg.includes('status')) status = 'nuevo';
                intentos++;
              }
            }
            // Si no se pudo importar, inventar todos los campos y forzar la inserción una vez más
            if (!created) {
              try {
                ticket_number = `SBDI/${unique()}`;
                title = `Ticket_${unique()}`;
                description = `Descripción generada automáticamente ${unique()}`;
                status = 'nuevo';
                priority = 'media';
                service_type = 'correctivo';
                reported_by_id = userIdFicticio;
                assigned_to_id = null;
                equipment_id = equipmentIdFicticio;
                await Ticket.create({
                  ticket_number,
                  title,
                  description,
                  status,
                  priority,
                  service_type,
                  reported_by_id,
                  assigned_to_id,
                  equipment_id
                });
                console.log(`Ticket importado (forzado): ${ticket_number}`);
              } catch (err2) {
                noImportados.push({ row, motivo: `No se pudo importar ni forzando: ${err2.message}` });
              }
            }
          } catch (err) {
            noImportados.push({ row, motivo: `Error inesperado: ${err.message}` });
          }
        }
        if (noImportados.length > 0) {
          console.log('\nResumen de tickets NO importados:');
          noImportados.forEach((item, idx) => {
            console.log(`#${idx+1}: Motivo: ${item.motivo}\nDatos: ${JSON.stringify(item.row)}\n`);
          });
        } else {
          console.log('\nTodos los tickets fueron importados correctamente.');
        }
        resolve();
      })
      .on('error', reject);
  });
}

importTickets().then(() => {
  console.log('Importación de tickets finalizada.');
  process.exit(0);
}).catch((err) => {
  console.error('Error general:', err);
  process.exit(1);
});
