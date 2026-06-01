import axios from 'axios';

// Detectar automáticamente la IP del servidor
// Si estoy en el celular (192.168.1.X), window.location.hostname será 192.168.1.189
// El backend siempre está en el puerto 3000
const getBaseUrl = () => {
  const { hostname, protocol } = window.location;
  return `${protocol}//${hostname}:3000/api`;
};

export const apiClient = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true
});

// Interceptor para agregar token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
