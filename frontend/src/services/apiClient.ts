import axios from 'axios';

const getBaseURL = () => {
  // En Android Emulator, localhost sin puerto (http://localhost o https://localhost) es la app nativa de Capacitor.
  // Usamos el alias loopback '10.0.2.2' para saltarnos bloqueos de Firewall.
  const isNativeApp = window.location.origin.includes('localhost') && !window.location.port;
  if (isNativeApp || window.location.protocol.startsWith('capacitor')) {
    return 'http://10.0.2.2:3000/api';
  }
  return import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
};

const client = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 5000,
});

// Mock data constants adaptados a Control de Recaudación y Cerrada
const MOCK_DEPARTMENTS = [
  { id: '1', display_name: 'Administración de Cerrada', name: 'Administración', is_active: true },
  { id: '2', display_name: 'Tesorería / Recaudación', name: 'Tesorería', is_active: true },
  { id: '3', display_name: 'Seguridad / Vigilancia', name: 'Seguridad', is_active: true },
  { id: '4', display_name: 'Mantenimiento de Áreas Comunes', name: 'Mantenimiento', is_active: true },
  { id: '5', display_name: 'Comité de Vecinos', name: 'Comité', is_active: true },
];

const MOCK_USERS = [
  {
    id: 'admin_erick',
    fullName: 'Erick Campa (Admin)',
    role: 'admin',
    username: 'erick',
    email: 'eftcampa@gmail.com',
    isActive: true,
    department: 'Administración',
    employeeNumber: 'ADM-001',
    createdAt: new Date('2023-01-01').toISOString()
  },
  {
    id: 'residente_1',
    fullName: 'Familia García - Casa 14',
    role: 'user',
    username: 'casa14',
    email: 'garcia14@example.com',
    isActive: true,
    department: 'Residente',
    employeeNumber: 'CASA-014',
    createdAt: new Date('2023-02-15').toISOString()
  },
  {
    id: 'vigilante_1',
    fullName: 'Guardia Nocturno - Turno A',
    role: 'technician',
    username: 'guardia1',
    email: 'seguridad@cerrada.com',
    isActive: true,
    department: 'Seguridad',
    employeeNumber: 'VIG-001',
    createdAt: new Date('2023-05-10').toISOString()
  },
];

const MOCK_EQUIPMENT = [
  {
    id: '1',
    name: 'Motor Portón Principal (Entrada)',
    code: 'ACC-001',
    status: 'OPERATIONAL',
    type: 'SEGURIDAD',
    location: 'Acceso Principal',
    brand: 'Chamberlain',
    model: 'HeavyDuty 2024',
    serialNumber: 'PORT-9988',
    inventoryNumber: 'INV-SEG-01',
    lastMaintenance: new Date().toISOString(),
    purchaseDate: '2023-01-01',
    warrantyExpiration: '2026-01-01',
    assignedUser: MOCK_USERS[0]
  },
  {
    id: '2',
    name: 'Cámara Domo PTZ - Parque Central',
    code: 'CAM-015',
    status: 'MAINTENANCE',
    type: 'SEGURIDAD',
    location: 'Área Verde',
    brand: 'Hikvision',
    model: 'IP-PRO-4K',
    serialNumber: 'SN-CAM-776',
    inventoryNumber: 'INV-SEG-02',
    lastMaintenance: new Date().toISOString(),
    purchaseDate: '2023-05-15',
    warrantyExpiration: '2025-05-15',
    assignedUser: MOCK_USERS[2]
  }
];

const MOCK_TICKETS = [
  {
    id: '1',
    ticketNumber: 'REC-001',
    title: 'Reporte de Pago - Cuota Junio - Casa 14',
    status: 'realizado',
    priority: 'normal',
    serviceType: 'RECAUDACIÓN',
    createdAt: new Date().toISOString(),
    eventDate: new Date().toISOString().split('T')[0],
    eventTime: '10:00',
    eventDuration: 0,
    reportedBy: MOCK_USERS[1],
    reportedById: 'residente_1',
    description: 'Transferencia realizada por concepto de mantenimiento mensual y fondo de reserva.',
    equipmentId: '1',
    equipment: MOCK_EQUIPMENT[0]
  },
  {
    id: '2',
    ticketNumber: 'INC-002',
    title: 'Falla en Control de Acceso - Portón Visitantes',
    status: 'solicitado',
    priority: 'importante',
    serviceType: 'MANTENIMIENTO',
    createdAt: new Date().toISOString(),
    eventDate: new Date().toISOString().split('T')[0],
    eventTime: '14:00',
    eventDuration: 1,
    reportedBy: MOCK_USERS[2],
    reportedById: 'vigilante_1',
    description: 'El sensor de las tarjetas de visitantes no está leyendo correctamente.',
    equipmentId: '1',
    equipment: MOCK_EQUIPMENT[0]
  }
];

