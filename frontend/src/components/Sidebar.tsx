import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth.tsx';
import {
  Menu,
  X,
  LayoutDashboard,
  Users,
  Building,
  Monitor,
  Ticket,
  BarChart,
  Shield,
  Settings,
  LogOut,
  ListTodo,
  Calendar
} from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionModule } from '@/types';
import SettingsDropdown from './SettingsDropdown';
import styles from './Sidebar.module.css';

interface MenuItem {
  path: string;
  label: string;
  icon: React.ElementType;
  roles: string[];
  module: PermissionModule; // Nuevo campo para asociar con permisos
}

const menuItems: MenuItem[] = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    roles: ['admin', 'presidente', 'vicepresidente'],
    module: 'dashboard'
  },
  {
    path: '/usuarios',
    label: 'Usuarios',
    icon: Users,
    roles: ['admin'],
    module: 'users'
  },
  {
    path: '/departamentos',
    label: 'Catálogo de Eventos',
    icon: Building,
    roles: ['admin', 'presidente', 'vicepresidente', 'eventos'],
    module: 'users'
  },
  {
    path: '/equipos',
    label: 'Balance de Cuotas',
    icon: Monitor,
    roles: ['admin', 'presidente', 'vicepresidente', 'tesorero'],
    module: 'equipment'
  },
  {
    path: '/tickets',
    label: 'Reservación de Áreas',
    icon: Ticket,
    roles: ['admin', 'presidente', 'vicepresidente', 'eventos', 'residente'],
    module: 'tickets'
  },
  {
    path: '/calendario',
    label: 'Calendario de Eventos',
    icon: Calendar,
    roles: ['admin', 'presidente', 'vicepresidente', 'eventos', 'residente', 'tesorero'],
    module: 'tickets'
  },
  {
    path: '/actividades',
    label: 'Proyectos por Realizar',
    icon: ListTodo,
    roles: ['admin', 'presidente', 'vicepresidente', 'tesorero'],
    module: 'dashboard'
  },
  {
    path: '/insumos',
    label: 'Entradas a la Cerrada',
    icon: Shield,
    roles: ['admin', 'presidente', 'vicepresidente', 'guardia'],
    module: 'supplies'
  },
  {
    path: '/reportes',
    label: 'Reportes',
    icon: BarChart,
    roles: ['admin', 'presidente', 'vicepresidente', 'tesorero'],
    module: 'reports'
  }
];

const Sidebar: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { user, logout } = useAuth();
  const { hasModuleAccess } = usePermissions();
  const navigate = useNavigate();

  const isNativeApp = window.location.origin.includes('localhost') && !window.location.port;
  const baseUrl = (isNativeApp || window.location.protocol.startsWith('capacitor'))
    ? 'http://10.0.2.2:3000'
    : window.location.origin;
  const logoUrl = `${baseUrl}/logo.png`;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const openSettingsControl = () => {
    setShowSettings(true);
  };

  // Filtrar elementos del menú por permisos del usuario
  const filteredMenuItems = menuItems.filter(item => {
    if (!user) return false;

    // Verificar si tiene acceso al módulo mediante permisos
    const hasPermission = hasModuleAccess(item.module);

    // Fallback a roles para compatibilidad (admin siempre tiene acceso)
    const hasRole = item.roles.includes(user.role);

    return hasPermission || hasRole;
  });

  const toggleMobile = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  const closeMobile = () => {
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        className={styles.mobileMenuButton}
        onClick={toggleMobile}
        aria-label="Abrir menú"
      >
        <Menu size={24} />
      </button>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div className={styles.mobileOverlay} onClick={closeMobile} />
      )}

      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''} ${isMobileOpen ? styles.mobileOpen : ''}`}>

        <div className={styles.sidebarHeader}>
          <button
            className={styles.closeButton}
            onClick={closeMobile}
            aria-label="Cerrar menú"
          >
            <X size={24} />
          </button>
          <div className={styles.logo}>
            <img
              src={logoUrl}
              alt="Logo"
              className={styles.logoImage}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            {!isCollapsed && (
              <div className={styles.logoText}>
                <h2>Stanza Malaga</h2>
                <p>Seccion Almeria</p>
              </div>
            )}
          </div>
          <button
            className={styles.collapseButton}
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label={isCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
          >
            <Menu size={20} />
          </button>
        </div>

        <nav className={styles.nav}>
          <ul className={styles.menuList}>
            {filteredMenuItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `${styles.menuItem} ${isActive ? styles.active : ''}`
                  }
                  onClick={closeMobile}
                >
                  <item.icon size={20} />
                  {!isCollapsed && <span className={styles.menuLabel}>{item.label}</span>}
                </NavLink>
              </li>
            ))}


            {/* Botón Salir */}
            <li>
              <button
                className={styles.menuItem}
                onClick={handleLogout}
                title="Cerrar sesión"
                style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
              >
                <LogOut size={20} />
                {!isCollapsed && (
                  <span className={styles.menuLabel}>Salir</span>
                )}
              </button>
            </li>
          </ul>
        </nav>
      </aside>

      {/* Modal de Centro de Control */}
      {showSettings && (
        <SettingsDropdown onClose={() => setShowSettings(false)} />
      )}
    </>
  );
};

export default Sidebar;