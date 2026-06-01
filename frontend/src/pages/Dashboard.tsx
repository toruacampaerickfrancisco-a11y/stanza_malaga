import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth.tsx';
import { apiClient } from '@/services/apiClient';
import { 
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import CustomIcon327 from '@/components/CustomIcon327';
import StatTriangle from '@/components/StatTriangle';
import styles from './Dashboard.module.css';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: 'primary' | 'success' | 'warning' | 'error' | 'info';
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, trend }) => {
  return (
    <div className={`${styles.statCard} ${styles[color]}`}>
      <div className={styles.statHeader}>
        <div className={styles.statIcon}>{icon}</div>
        <div className={styles.statInfo}>
          <h3 className={styles.statValue}>{value}</h3>
          <p className={styles.statTitle}>{title}</p>
        </div>
      </div>
      {trend && (
        <div className={styles.statTrend}>
          <TrendingUp 
            size={16} 
            className={trend.isPositive ? styles.trendUp : styles.trendDown}
          />
          <span className={trend.isPositive ? styles.trendUp : styles.trendDown}>
            {trend.value}%
          </span>
          <span className={styles.trendLabel}>vs mes anterior</span>
        </div>
      )}
    </div>
  );
};

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalTickets: 0,
    openTickets: 0,
    pendingTickets: 0,
    inProgressTickets: 0,
    closedTickets: 0,
    totalEquipment: 0,
    operationalEquipment: 0,
    equipmentInRepair: 0,
    totalUsers: 0,
    activeUsers: 0,
    recentTickets: [] as any[]
  });

  const fetchStats = useCallback(async () => {
    try {
      const response = await apiClient.get('/dashboard/stats');
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <Layout>
      <div className={styles.dashboard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
           <div>
             <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>Dashboard</h1>
             <p style={{ color: '#6b7280', margin: 0 }}>Resumen de actividad del sistema</p>
           </div>
           <button 
             onClick={fetchStats} 
             style={{ 
               display: 'flex', 
               alignItems: 'center', 
               gap: '0.5rem', 
               padding: '0.5rem 1rem', 
               background: 'white', 
               border: '1px solid #e5e7eb', 
               borderRadius: '0.5rem', 
               cursor: 'pointer',
               color: '#374151',
               fontWeight: 500,
               boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
             }}
             title="Actualizar datos"
           >
             <RefreshCw size={16} />
             Actualizar
           </button>
        </div>

        {/* Estadísticas principales - Estilo Triángulo */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-around', 
          alignItems: 'flex-start', 
          flexWrap: 'wrap', 
          marginBottom: '1.5rem',
          padding: '1.5rem',
          background: 'white',
          borderRadius: '1rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
          <StatTriangle 
            value={stats.totalTickets} 
            label="Total de Reservaciones" 
          />
          <StatTriangle 
            value={stats.totalEquipment} 
            label="Transacciones Registradas" 
          />
          <StatTriangle 
            value={stats.totalUsers} 
            label="Usuarios del Sistema" 
          />
        </div>

        {/* Estadísticas de Tickets - Estilo Triángulo */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-around', 
          alignItems: 'flex-start', 
          flexWrap: 'wrap', 
          marginBottom: '1.5rem',
          padding: '1.5rem',
          background: 'white',
          borderRadius: '1rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
          <StatTriangle 
            value={stats.openTickets} 
            label="Reservaciones Solicitadas" 
          />
          <StatTriangle 
            value={stats.pendingTickets} 
            label="Reservaciones Confirmadas" 
          />
          <StatTriangle 
            value={stats.inProgressTickets} 
            label="Reservaciones Realizadas" 
          />
          <StatTriangle 
            value={stats.closedTickets} 
            label="Reservaciones Canceladas" 
          />
        </div>

        {/* Estadísticas de Estado - Estilo Triángulo */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-around', 
          alignItems: 'flex-start', 
          flexWrap: 'wrap', 
          marginBottom: '2rem',
          padding: '1.5rem',
          background: 'white',
          borderRadius: '1rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
          <StatTriangle 
            value={stats.operationalEquipment} 
            label="Transacciones Pagadas" 
          />
          <StatTriangle 
            value={stats.equipmentInRepair} 
            label="Transacciones Pendientes" 
          />
          <StatTriangle 
            value={stats.activeUsers} 
            label="Usuarios Activos" 
          />
        </div>

        {/* Secciones adicionales según el rol */}
        <div className={styles.contentGrid}>
          <div className={styles.recentActivity}>
            <h3>Actividad Reciente</h3>
            <div className={styles.activityList}>
              {stats.recentTickets && stats.recentTickets.length > 0 ? (
                stats.recentTickets.map((ticket: any) => (
                  <div key={ticket.id} className={styles.activityItem}>
                    <div className={styles.activityIcon}>
                      <CustomIcon327 size={18} />
                    </div>
                    <div className={styles.activityContent}>
                      <p><strong>{ticket.ticketNumber}</strong> <span style={{ fontSize: '0.8em', color: '#666' }}>({ticket.status.replace('_', ' ')})</span></p>
                      <p>{ticket.title} - {ticket.reportedBy}</p>
                      <span>{new Date(ticket.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ padding: '1rem', color: '#666' }}>No hay actividad reciente.</p>
              )}
            </div>
          </div>

          <div className={styles.quickActions}>
            <h3>Acciones Rápidas</h3>
            <div className={styles.actionButtons}>
              <button 
                className="btn btn-primary"
                onClick={() => navigate('/tickets')}
              >
                <CustomIcon327 size={18} />
                Nueva Reservación
              </button>
              
              {(user?.role === 'admin' || user?.role === 'tecnico') && (
                <>
                  <button 
                    className="btn btn-secondary"
                    onClick={() => navigate('/equipos')}
                  >
                    <CustomIcon327 size={18} />
                    Registrar Pago
                  </button>
                  
                  <button 
                    className="btn btn-outline"
                    onClick={() => navigate('/reportes')}
                  >
                    Ver Reportes
                  </button>
                </>
              )}
              
              {user?.role === 'admin' && (
                <button 
                  className="btn btn-outline"
                  onClick={() => navigate('/usuarios')}
                >
                  <CustomIcon327 size={18} />
                  Gestionar Usuarios
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;