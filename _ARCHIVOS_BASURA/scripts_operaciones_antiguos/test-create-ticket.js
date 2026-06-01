// Configuración (se pueden sobrescribir con variables de entorno)
const BASE = process.env.BASE || 'http://localhost:3000';
const USERNAME = process.env.TEST_USER || 'admin@bienestar.sonora.gob.mx';
const PASSWORD = process.env.TEST_PASS || 'TempPass2025';

(async function main() {
  try {
    console.log('Intentando login con usuario:', USERNAME);
    const loginResp = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: USERNAME, // Using email to login
        password: PASSWORD
      })
    });

    const loginData = await loginResp.json();
    console.log('Login response status:', loginResp.status);
    console.log('Login response data:', JSON.stringify(loginData, null, 2));
    
    const token = loginData?.data?.token;
    if (!token) {
      console.error('No se obtuvo token en la respuesta de login');
      return;
    }

    // Payload de prueba: puedes modificarlo según necesites
    const payload = {
      title: 'Test',
      description: 'Ok',
      priority: 'sin_clasificar',
      serviceType: 'correctivo',
      equipmentId: null,
      assignedToId: null,
      diagnosis: '',
      solution: '',
      partsUsed: []
    };

    console.log('Enviando petición POST /api/tickets con payload:', JSON.stringify(payload, null, 2));

    const createResp = await fetch(`${BASE}/api/tickets`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
    });

    const createData = await createResp.json();
    console.log('Create response status:', createResp.status);
    console.log('Create response data:', JSON.stringify(createData, null, 2));

  } catch (error) {
    console.error('Error en la ejecución del script:', error.message);
    console.error(error.stack);
  }
})();
