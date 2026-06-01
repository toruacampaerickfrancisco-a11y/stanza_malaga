import { Ticket, User } from './src/models/index.js';
import { sequelize } from './src/config/database.js';

async function checkRecent() {
  try {
    console.log('Fetching recent tickets...');
    const recentTickets = await Ticket.findAll({
      limit: 3,
      order: [['createdAt', 'DESC']],
      include: [
        { model: User, as: 'reportedBy', attributes: ['nombre_completo'] }
      ]
    });

    console.log(`Found ${recentTickets.length} tickets.`);
    recentTickets.forEach(t => {
      console.log(`- [${t.status}] ${t.ticket_number}: ${t.title} (${t.createdAt})`);
      console.log(`  Reported By: ${t.reportedBy ? t.reportedBy.nombre_completo : 'N/A'}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

checkRecent();