const MOCK_ACTIVITIES = [
  {
    id: '1',
    title: 'Conciliación Bancaria Mensual',
    description: 'Verificar pagos recibidos vs depósitos en cuenta de la cerrada.',
    status: 'todo',
    priority: 'importante',
    visibility: 'team',
    due_date: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    creator: { nombre_completo: 'Erick Campa (Admin)' },
    participants: [{ user_id: 'admin_erick', user: { nombre_completo: 'Erick Campa (Admin)' } }],
    comments: [
      { id: 'c1', content: 'Faltan de identificar 3 depósitos del fin de semana.', author: { nombre_completo: 'Erick Campa' }, createdAt: new Date().toISOString() }
    ],
    ticket: { ticketNumber: 'REC-001', title: 'Reporte de Pago - Casa 14' }
  }
];

const MOCK_INSUMOS = [
  {
    id: '1',
    nombre: 'Tarjetas de Acceso RFID',
    descripcion: 'Tarjetas blancas para residentes y personal.',
    cantidad: 45,
    unidad: 'Piezas',
    ubicacion: 'Oficina Admin',
    last_entry: new Date().toISOString(),
    last_exit: null,
    last_entry_quantity: 100,
    last_exit_quantity: null
  },
  {
    id: '2',
    nombre: 'Controles Remotos Portón',
    descripcion: 'Controles de 3 botones para residentes.',
    cantidad: 12,
    unidad: 'Piezas',
    ubicacion: 'Caseta Vigilancia',
    last_entry: new Date().toISOString(),
    last_exit: new Date().toISOString(),
    last_entry_quantity: 20,
    last_exit_quantity: 2
  }
];

const MOCK_INSUMO_HISTORY = [
  {
    date: new Date().toISOString(),
    ticketNumber: 'ENT-001',
    ticketTitle: 'Compra de stock inicial',
    quantity: 100
  }
];

