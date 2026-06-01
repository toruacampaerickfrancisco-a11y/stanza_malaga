const axios = require('axios');

async function testDashboard() {
  try {
    // Primero login
    console.log('Haciendo login...');
    const login = await axios.post('http://localhost:3000/api/auth/login', {
      usuario: 'ADMIN GENERAL',
      password: 'TempPass2025'
    });
    const token = login.data.token;
    console.log('Login exitoso');

    // Luego obtener stats del dashboard
    console.log('Obteniendo stats del dashboard...');
    const stats = await axios.get('http://localhost:3000/api/dashboard/stats', {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('Dashboard stats:');
    console.log('Total Equipment:', stats.data.data.totalEquipment);
    console.log('Operational Equipment:', stats.data.data.operationalEquipment);
    console.log('Equipment in Repair:', stats.data.data.equipmentInRepair);
  } catch (err) {
    console.error('Error:', err.response ? err.response.data : err.message);
  }
}

testDashboard();