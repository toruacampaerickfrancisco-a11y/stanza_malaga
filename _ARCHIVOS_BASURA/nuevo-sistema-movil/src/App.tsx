import React, { useState, useEffect } from 'react';
import { apiClient } from './apiClient';
import { LogOut, User, Monitor, Ticket, QrCode, Menu, X } from 'lucide-react';

function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [view, setView] = useState('dashboard'); // dashboard, equipment, tickets

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('authToken');
    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.post('/auth/login', { username, password });
      if (res.data.success) {
        const userData = res.data.user;
        const token = res.data.token;
        localStorage.setItem('authToken', token);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
      }
    } catch (err: any) {
      setError('Credenciales incorrectas o error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    setUser(null);
    setUsername('');
    setPassword('');
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Cargando...</div>;

  if (!user) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center', 
        padding: '2rem',
        background: 'linear-gradient(135deg, #691b31 0%, #4a1222 100%)',
        color: 'white'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Bienestar Sonora</h1>
          <p style={{ opacity: 0.8 }}>Acceso Móvil</p>
        </div>
        
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input
            type="text"
            placeholder="Usuario"
            value={username}
            onChange={e => setUsername(e.target.value)}
            style={{ padding: '1rem', borderRadius: '0.5rem', border: 'none', fontSize: '1rem' }}
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{ padding: '1rem', borderRadius: '0.5rem', border: 'none', fontSize: '1rem' }}
          />
          {error && <p style={{ color: '#fca5a5', textAlign: 'center' }}>{error}</p>}
          <button 
            type="submit"
            style={{ 
              padding: '1rem', 
              borderRadius: '0.5rem', 
              border: 'none', 
              background: '#bc955c', 
              color: 'white', 
              fontWeight: 'bold', 
              fontSize: '1rem',
              marginTop: '1rem'
            }}
          >
            Entrar
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6', paddingBottom: '80px' }}>
      {/* Header */}
      <div style={{ 
        background: '#691b31', 
        color: 'white', 
        padding: '1rem', 
        position: 'sticky', 
        top: 0, 
        zIndex: 10,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ margin: 0, fontSize: '1.2rem' }}>Bienestar Móvil</h1>
        <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: 'white' }}>
          <LogOut size={20} />
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: '1rem' }}>
        <div style={{ 
          background: 'white', 
          padding: '1.5rem', 
          borderRadius: '1rem', 
          marginBottom: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>Hola, {user.nombre_completo?.split(' ')[0]}</h2>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem' }}>{user.cargo || 'Usuario'}</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <DashboardCard 
            icon={<Ticket size={32} color="#3b82f6" />} 
            title="Mis Tickets" 
            count="0" 
            onClick={() => setView('tickets')}
          />
          <DashboardCard 
            icon={<Monitor size={32} color="#8b5cf6" />} 
            title="Equipos" 
            count="0" 
            onClick={() => setView('equipment')}
          />
          <DashboardCard 
            icon={<QrCode size={32} color="#f59e0b" />} 
            title="Escanear" 
            onClick={() => alert('Función de escaneo próximamente')}
          />
          <DashboardCard 
            icon={<User size={32} color="#ec4899" />} 
            title="Perfil" 
            onClick={() => alert('Perfil de usuario')}
          />
        </div>
      </div>

      {/* Bottom Nav */}
      <div style={{ 
        position: 'fixed', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        background: 'white', 
        borderTop: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-around',
        padding: '0.75rem'
      }}>
        <NavButton icon={<Menu size={24} />} label="Inicio" active={view === 'dashboard'} onClick={() => setView('dashboard')} />
        <NavButton icon={<Ticket size={24} />} label="Tickets" active={view === 'tickets'} onClick={() => setView('tickets')} />
        <NavButton icon={<Monitor size={24} />} label="Equipos" active={view === 'equipment'} onClick={() => setView('equipment')} />
      </div>
    </div>
  );
}

const DashboardCard = ({ icon, title, count, onClick }: any) => (
  <div 
    onClick={onClick}
    style={{ 
      background: 'white', 
      padding: '1.5rem', 
      borderRadius: '1rem', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      gap: '0.5rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      cursor: 'pointer'
    }}
  >
    {icon}
    <span style={{ fontWeight: 600, color: '#374151' }}>{title}</span>
    {count && <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{count} activos</span>}
  </div>
);

const NavButton = ({ icon, label, active, onClick }: any) => (
  <button 
    onClick={onClick}
    style={{ 
      background: 'none', 
      border: 'none', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      gap: '0.25rem',
      color: active ? '#691b31' : '#9ca3af'
    }}
  >
    {icon}
    <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>{label}</span>
  </button>
);

export default App;
