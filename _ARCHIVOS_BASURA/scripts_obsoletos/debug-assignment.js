import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

async function checkAssignment() {
  try {
    const db = await open({
      filename: './backend.sqlite',
      driver: sqlite3.Database
    });

    console.log('Connected to database.');

    // Find the user
    const user = await db.get("SELECT * FROM Users WHERE nombre_completo LIKE '%RASCON PAREDES ALBA LUZ%'");
    
    if (!user) {
      console.log('User not found!');
      return;
    }

    console.log('User found:', {
      id: user.id,
      nombre: user.nombre_completo,
      rol: user.rol
    });

    // Find equipment assigned to this user
    const equipment = await db.all("SELECT * FROM Equipment WHERE assigned_user_id = ?", user.id);

    if (equipment.length === 0) {
      console.log('No equipment assigned to this user.');
      
      // Check if there are any equipments at all
      const count = await db.get("SELECT count(*) as c FROM Equipment");
      console.log(`Total equipment in DB: ${count.c}`);

    } else {
      console.log(`Found ${equipment.length} equipment assigned:`);
      equipment.forEach(eq => {
        console.log(`- ${eq.name} (ID: ${eq.id}, AssignedTo: ${eq.assigned_user_id})`);
      });
    }

  } catch (err) {
    console.error('Error:', err);
  }
}

checkAssignment();
