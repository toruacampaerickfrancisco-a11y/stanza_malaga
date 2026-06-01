
import { Ticket, User, Equipment, sequelize } from './src/models/index.js';

async function run() {
  try {
    await sequelize.authenticate();
    console.log('Connected to DB');

    const user = await User.findOne();
    if (!user) {
      console.error('No users found');
      return;
    }
    console.log('User found:', user.id);

    const equipment = await Equipment.findOne();
    if (!equipment) {
      console.error('No equipment found');
      return;
    }
    console.log('Equipment found:', equipment.id);

    const payload = {
      title: 'Nuevo Reporte',
      description: 'Test description',
      priority: 'media',
      service_type: 'correctivo',
      equipment_id: equipment.id,
      assigned_to_id: undefined, // This is what we suspect is happening
      reported_by_id: user.id,
      status: 'nuevo',
      diagnosis: '',
      solution: '',
      actual_hours: '',
      parts: '[]'
    };

    console.log('Creating ticket with payload:', payload);

    const ticket = await Ticket.create(payload);
    console.log('Ticket created:', ticket.id);

  } catch (error) {
    console.error('Error creating ticket:', error);
  } finally {
    await sequelize.close();
  }
}

run();
