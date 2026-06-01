import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, AuthState, LoginCredentials } from '@/types';
import { authService } from '@/services/authService';
import { mockAuth } from '@/services/mockAuth';

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<User>;
  logout: () => void;
  updateUser: (user: User) => void;
  isSessionExpired: boolean;
  continueSession: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });
  
  const [isSessionExpired, setIsSessionExpired] = useState(false);

  useEffect(() => {
    // Verificar si hay un token guardado al iniciar la aplicación
    const initAuth = async () => {
      try {
        const token = sessionStorage.getItem('authToken');
        if (token) {
          // Intentar primero con el API real
          let user;
          try {
            user = await authService.verifyToken(token);
          } catch {
            user = await mockAuth.verifyToken(token);
          }

          setState({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });
        } else {
          setState(prev => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        // Token inválido o expirado
        sessionStorage.removeItem('authToken');
        sessionStorage.removeItem('user');
        setState({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    };

    initAuth();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      // Intentar solo con el API real para asegurar sincronización con la BD
      const response = await authService.login(credentials);
      
      // Guardar token y usuario en sessionStorage
      sessionStorage.setItem('authToken', response.token);
      sessionStorage.setItem('user', JSON.stringify(response.user));
      
      setState({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
      });
      setIsSessionExpired(false);
      
      return response.user;
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const logout = () => {
    // Limpiar sessionStorage
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('user');
    
    setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
    setIsSessionExpired(false);
  };

  const continueSession = () => {
    setIsSessionExpired(false);
  };

  // Efecto para cerrar sesión por inactividad (3 minutos)
  useEffect(() => {
    if (!state.isAuthenticated) return;

    const INACTIVITY_TIME = 3 * 60 * 1000; // 3 minutos
    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      if (isSessionExpired) return; // No resetear si ya expiró
      
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsSessionExpired(true);
      }, INACTIVITY_TIME);
    };

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    
    // Agregar listeners
    events.forEach(event => {
      document.addEventListener(event, resetTimer);
    });

    // Iniciar timer
    resetTimer();

    // Limpiar listeners y timer
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach(event => {
        document.removeEventListener(event, resetTimer);
      });
    };
  }, [state.isAuthenticated, isSessionExpired]);

  const updateUser = (user: User) => {
    sessionStorage.setItem('user', JSON.stringify(user));
    setState(prev => ({ ...prev, user }));
  };

  const value: AuthContextType = {
    ...state,
    login,
    logout,
    updateUser,
    isSessionExpired,
    continueSession
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};