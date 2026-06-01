// Script para insertar datos inventados en la base de datos usando los modelos Sequelize (CommonJS)
// Cambia la extensión a .cjs para ejecutarlo en proyectos ES module

const { User, Equipment, Ticket, TicketComment, Permission } = require('../models');
const sequelize = require('../config/database');

async function seedFakeData() {
  await sequelize.sync(); // Asegura que las tablas existen

  // Usuarios
  await User.bulkCreate([
    { id: 1, nombre_completo: 'Ana Martínez', usuario: 'ana.mtz', correo: 'ana@empresa.com', rol: 'admin', password: 'hash1', departamento: 'Sistemas', isActive: true },
    { id: 2, nombre_completo: 'Luis Torres', usuario: 'ltorres', correo: 'luis@empresa.com', rol: 'tecnico', password: 'hash2', departamento: 'Soporte', isActive: true },
    { id: 3, nombre_completo: 'Carla Jiménez', usuario: 'cjimenez', correo: 'carla@empresa.com', rol: 'usuario', password: 'hash3', departamento: 'Finanzas', isActive: true },
    { id: 4, nombre_completo: 'Pedro Sánchez', usuario: 'psanchez', correo: 'pedro@empresa.com', rol: 'usuario', password: 'hash4', departamento: 'RH', isActive: false },
  ], { ignoreDuplicates: true });

  // Equipos
  await Equipment.bulkCreate([
    { id: 1, name: 'Laptop Ana', type: 'computadora', brand: 'Dell', model: 'XPS 13', serial_number: 'SN123456', inventory_number: 'INV-001', status: 'assigned', location: 'Oficina 101', UserId: 1, purchase_date: '2023-01-10', warranty_expiration: '2026-01-10', notes: 'Equipo principal' },
    { id: 2, name: 'Impresora HP', type: 'impresora', brand: 'HP', model: 'LaserJet', serial_number: 'SN654321', inventory_number: 'INV-002', status: 'available', location: 'Sala común', UserId: null, purchase_date: '2022-05-20', warranty_expiration: '2025-05-20', notes: 'Uso compartido' },
    { id: 3, name: 'Servidor DB', type: 'servidor', brand: 'Lenovo', model: 'ThinkSys', serial_number: 'SN789012', inventory_number: 'INV-003', status: 'maintenance', location: 'Data Center', UserId: null, purchase_date: '2021-09-15', warranty_expiration: '2024-09-15', notes: 'Mantenimiento anual' },
  ], { ignoreDuplicates: true });

  // Tickets
  await Ticket.bulkCreate([
    { id: 1, title: 'No enciende laptop', description: 'La laptop no prende', userId: 3, equipmentId: 1, status: 'nuevo', priority: 'alta', serviceType: 'correctivo', assignedToId: 2, diagnosis: null, solution: null, createdAt: '2025-11-18 09:00:00' },
    { id: 2, title: 'Papel atascado', description: 'Impresora marca error papel', userId: 1, equipmentId: 2, status: 'en_proceso', priority: 'media', serviceType: 'correctivo', assignedToId: 2, diagnosis: 'Revisar rodillos', solution: null, createdAt: '2025-11-18 10:30:00' },
    { id: 3, title: 'Actualizar servidor', description: 'Solicitud de actualización', userId: 2, equipmentId: 3, status: 'cerrado', priority: 'baja', serviceType: 'preventivo', assignedToId: 1, diagnosis: 'Listo', solution: 'Parche aplicado', createdAt: '2025-11-17 15:00:00' },
  ], { ignoreDuplicates: true });

  // Comentarios de Ticket
  await TicketComment.bulkCreate([
    { id: 1, ticketId: 1, userId: 2, comment: 'Revisando el equipo', createdAt: '2025-11-18 09:30:00' },
    { id: 2, ticketId: 2, userId: 2, comment: 'Se limpió el rodillo', createdAt: '2025-11-18 11:00:00' },
    { id: 3, ticketId: 3, userId: 1, comment: 'Actualización completada', createdAt: '2025-11-17 16:00:00' },
  ], { ignoreDuplicates: true });

  // Permisos
  await Permission.bulkCreate([
    { id: 1, name: 'admin', description: 'Acceso total' },
    { id: 2, name: 'tecnico', description: 'Gestión de tickets/equipos' },
    { id: 3, name: 'usuario', description: 'Reporte de tickets propios' },
  ], { ignoreDuplicates: true });

  console.log('Datos inventados insertados correctamente.');
  process.exit(0);
}

seedFakeData().catch(err => {
  console.error('Error al insertar datos inventados:', err);
  process.exit(1);
});
