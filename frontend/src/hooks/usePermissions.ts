import { useState, useEffect, useCallback } from 'react';
import { UserPermission, PermissionModule, PermissionAction } from '@/types';
import { permissionService } from '@/services/permissionService';
import { useAuth } from '@/hooks/useAuth';

interface UsePermissionsReturn {
  permissions: UserPermission[];
  loading: boolean;
  error: string | null;
  hasPermission: (module: PermissionModule, action: PermissionAction) => boolean;
  hasPermissions: (permissions: Array<{ module: PermissionModule, action: PermissionAction }>) => boolean;
  hasModuleAccess: (module: PermissionModule) => boolean;
  allowedModules: PermissionModule[];
  refreshPermissions: () => Promise<void>;
  canCreate: (module: PermissionModule) => boolean;
  canEdit: (module: PermissionModule) => boolean;
  canDelete: (module: PermissionModule) => boolean;
  canView: (module: PermissionModule) => boolean;
  canExport: (module: PermissionModule) => boolean;
  canAssign: (module: PermissionModule) => boolean;
}

export const usePermissions = (): UsePermissionsReturn => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [allowedModules, setAllowedModules] = useState<PermissionModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar permisos del usuario
  const loadUserPermissions = useCallback(async () => {
    if (!user) {
      setPermissions([]);
      setAllowedModules([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [userPermissions, modules] = await Promise.all([
        permissionService.getUserPermissions(user.id),
        permissionService.getUserModuleAccess(user.id)
      ]);

      setPermissions(userPermissions);
      setAllowedModules(modules);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error cargando permisos';
      setError(errorMessage);
      console.error('Error loading user permissions:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Cargar permisos al montar el componente o cuando cambie el usuario
  useEffect(() => {
    loadUserPermissions();
  }, [loadUserPermissions]);

  // Verificar si el usuario tiene un permiso específico
  const hasPermission = useCallback((module: PermissionModule, action: PermissionAction): boolean => {
    if (!user) return false;

    // Los administradores y mesa directiva (presidentes/vicepresidentes) tienen todos los permisos
    if (['admin', 'presidente', 'vicepresidente'].includes(user.role)) return true;

    // Lógica basada en roles fijos (según requerimientos residenciales)
    if (user.role === 'tecnico' || user.role === 'technician') {
      // Técnico: Dashboard, Equipos, Tickets (Edición y Eliminación permitidas)
      if (['dashboard', 'equipment', 'tickets'].includes(module)) {
        return true;
      }
      return false;
    }

    if (user.role === 'tesorero') {
      // Tesorero: Balance de Cuotas, Reportes, Actividades (Dashboard) y Calendario (Tickets)
      if (['equipment', 'reports', 'dashboard', 'profile'].includes(module)) return true;
      if (module === 'tickets') {
        return action === 'view' || action === 'create';
      }
      return false;
    }

    if (user.role === 'eventos') {
      // Encargado de Eventos: Reservación de Áreas (Tickets) completo y Catálogo de Eventos (Users)
      if (['tickets', 'users', 'profile'].includes(module)) return true;
      return false;
    }

    if (user.role === 'guardia') {
      // Guardia de Seguridad: Entradas a la Cerrada (Supplies) completo
      if (['supplies', 'profile'].includes(module)) return true;
      return false;
    }

    if (user.role === 'inventario') {
      // Inventario: Equipos e Insumos (Full), Tickets (Solo crear/ver propios)
      if (['equipment', 'supplies'].includes(module)) return true;
      if (module === 'tickets') {
        return action === 'view' || action === 'create';
      }
      return false;
    }

    if (user.role === 'usuario' || user.role === 'user' || user.role === 'residente') {
      // Residente / Usuario: Solo Reservaciones de Áreas (crear/ver propios) y Perfil
      if (module === 'tickets') {
        return action === 'view' || action === 'create';
      }
      if (module === 'profile') return true;
      return false;
    }

    return permissions.some(up =>
      up.permission?.module === module &&
      up.permission?.action === action &&
      up.isActive &&
      (!up.expiresAt || new Date(up.expiresAt) > new Date())
    );
  }, [user, permissions]);

  // Verificar múltiples permisos (todos deben cumplirse)
  const hasPermissions = useCallback((requiredPermissions: Array<{ module: PermissionModule, action: PermissionAction }>): boolean => {
    return requiredPermissions.every(perm => hasPermission(perm.module, perm.action));
  }, [hasPermission]);

  // Verificar si tiene acceso a un módulo (permiso de vista)
  const hasModuleAccess = useCallback((module: PermissionModule): boolean => {
    return hasPermission(module, 'view');
  }, [hasPermission]);

  // Funciones de conveniencia para acciones específicas
  const canCreate = useCallback((module: PermissionModule): boolean => {
    return hasPermission(module, 'create');
  }, [hasPermission]);

  const canEdit = useCallback((module: PermissionModule): boolean => {
    return hasPermission(module, 'edit');
  }, [hasPermission]);

  const canDelete = useCallback((module: PermissionModule): boolean => {
    return hasPermission(module, 'delete');
  }, [hasPermission]);

  const canView = useCallback((module: PermissionModule): boolean => {
    return hasPermission(module, 'view');
  }, [hasPermission]);

  const canExport = useCallback((module: PermissionModule): boolean => {
    return hasPermission(module, 'export');
  }, [hasPermission]);

  const canAssign = useCallback((module: PermissionModule): boolean => {
    return hasPermission(module, 'assign');
  }, [hasPermission]);

  // Función para refrescar permisos
  const refreshPermissions = useCallback(async (): Promise<void> => {
    await loadUserPermissions();
  }, [loadUserPermissions]);

  return {
    permissions,
    loading,
    error,
    hasPermission,
    hasPermissions,
    hasModuleAccess,
    allowedModules,
    refreshPermissions,
    canCreate,
    canEdit,
    canDelete,
    canView,
    canExport,
    canAssign
  };
};

// Hook para verificar permisos específicos (útil para componentes condicionales)
export const usePermissionCheck = (module: PermissionModule, action: PermissionAction) => {
  const { hasPermission, loading } = usePermissions();

  return {
    hasPermission: hasPermission(module, action),
    loading
  };
};

// Hook para verificar acceso a múltiples permisos
export const useMultiplePermissions = (requiredPermissions: Array<{ module: PermissionModule, action: PermissionAction }>) => {
  const { hasPermissions, loading } = usePermissions();

  return {
    hasAllPermissions: hasPermissions(requiredPermissions),
    loading
  };
};

// Hook para verificar acceso a módulo completo
export const useModuleAccess = (module: PermissionModule) => {
  const { hasModuleAccess, loading } = usePermissions();

  return {
    hasAccess: hasModuleAccess(module),
    loading
  };
};