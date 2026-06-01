import axios from 'axios';

(async () => {
  try {
    const response = await axios.post('http://localhost:3000/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    console.log('Login exitoso:', response.data);
  } catch (error) {
    if (error.response) {
      console.error('Error de login:', error.response.data);
    } else {
      console.error('Error de conexión:', error.message);
    }
  }
})();
