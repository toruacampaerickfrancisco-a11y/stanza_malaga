import { Ticket } from './backend/src/models/index.js';

async function checkTickets() {
  try {
    const count = await Ticket.count();
    console.log('Total tickets in DB:', count);
    const tickets = await Ticket.findAll({ limit: 5 });
    console.log('Sample tickets:', JSON.stringify(tickets, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('Error checking tickets:', error);
    process.exit(1);
  }
}

checkTickets();
