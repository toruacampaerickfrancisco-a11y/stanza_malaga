import { Ticket } from './src/models/index.js';
import { sequelize } from './src/config/database.js';

async function checkPending() {
  try {
    console.log('Checking for pending tickets...');
    const pending = await Ticket.findAll({ where: { status: 'pendiente' } });
    console.log(`Found ${pending.length} pending tickets.`);
    pending.forEach(t => console.log(`- ${t.ticket_number}: ${t.title}`));
    
    const all = await Ticket.findAll({ attributes: ['status'] });
    const counts = {};
    all.forEach(t => {
      counts[t.status] = (counts[t.status] || 0) + 1;
    });
    console.log('Counts by status:', counts);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

checkPending();
