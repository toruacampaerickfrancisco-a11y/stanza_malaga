import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/hooks/useAuth.tsx';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { SessionTimeout } from '@/components/SessionTimeout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import UsersPage from '@/pages/Users';
import EquipmentPage from '@/pages/Equipment';
import TicketsPage from '@/pages/Tickets';
import ReportsPage from '@/pages/Reports';
import ProfilePage from '@/pages/Profile';
import PermissionsPage from '@/pages/Permissions';
import DepartmentsPage from '@/pages/Departments';
import Unauthorized from '@/pages/Unauthorized';
import NotFound from '@/pages/NotFound';
import Insumos from '@/pages/Insumos';
import ActivitiesPage from '@/pages/Activities';
import CalendarPage from '@/pages/Calendar';
// ...existing code...

const HomeRedirect = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) return null;
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role === 'usuario' || user?.role === 'user' || user?.role === 'residente') {
    return <Navigate to="/calendario" replace />;
  }
  
  if (user?.role === 'guardia') {
    return <Navigate to="/insumos" replace />;
  }

  if (user?.role === 'eventos') {
    return <Navigate to="/calendario" replace />;
  }

  if (user?.role === 'tesorero') {
    return <Navigate to="/reportes" replace />;
  }

  return <Navigate to="/dashboard" replace />;
};

const AppContent: React.FC = () => {
  const { isSessionExpired, continueSession, logout } = useAuth();

  return (
    <div className="App">
      <SessionTimeout 
        isOpen={isSessionExpired} 
        onContinue={continueSession} 
        onLogout={logout} 
      />
      <Routes>
                    {/* Insumos - Requiere permiso de inventario */}
                    <Route
                      path="/insumos"
                      element={
                        <ProtectedRoute requiredModule="supplies" requiredAction="view">
                          <Insumos />
                        </ProtectedRoute>
                      }
                    />
          {/* Rutas públicas */}
          <Route path="/login" element={<Login />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Rutas protegidas */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute 
                requiredModule="dashboard" 
                requiredAction="view"
              >
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* Gestión de usuarios - Requiere permiso de vista de usuarios */}
          <Route
            path="/usuarios"
            element={
              <ProtectedRoute 
                requiredModule="users" 
                requiredAction="view"
              >
                <UsersPage />
              </ProtectedRoute>
            }
          />

          {/* Catálogo de áreas/eventos */}
          <Route
            path="/departamentos"
            element={
              <ProtectedRoute 
                requiredModule="users" 
                requiredAction="view"
              >
                <DepartmentsPage />
              </ProtectedRoute>
            }
          />

          {/* Gestión de equipos - Requiere permiso de vista de equipos */}
          <Route
            path="/equipos"
            element={
              <ProtectedRoute 
                requiredModule="equipment" 
                requiredAction="view"
              >
                <EquipmentPage />
              </ProtectedRoute>
            }
          />

          {/* Tickets - Requiere permiso de vista de tickets */}
          <Route
            path="/tickets"
            element={
              <ProtectedRoute 
                requiredModule="tickets" 
                requiredAction="view"
              >
                <TicketsPage />
              </ProtectedRoute>
            }
          />

          {/* Calendario de Reservaciones - Requiere permiso de vista de tickets */}
          <Route
            path="/calendario"
            element={
              <ProtectedRoute 
                requiredModule="tickets" 
                requiredAction="view"
              >
                <CalendarPage />
              </ProtectedRoute>
            }
          />

          {/* Reportes - Requiere permiso de vista de reportes */}
          <Route
            path="/reportes"
            element={
              <ProtectedRoute 
                requiredModule="reports" 
                requiredAction="view"
              >
                <ReportsPage />
              </ProtectedRoute>
            }
          />

          {/* Bitácora de Actividades */}
          <Route
            path="/actividades"
            element={
              <ProtectedRoute allowedRoles={['admin', 'presidente', 'vicepresidente']}>
                <ActivitiesPage />
              </ProtectedRoute>
            }
          />

          {/* Perfil de usuario - Todos los usuarios autenticados */}
          <Route
            path="/perfil"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          {/* Gestión de Permisos - Solo administradores */}
          <Route
            path="/permisos"
            element={
              <ProtectedRoute 
                requiredModule="permissions" 
                requiredAction="view"
              >
                <PermissionsPage />
              </ProtectedRoute>
            }
          />

          {/* Ruta por defecto */}
          <Route path="/" element={<HomeRedirect />} />

          {/* Página 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;