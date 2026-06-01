import React, { useState } from 'react';
import { 
  Bell, 
  Palette, 
  Building2, 
  Shield, 
  Database,
  Monitor,
  Save,
  X,
  Info,
  Users,
  BarChart3,
  Package,
  FileText
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth.tsx';
import { userService } from '@/services/userService';
import { showSuccess, showInfo } from '@/utils/swal';
import styles from './SettingsDropdown.module.css';

interface SettingsDropdownProps {
  onClose: () => void;
}

const SettingsDropdown: React.FC<SettingsDropdownProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<string>('system-info');
  const { user } = useAuth();
  const [totalUsers, setTotalUsers] = useState(0);
  
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('systemSettings');
    return saved ? JSON.parse(saved) : {
      notifications: {
        email: true,
        desktop: true,
        sound: false,
        maintenance: true,
        reports: true
      },
      theme: {
        mode: 'light',
        primaryColor: '#8B5CF6',
        secondaryColor: '#EC4899'
      },
      general: {
        autoRefresh: true,
        refreshInterval: 30,
        showWelcomeMessage: true,
        compactMode: false
      },
      company: {
        name: 'Stanza Malaga',
        fullName: 'Mesa Directiva Stanza Malaga Sección Almería',
        address: 'Stanza Malaga, Hermosillo, Sonora, México',
        phone: '+52 662 000 0000',
        email: 'contacto@stanzamalaga.com'
      }
    };
  });

  React.useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await userService.getUsers({ page: 1, limit: 1, isActive: 'true' });
        if (response.pagination) {
          setTotalUsers(response.pagination.total);
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };
    fetchStats();
  }, []);

  // Apply theme
  React.useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--color-primary', settings.theme.primaryColor);
    // Assuming we have a secondary color variable, if not we can add it or ignore
    // root.style.setProperty('--color-secondary', settings.theme.secondaryColor); 
  }, [settings.theme]);

  const handleComingSoon = () => {
    showInfo('Próximamente', 'Esta funcionalidad estará disponible en una futura actualización.');
  };

  // Información del sistema
  const systemInfo = {
    version: '2.1.0',
    buildDate: '2025-11-07',
    environment: 'Producción',
    database: 'PostgreSQL 15.2',
    server: 'Node.js 18.17.0',
    framework: 'React 18.2.0',
    lastUpdate: '07/11/2025 - 14:30',
    uptime: '5 días, 12 horas',
    activeUsers: Math.floor(totalUsers * 0.2) || 1, // Mock active users based on total
    totalUsers: totalUsers || 156
  };

  // Módulos del sistema
  const systemModules = [
    {
      id: 'dashboard',
      name: 'Tablero Principal',
      description: 'Panel de control con métricas y resúmenes',
      icon: BarChart3,
      status: 'active',
      version: '2.1.0',
      lastUpdate: '07/11/2025',
      permissions: ['admin', 'tecnico', 'usuario']
    },
    {
      id: 'users',
      name: 'Gestión de Usuarios',
      description: 'Administración de usuarios del sistema',
      icon: Users,
      status: 'active',
      version: '2.1.0',
      lastUpdate: '05/11/2025',
      permissions: ['admin']
    },
    {
      id: 'equipment',
      name: 'Balance de Cuotas',
      description: 'Control de ingresos, pagos y cuotas residenciales',
      icon: Package,
      status: 'active',
      version: '2.0.8',
      lastUpdate: '03/11/2025',
      permissions: ['admin', 'tecnico']
    },
    {
      id: 'tickets',
      name: 'Reservación de Áreas',
      description: 'Gestión de solicitudes y áreas comunes',
      icon: FileText,
      status: 'active',
      version: '2.1.0',
      lastUpdate: '07/11/2025',
      permissions: ['admin', 'tecnico', 'usuario']
    },
    {
      id: 'reports',
      name: 'Generación de Reportes',
      description: 'Creación y exportación de reportes',
      icon: BarChart3,
      status: 'active',
      version: '2.0.9',
      lastUpdate: '06/11/2025',
      permissions: ['admin', 'tecnico']
    },
    {
      id: 'permissions',
      name: 'Control de Permisos',
      description: 'Administración de roles y permisos',
      icon: Shield,
      status: 'active',
      version: '2.1.0',
      lastUpdate: '05/11/2025',
      permissions: ['admin']
    }
  ];

  const handleSettingChange = (category: string, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [key]: value
      }
    }));
  };

  const saveSettings = async () => {
    localStorage.setItem('systemSettings', JSON.stringify(settings));
    await showSuccess('Configuración guardada exitosamente');
    onClose();
  };

  const tabs = [
    { id: 'system-info', label: 'Información del Sistema', icon: Info },
    { id: 'modules', label: 'Módulos del Sistema', icon: Package },
    { id: 'general', label: 'Configuración General', icon: Monitor },
    { id: 'notifications', label: 'Notificaciones', icon: Bell },
    { id: 'theme', label: 'Tema', icon: Palette },
    { id: 'company', label: 'Empresa', icon: Building2 },
    { id: 'security', label: 'Seguridad', icon: Shield },
    { id: 'database', label: 'Base de Datos', icon: Database }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#10b981';
      case 'inactive': return '#ef4444';
      case 'maintenance': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Activo';
      case 'inactive': return 'Inactivo';
      case 'maintenance': return 'Mantenimiento';
      default: return 'Desconocido';
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Centro de Control del Sistema</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.sidebar}>
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  className={`${styles.tabButton} ${activeTab === tab.id ? styles.active : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className={styles.tabContent}>
            {activeTab === 'system-info' && (
              <div className={styles.section}>
                <h3>Información del Sistema ERP</h3>
                <div className={styles.systemGrid}>
                  <div className={styles.infoCard}>
                    <div className={styles.cardHeader}>
                      <Monitor size={20} />
                      <span>Información General</span>
                    </div>
                    <div className={styles.cardContent}>
                      <div className={styles.infoRow}>
                        <span>Versión:</span>
                        <span className={styles.version}>{systemInfo.version}</span>
                      </div>
                      <div className={styles.infoRow}>
                        <span>Fecha de compilación:</span>
                        <span>{systemInfo.buildDate}</span>
                      </div>
                      <div className={styles.infoRow}>
                        <span>Entorno:</span>
                        <span className={styles.environment}>{systemInfo.environment}</span>
                      </div>
                      <div className={styles.infoRow}>
                        <span>Última actualización:</span>
                        <span>{systemInfo.lastUpdate}</span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.infoCard}>
                    <div className={styles.cardHeader}>
                      <Database size={20} />
                      <span>Tecnologías</span>
                    </div>
                    <div className={styles.cardContent}>
                      <div className={styles.infoRow}>
                        <span>Base de datos:</span>
                        <span>{systemInfo.database}</span>
                      </div>
                      <div className={styles.infoRow}>
                        <span>Servidor:</span>
                        <span>{systemInfo.server}</span>
                      </div>
                      <div className={styles.infoRow}>
                        <span>Framework:</span>
                        <span>{systemInfo.framework}</span>
                      </div>
                      <div className={styles.infoRow}>
                        <span>Tiempo activo:</span>
                        <span>{systemInfo.uptime}</span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.infoCard}>
                    <div className={styles.cardHeader}>
                      <Users size={20} />
                      <span>Estadísticas de Uso</span>
                    </div>
                    <div className={styles.cardContent}>
                      <div className={styles.infoRow}>
                        <span>Usuarios activos:</span>
                        <span className={styles.activeUsers}>{systemInfo.activeUsers}</span>
                      </div>
                      <div className={styles.infoRow}>
                        <span>Total de usuarios:</span>
                        <span>{systemInfo.totalUsers}</span>
                      </div>
                      <div className={styles.infoRow}>
                        <span>Usuario actual:</span>
                        <span>{user?.fullName}</span>
                      </div>
                      <div className={styles.infoRow}>
                        <span>Rol:</span>
                        <span className={styles.userRole}>
                          {user?.role === 'admin' && 'Administrador'}
                          {user?.role === 'presidente' && 'Presidente'}
                          {user?.role === 'vicepresidente' && 'Vicepresidente'}
                          {user?.role === 'tesorero' && 'Tesorero'}
                          {user?.role === 'eventos' && 'Encargado de Eventos'}
                          {user?.role === 'guardia' && 'Guardia de Seguridad'}
                          {user?.role === 'residente' && 'Residente'}
                          {(user?.role === 'tecnico' || user?.role === 'technician') && 'Técnico / Tesorero'}
                          {(user?.role === 'usuario' || user?.role === 'user') && 'Usuario'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'modules' && (
              <div className={styles.section}>
                <h3>Módulos del Sistema</h3>
                <p className={styles.sectionDescription}>
                  Lista completa de módulos disponibles en el sistema ERP
                </p>
                <div className={styles.modulesGrid}>
                  {systemModules.map(module => {
                    const Icon = module.icon;
                    return (
                      <div key={module.id} className={styles.moduleCard}>
                        <div className={styles.moduleHeader}>
                          <div className={styles.moduleIcon}>
                            <Icon size={24} />
                          </div>
                          <div className={styles.moduleInfo}>
                            <h4>{module.name}</h4>
                            <span 
                              className={styles.moduleStatus}
                              style={{ color: getStatusColor(module.status) }}
                            >
                              ● {getStatusText(module.status)}
                            </span>
                          </div>
                        </div>
                        <p className={styles.moduleDescription}>{module.description}</p>
                        <div className={styles.moduleDetails}>
                          <div className={styles.moduleRow}>
                            <span>Versión:</span>
                            <span>{module.version}</span>
                          </div>
                          <div className={styles.moduleRow}>
                            <span>Última actualización:</span>
                            <span>{module.lastUpdate}</span>
                          </div>
                          <div className={styles.moduleRow}>
                            <span>Permisos:</span>
                            <div className={styles.permissionTags}>
                              {module.permissions.map(permission => (
                                <span key={permission} className={styles.permissionTag}>
                                  {permission === 'admin' && 'Admin'}
                                  {permission === 'tecnico' && 'Tesorero / Directiva'}
                                  {permission === 'usuario' && 'Residente'}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'general' && (
              <div className={styles.section}>
                <h3>Configuración General</h3>
                <div className={styles.setting}>
                  <label>
                    <input
                      type="checkbox"
                      checked={settings.general.autoRefresh}
                      onChange={(e) => handleSettingChange('general', 'autoRefresh', e.target.checked)}
                    />
                    Actualización automática de datos
                  </label>
                </div>
                <div className={styles.setting}>
                  <label>
                    Intervalo de actualización (segundos):
                    <input
                      type="number"
                      value={settings.general.refreshInterval}
                      onChange={(e) => handleSettingChange('general', 'refreshInterval', parseInt(e.target.value))}
                      min="10"
                      max="300"
                    />
                  </label>
                </div>
                <div className={styles.setting}>
                  <label>
                    <input
                      type="checkbox"
                      checked={settings.general.showWelcomeMessage}
                      onChange={(e) => handleSettingChange('general', 'showWelcomeMessage', e.target.checked)}
                    />
                    Mostrar mensaje de bienvenida
                  </label>
                </div>
                <div className={styles.setting}>
                  <label>
                    <input
                      type="checkbox"
                      checked={settings.general.compactMode}
                      onChange={(e) => handleSettingChange('general', 'compactMode', e.target.checked)}
                    />
                    Modo compacto
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className={styles.section}>
                <h3>Configuración de Notificaciones</h3>
                <div className={styles.setting}>
                  <label>
                    <input
                      type="checkbox"
                      checked={settings.notifications.email}
                      onChange={(e) => handleSettingChange('notifications', 'email', e.target.checked)}
                    />
                    Notificaciones por email
                  </label>
                </div>
                <div className={styles.setting}>
                  <label>
                    <input
                      type="checkbox"
                      checked={settings.notifications.desktop}
                      onChange={(e) => handleSettingChange('notifications', 'desktop', e.target.checked)}
                    />
                    Notificaciones de escritorio
                  </label>
                </div>
                <div className={styles.setting}>
                  <label>
                    <input
                      type="checkbox"
                      checked={settings.notifications.sound}
                      onChange={(e) => handleSettingChange('notifications', 'sound', e.target.checked)}
                    />
                    Sonidos de notificación
                  </label>
                </div>
                <div className={styles.setting}>
                  <label>
                    <input
                      type="checkbox"
                      checked={settings.notifications.maintenance}
                      onChange={(e) => handleSettingChange('notifications', 'maintenance', e.target.checked)}
                    />
                    Alertas de cuotas y reservas
                  </label>
                </div>
                <div className={styles.setting}>
                  <label>
                    <input
                      type="checkbox"
                      checked={settings.notifications.reports}
                      onChange={(e) => handleSettingChange('notifications', 'reports', e.target.checked)}
                    />
                    Reportes automáticos
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'theme' && (
              <div className={styles.section}>
                <h3>Configuración de Tema</h3>
                <div className={styles.setting}>
                  <label>
                    Modo de tema:
                    <select
                      value={settings.theme.mode}
                      onChange={(e) => handleSettingChange('theme', 'mode', e.target.value)}
                    >
                      <option value="light">Claro</option>
                      <option value="dark">Oscuro</option>
                      <option value="auto">Automático</option>
                    </select>
                  </label>
                </div>
                <div className={styles.setting}>
                  <label>
                    Color primario:
                    <input
                      type="color"
                      value={settings.theme.primaryColor}
                      onChange={(e) => handleSettingChange('theme', 'primaryColor', e.target.value)}
                    />
                  </label>
                </div>
                <div className={styles.setting}>
                  <label>
                    Color secundario:
                    <input
                      type="color"
                      value={settings.theme.secondaryColor}
                      onChange={(e) => handleSettingChange('theme', 'secondaryColor', e.target.value)}
                    />
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'company' && (
              <div className={styles.section}>
                <h3>Información de la Empresa</h3>
                <div className={styles.setting}>
                  <label>
                    Nombre corto:
                    <input
                      type="text"
                      value={settings.company.name}
                      onChange={(e) => handleSettingChange('company', 'name', e.target.value)}
                    />
                  </label>
                </div>
                <div className={styles.setting}>
                  <label>
                    Nombre completo:
                    <input
                      type="text"
                      value={settings.company.fullName}
                      onChange={(e) => handleSettingChange('company', 'fullName', e.target.value)}
                    />
                  </label>
                </div>
                <div className={styles.setting}>
                  <label>
                    Dirección:
                    <input
                      type="text"
                      value={settings.company.address}
                      onChange={(e) => handleSettingChange('company', 'address', e.target.value)}
                    />
                  </label>
                </div>
                <div className={styles.setting}>
                  <label>
                    Teléfono:
                    <input
                      type="tel"
                      value={settings.company.phone}
                      onChange={(e) => handleSettingChange('company', 'phone', e.target.value)}
                    />
                  </label>
                </div>
                <div className={styles.setting}>
                  <label>
                    Email:
                    <input
                      type="email"
                      value={settings.company.email}
                      onChange={(e) => handleSettingChange('company', 'email', e.target.value)}
                    />
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className={styles.section}>
                <h3>Configuración de Seguridad</h3>
                <div className={styles.setting}>
                  <button className={styles.actionButton} onClick={handleComingSoon}>
                    Cambiar contraseña
                  </button>
                </div>
                <div className={styles.setting}>
                  <button className={styles.actionButton} onClick={handleComingSoon} style={{ opacity: 0.6 }}>
                    Configurar autenticación de dos factores (Próximamente)
                  </button>
                </div>
                <div className={styles.setting}>
                  <button className={styles.actionButton} onClick={handleComingSoon} style={{ opacity: 0.6 }}>
                    Ver sesiones activas (Próximamente)
                  </button>
                </div>
                <div className={styles.setting}>
                  <button className={styles.actionButton} onClick={handleComingSoon} style={{ opacity: 0.6 }}>
                    Descargar datos personales (Próximamente)
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'database' && (
              <div className={styles.section}>
                <h3>Configuración de Base de Datos</h3>
                <div className={styles.setting}>
                  <button className={styles.actionButton} onClick={handleComingSoon} style={{ opacity: 0.6 }}>
                    Realizar respaldo (Próximamente)
                  </button>
                </div>
                <div className={styles.setting}>
                  <button className={styles.actionButton} onClick={handleComingSoon} style={{ opacity: 0.6 }}>
                    Restaurar desde respaldo (Próximamente)
                  </button>
                </div>
                <div className={styles.setting}>
                  <button className={styles.actionButton} onClick={handleComingSoon} style={{ opacity: 0.6 }}>
                    Optimizar base de datos (Próximamente)
                  </button>
                </div>
                <div className={styles.setting}>
                  <button className={styles.actionButton} onClick={handleComingSoon} style={{ opacity: 0.6 }}>
                    Ver estadísticas (Próximamente)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelButton} onClick={onClose}>
            Regresar
          </button>
          <button className={styles.saveButton} onClick={saveSettings}>
            <Save size={16} />
            Guardar Configuración
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsDropdown;