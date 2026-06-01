import { User, Equipment, Ticket, Department } from './src/models/index.js';

async function seedTickets() {
  console.log('Iniciando creación de tickets de ejemplo...');
  
  try {
    // Obtener algunos usuarios y equipos
    const users = await User.findAll({ limit: 10 });
    const equipments = await Equipment.findAll({ limit: 10 });
    
    if (users.length === 0 || equipments.length === 0) {
      console.error('Error: Se necesitan usuarios y equipos en la base de datos para crear tickets.');
      process.exit(1);
    }

    const exampleTickets = [
      {
        ticket_number: 'SBDI/0001/2025',
        title: 'Mantenimiento Preventivo - Laptop HP',
        description: 'Se requiere limpieza interna y cambio de pasta térmica para prevenir sobrecalentamiento.',
        status: 'nuevo',
        priority: 'media',
        service_type: 'preventivo',
        reported_by_id: users[0].id,
        equipment_id: equipments[0].id
      },
      {
        ticket_number: 'SBDI/0002/2025',
        title: 'Falla de Impresión - Epson L3150',
        description: 'La impresora no reconoce los cartuchos de tinta negra a pesar de estar llenos.',
        status: 'en_proceso',
        priority: 'alta',
        service_type: 'correctivo',
        reported_by_id: users[1].id,
        equipment_id: equipments[1].id,
        diagnosis: 'Cabezal de impresión obstruido o falla en el sensor de tinta.'
      },
      {
        ticket_number: 'SBDI/0003/2025',
        title: 'Instalación de Software de Diseño',
        description: 'Solicitud de instalación de Adobe Creative Cloud para el área de comunicación.',
        status: 'cerrado',
        priority: 'baja',
        service_type: 'instalacion',
        reported_by_id: users[2].id,
        equipment_id: equipments[2].id,
        diagnosis: 'Software instalado y activado correctamente.',
        solution: 'Se procedió con la descarga e instalación de la suite de Adobe.'
      },
      {
        ticket_number: 'SBDI/0004/2025',
        title: 'Equipo no enciende',
        description: 'La computadora de escritorio no da señales de vida al presionar el botón de encendido.',
        status: 'pendiente',
        priority: 'critica',
        service_type: 'correctivo',
        reported_by_id: users[3].id,
        equipment_id: equipments[3].id
      },
      {
        ticket_number: 'SBDI/0005/2025',
        title: 'Configuración de Correo Institucional',
        description: 'El usuario no puede sincronizar su cuenta de Outlook en su nuevo dispositivo móvil.',
        status: 'nuevo',
        priority: 'media',
        service_type: 'correctivo',
        reported_by_id: users[4].id
      },
      {
        ticket_number: 'SBDI/0006/2025',
        title: 'Actualización de Memoria RAM',
        description: 'El equipo presenta lentitud extrema al abrir múltiples aplicaciones.',
        status: 'en_proceso',
        priority: 'media',
        service_type: 'correctivo',
        reported_by_id: users[5].id,
        equipment_id: equipments[4].id,
        parts: JSON.stringify(['Memoria RAM 8GB DDR4'])
      },
      {
        ticket_number: 'SBDI/0007/2025',
        title: 'Revisión de Red Local',
        description: 'Intermitencia en la conexión a internet en el ala norte del edificio.',
        status: 'nuevo',
        priority: 'alta',
        service_type: 'correctivo',
        reported_by_id: users[0].id
      },
      {
        ticket_number: 'SBDI/0008/2025',
        title: 'Limpieza de Virus/Malware',
        description: 'Aparecen ventanas emergentes sospechosas y el navegador redirige a sitios desconocidos.',
        status: 'cerrado',
        priority: 'alta',
        service_type: 'correctivo',
        reported_by_id: users[1].id,
        equipment_id: equipments[5].id,
        diagnosis: 'Infección por Adware detectada.',
        solution: 'Se ejecutó limpieza profunda con antivirus y se restablecieron los navegadores.'
      }
    ];

    let creados = 0;
    for (const ticketData of exampleTickets) {
      // Verificar si ya existe
      const existing = await Ticket.findOne({ where: { ticket_number: ticketData.ticket_number } });
      if (!existing) {
        await Ticket.create(ticketData);
        creados++;
      }
    }

    console.log(`Se crearon ${creados} tickets de ejemplo.`);
    process.exit(0);
  } catch (error) {
    console.error('Error al crear tickets de ejemplo:', error);
    process.exit(1);
  }
}

seedTickets();
