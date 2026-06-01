import { User, Ticket, Equipment } from './src/models/index.js';

async function checkUsage() {
  try {
    const name = "Usuario de Prueba Modificado";
    const users = await User.findAll({
      where: { nombre_completo: name }
    });

    console.log(`Found ${users.length} users with name "${name}"`);

    for (const user of users) {
      const ticketCount = await Ticket.count({ where: { reported_by_id: user.id } });
      const assignedTicketCount = await Ticket.count({ where: { assigned_to_id: user.id } });
      const equipmentCount = await Equipment.count({ where: { assigned_user_id: user.id } });
      
      console.log(`User ID: ${user.id} (${user.usuario})`);
      console.log(`  - Reported Tickets: ${ticketCount}`);
      console.log(`  - Assigned Tickets: ${assignedTicketCount}`);
      console.log(`  - Assigned Equipment: ${equipmentCount}`);
      console.log(`  - Created At: ${user.createdAt}`);
    }

  } catch (error) {
    console.error(error);
  }
}

checkUsage();
