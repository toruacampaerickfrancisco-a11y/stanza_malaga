const axios = require('axios');

async function testCreateEquipment() {
  try {
    // Primero hacer login
    console.log('Haciendo login...');
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      usuario: 'ADMIN GENERAL',
      password: 'TempPass2025'
    });

    const token = loginResponse.data.token;
    console.log('Login exitoso, token obtenido');

    // Verificar que el token funciona con una petición GET
    console.log('Verificando token con petición GET...');
    try {
      const testResponse = await axios.get('http://localhost:3000/api/equipment', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('Token válido, procediendo con la creación...');
    } catch (testError) {
      console.error('Error verificando token:', testError.response ? testError.response.data : testError.message);
      return;
    }

    const equipmentData = {
      name: 'Computadora de Prueba',
      type: 'computadora', // Ahora debería ser válido
      brand: 'Dell',
      model: 'Optiplex 3080',
      serial_number: 'SN123456789',
      inventory_number: 'INV001',
      processor: 'Intel Core i5',
      ram: '8GB',
      hard_drive: '256GB SSD',
      operating_system: 'Windows 11',
      location: 'Oficina Principal',
      status: 'active',
      purchase_date: '2023-01-15',
      warranty_expiration: '2026-01-15',
      notes: 'Equipo de prueba para verificar la creación'
    };

    console.log('Enviando datos de equipo:', equipmentData);

    // Hacer la petición inmediatamente después del login
    const response = await axios.post('http://localhost:3000/api/equipment', equipmentData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('Equipo creado exitosamente:', response.data);
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
}

testCreateEquipment();