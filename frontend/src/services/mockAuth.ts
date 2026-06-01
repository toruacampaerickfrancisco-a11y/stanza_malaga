// Mock server para desarrollo del frontend
// Este archivo simula las respuestas de la API para poder desarrollar sin backend

import { User } from '@/types';

// Datos simulados
const mockUsers: User[] = [
  {
    id: '1',
    username: 'admin',
    email: 'admin@stanzamalaga.com',
    fullName: 'Administrador Residencial',
    employeeNumber: 'ADM001',
    role: 'admin',
    department: 'Administración',
    isActive: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01')
  },
  {
    id: 'admin_erick',
    username: 'eftcampa@gmail.com',
    email: 'eftcampa@gmail.com',
    fullName: 'Erick Administrador',
    employeeNumber: 'RES000',
    role: 'admin',
    department: 'Dirección',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2',
    username: 'eventos1',
    email: 'eventos@stanzamalaga.com',
    fullName: 'Coordinador de Eventos',
    employeeNumber: 'EVT001',
    role: 'eventos',
    department: 'Eventos',
    isActive: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01')
  },
  {
    id: '3',
    username: 'residente1',
    email: 'residente1@stanzamalaga.com',
    fullName: 'Familia García - Almeria 45',
    employeeNumber: 'RES045',
    role: 'residente',
    department: 'Sección Almeria',
    isActive: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01')
  },
  {
    id: '4',
    username: 'tesorero1',
    email: 'tesorero@stanzamalaga.com',
    fullName: 'Tesorero de Mesa Directiva',
    employeeNumber: 'TES001',
    role: 'tesorero',
    department: 'Mesa Directiva',
    isActive: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01')
  }
];

// Simular autenticación
export const mockAuth = {
  login: async (username: string, password: string): Promise<{ user: User; token: string }> => {
    // Simular delay de red
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const user = mockUsers.find(u => u.username === username || u.email === username);
    
    if (!user) {
      throw new Error('Usuario no encontrado');
    }
    
    // Simular validación de contraseña (en desarrollo todas son válidas)
    const validPasswords: Record<string, string> = {
      'admin': 'admin123',
      'eventos1': 'eventos123',
      'residente1': 'residente123',
      'tesorero1': 'tesorero123',
      'eftcampa@gmail.com': 'Erick123'
    };
    
    if (validPasswords[username] !== password) {
      throw new Error('Contraseña incorrecta');
    }
    
    return {
      user,
      token: `mock-token-${user.id}-${Date.now()}`
    };
  },
  
  verifyToken: async (token: string): Promise<User> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Extraer ID del token mock
    const userId = token.split('-')[2];
    const user = mockUsers.find(u => u.id === userId);
    
    if (!user) {
      throw new Error('Token inválido');
    }
    
    return user;
  }
};

export default mockAuth;