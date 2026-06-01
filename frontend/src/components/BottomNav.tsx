import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Ticket,
  User,
  Menu,
  LogOut,
  X,
  Building,
  Monitor,
  ListTodo,
  Shield,
  BarChart,
  Users
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth.tsx';
import { usePermissions } from '@/hooks/usePermissions';
import styles from './BottomNav.module.css';

const BottomNav: React.FC = () => {
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const { hasModuleAccess } = usePermissions();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
    setIsMoreMenuOpen(false);
  };

  const menuItems = [
    { path: '/dashboard', label: 'Inicio', icon: LayoutDashboard, module: 'dashboard' },
    { path: '/calendario', label: 'Agenda', icon: Calendar, module: 'tickets' },
    { path: '/tickets', label: 'Reservar', icon: Ticket, module: 'tickets' },
    { path: '/usuarios', label: 'Usuarios', icon: Users, module: 'users' },
    { path: '/departamentos', label: 'Eventos', icon: Building, module: 'users' },
    { path: '/equipos', label: 'Cuotas', icon: Monitor, module: 'equipment' },
    { path: '/actividades', label: 'Proyectos', icon: ListTodo, module: 'dashboard' },
    { path: '/insumos', label: 'Accesos', icon: Shield, module: 'supplies' },
    { path: '/reportes', label: 'Reportes', icon: BarChart, module: 'reports' },
    { path: '/perfil', label: 'Perfil', icon: User, module: 'profile' as any },
  ];

  const allowedItems = menuItems.filter(item => hasModuleAccess(item.module as any));

  // Forzamos que 'supplies' (Accesos) vaya siempre al menú "Más"
  const itemsForBottomBar = allowedItems.filter(item => item.module !== 'supplies');
  const itemsForMoreMenu = [
    ...allowedItems.filter(item => item.module === 'supplies'),
    ...itemsForBottomBar.slice(4)
  ];

  const mainNavItems = itemsForBottomBar.slice(0, 4);

  return (
    <>
      {isMoreMenuOpen && (
        <div className={styles.moreMenuOverlay}>
          <div className={styles.moreMenuHeader}>
            <h3>Menú Principal</h3>
            <button onClick={() => setIsMoreMenuOpen(false)}><X size={24} /></button>
          </div>
          <div className={styles.moreMenuGrid}>
            {itemsForMoreMenu.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={styles.moreMenuItem}
                onClick={() => setIsMoreMenuOpen(false)}
              >
                <div className={styles.moreMenuIcon}><item.icon size={28} /></div>
                <span>{item.label}</span>
              </NavLink>
            ))}
            <button className={styles.moreMenuItem} onClick={handleLogout}>
              <div className={`${styles.moreMenuIcon} ${styles.logoutIcon}`}><LogOut size={28} /></div>
              <span>Salir</span>
            </button>
          </div>
        </div>
      )}

      <nav className={styles.bottomNav}>
        {mainNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.active : ''}`
            }
          >
            <item.icon size={24} />
            <span className={styles.navLabel}>{item.label}</span>
          </NavLink>
        ))}

        <button
          className={`${styles.navItem} ${isMoreMenuOpen ? styles.active : ''}`}
          onClick={() => setIsMoreMenuOpen(true)}
        >
          <Menu size={24} />
          <span className={styles.navLabel}>Menú</span>
        </button>
      </nav>
    </>
  );
};

export default BottomNav;
