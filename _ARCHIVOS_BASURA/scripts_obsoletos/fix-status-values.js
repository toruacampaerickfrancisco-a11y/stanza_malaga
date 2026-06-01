import { Ticket } from './src/models/index.js';
import { sequelize } from './src/config/database.js';

async function fixStatus() {
  try {
    console.log('Fixing status values...');
    await Ticket.update({ status: 'en_proceso' }, { where: { status: 'in_progress' } });
    await Ticket.update({ status: 'cerrado' }, { where: { status: 'closed' } });
    console.log('Done.');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

fixStatus();
