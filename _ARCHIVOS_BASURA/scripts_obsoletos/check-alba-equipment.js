import { Equipment, User } from './src/models/index.js';

async function checkEquipment() {
  try {
    const userId = '6f81d18c-7af1-48f9-aaec-c5b4899d5c68'; // Alba's ID
    const equipment = await Equipment.findAll({
      where: {
        assigned_user_id: userId
      },
      include: [{ model: User, as: 'assignedUser' }]
    });

    console.log(`Found ${equipment.length} equipment assigned to Alba Rascon:`);
    equipment.forEach(eq => {
      console.log(`- ${eq.nombre} (Serial: ${eq.numero_serie})`);
    });
  } catch (error) {
    console.error('Error checking equipment:', error);
  }
}

checkEquipment();