client.interceptors.request.use(
  async (config) => {
    const isOffline = false;

    // Inyectar el token de autenticación de sessionStorage
    const token = sessionStorage.getItem('authToken');
    if (token) {
      config.headers = config.headers || {};
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    if (isOffline) {
      const url = config.url || '';
      let mockData: any = { success: true, data: [] };

      if (url.includes('/dashboard/stats')) {
        mockData = {
          success: true,
          data: {
            totalTickets: MOCK_TICKETS.length,
            openTickets: MOCK_TICKETS.filter(t => t.status === 'solicitado').length,
            pendingTickets: MOCK_TICKETS.filter(t => t.status === 'confirmado').length,
            inProgressTickets: MOCK_TICKETS.filter(t => t.status === 'realizado').length,
            closedTickets: MOCK_TICKETS.filter(t => t.status === 'cancelado').length,
            totalEquipment: MOCK_EQUIPMENT.length,
            operationalEquipment: MOCK_EQUIPMENT.filter(e => e.status === 'OPERATIONAL').length,
            equipmentInRepair: MOCK_EQUIPMENT.filter(e => e.status === 'MAINTENANCE').length,
            totalUsers: MOCK_USERS.length,
            activeUsers: MOCK_USERS.filter(u => u.isActive).length,
            recentTickets: MOCK_TICKETS.slice(0, 5)
          }
        };
      }
      else if (url.includes('/departments') || url.includes('/users/departments')) {
        mockData = { success: true, data: MOCK_DEPARTMENTS };
      }
      else if (url.includes('/users')) {
        if (url.includes('/modules')) {
          mockData = { success: true, data: ['dashboard', 'tickets', 'usuarios', 'equipos', 'reportes', 'configuracion', 'supplies'] };
        } else if (url.includes('/permissions')) {
          mockData = { success: true, data: [{ id: '1', module: 'dashboard', action: 'read' }, { id: '2', module: 'supplies', action: 'read' }, { id: '3', module: 'tickets', action: 'read' }, { id: '4', module: 'equipos', action: 'read' }] };
        } else if (url.match(/\/users\/[a-zA-Z0-9_-]+$/)) {
          const userId = url.split('/').pop();
          const user = MOCK_USERS.find(u => u.id === userId) || MOCK_USERS[0];
          mockData = { success: true, data: user };
        } else {
          mockData = {
            success: true,
            data: MOCK_USERS,
            pagination: { total: MOCK_USERS.length, page: 1, limit: 10, totalPages: 1 }
          };
        }
      }
      else if (url.includes('/tickets')) {
        if (url.includes('limit=1000')) {
          mockData = { success: true, data: MOCK_TICKETS };
        } else if (url.match(/\/tickets\/[a-zA-Z0-9_-]+$/)) {
          const ticketId = url.split('/').pop();
          const ticket = MOCK_TICKETS.find(t => t.id === ticketId) || MOCK_TICKETS[0];
          mockData = { success: true, data: ticket };
        } else {
          mockData = {
            success: true,
            data: MOCK_TICKETS,
            pagination: { total: MOCK_TICKETS.length, page: 1, limit: 10, totalPages: 1 }
          };
        }
      }
      else if (url.includes('/equipment')) {
        if (url.includes('limit=10000')) {
          mockData = { success: true, data: MOCK_EQUIPMENT };
        } else if (url.includes('/statistics')) {
          mockData = {
            success: true,
            data: {
              total: MOCK_EQUIPMENT.length,
              byStatus: { OPERATIONAL: 1, MAINTENANCE: 1 },
              byType: { SEGURIDAD: 2 },
              warrantyExpiring: 1,
              warrantyExpired: 0
            }
          };
        } else if (url.match(/\/equipment\/[a-zA-Z0-9_-]+$/)) {
          const eqId = url.split('/').pop();
          const eq = MOCK_EQUIPMENT.find(e => e.id === eqId) || MOCK_EQUIPMENT[0];
          mockData = { success: true, data: eq };
        } else {
          mockData = {
            success: true,
            data: MOCK_EQUIPMENT,
            pagination: { total: MOCK_EQUIPMENT.length, page: 1, limit: 10, totalPages: 1 }
          };
        }
      }
      else if (url.includes('/activities')) {
        if (url.includes('/comments')) {
          mockData = { success: true, data: { id: Date.now().toString(), content: 'Comentario simulado', author: { nombre_completo: 'Erick Campa' }, createdAt: new Date().toISOString() } };
        } else {
          mockData = { success: true, data: MOCK_ACTIVITIES };
        }
      }
      else if (url.includes('/insumos')) {
        if (url.includes('/history')) {
          mockData = { success: true, data: MOCK_INSUMO_HISTORY };
        } else {
          mockData = { success: true, data: MOCK_INSUMOS };
        }
      }
      else if (url.includes('/notifications')) {
        if (url.includes('/unread-count')) mockData = { success: true, data: { count: 3 } };
        else mockData = { success: true, data: { data: [], total: 0 } };
      }

      throw {
        config,
        response: {
          data: mockData,
          status: 200,
          statusText: 'OK',
          headers: {},
          config
        },
        isMock: true
      };
    }
    return config;
  },
  (error) => Promise.reject(error)
);

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.isMock) {
      return Promise.resolve(error.response);
    }

    if (error.response?.status === 401) {
      // 1. NUNCA redirigir si el error viene del endpoint de login
      const url = error.config?.url || '';
      if (url.includes('/auth/login')) {
        return Promise.reject(error);
      }

      // 2. Verificar si ya estamos en la página de login de forma más robusta para móviles/Capacitor
      const currentPath = window.location.href.toLowerCase();
      const isLoginPage = currentPath.includes('login') || currentPath.endsWith('/') || currentPath.includes('index.html');

      if (!isLoginPage) {
        sessionStorage.removeItem('authToken');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const apiClient = client;
export default apiClient;
