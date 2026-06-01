import axios from 'axios';

async function testTicketCreation() {
  try {
    console.log('Probando creación de ticket...');

    // Primero hacer login para obtener token
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      username: 'german.domiguez@sonora.gob.mx',
      password: 'German2025'
    });

    const token = loginResponse.data.data.token;
    console.log('Login exitoso, token obtenido');

    // Crear ticket
    const ticketData = {
      title: "Test Ticket - Problema de Rendimiento",
      description: "El equipo funciona muy lento y se congela frecuentemente",
      priority: "media",
      serviceType: "correctivo",
      equipmentId: "9be2bed5-18a8-4499-9aa0-9b7f38fc337c",
      assignedToId: null,
      diagnosis: "",
      solution: "",
      partsUsed: []
    };

    const ticketResponse = await axios.post('http://localhost:3000/api/tickets', ticketData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Ticket creado exitosamente:', ticketResponse.data);

  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
}

testTicketCreation();