import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Users, Key, Save, X, AlertTriangle, Search, Filter, ChevronLeft, ChevronRight, Eye, FileSpreadsheet, ArrowLeft, Columns, Home } from 'lucide-react';
import Layout from '@/components/Layout';
import Table, { Column } from '@/components/Table';
import Modal from '@/components/Modal';
import Pagination from '@/components/Pagination';
import { User, Permission, UserPermission, PermissionModule } from '@/types';
import { permissionService } from '@/services/permissionService';
import { userService } from '@/services/userService';
import { useAuth } from '@/hooks/useAuth.tsx';
import { usePermissions } from '@/hooks/usePermissions';
import { exportToExcel } from '@/utils/exportUtils';
import styles from './Permissions.module.css';

interface UserWithPermissions extends User {
  userPermissions?: UserPermission[];
  permissionCount?: number;
}

const PermissionsPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { canAssign } = usePermissions();
  const navigate = useNavigate();
  
  const [users, setUsers] = useState<UserWithPermissions[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserWithPermissions | null>(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [showRoleTemplateModal, setShowRoleTemplateModal] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterModule, setFilterModule] = useState<PermissionModule | 'all'>('all');
  
  // New filters to match Users page style
  const [filterRole, setFilterRole] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterActive, setFilterActive] = useState('true');
  const [departments, setDepartments] = useState<string[]>([]);

  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'fullName', 'username', 'role', 'department', 'permissionCount', 'isActive', 'actions'
  ]);

  // Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      const [usersResponse, permissionsData, usersWithPermissions] = await Promise.all([
        userService.getUsers({ 
          page, 
          limit, 
          search: searchTerm, 
          isActive: filterActive,
          role: filterRole,
          department: filterDepartment
        }),
        permissionService.getPermissions(),
        permissionService.getAllUsersWithPermissions()
      ]);

      // Combinar datos de usuarios con sus permisos
      const enrichedUsers = usersResponse.data.map(user => {
        const userPerms = usersWithPermissions.find(up => up.userId === user.id);
        return {
          ...user,
          userPermissions: userPerms?.permissions || [],
          permissionCount: userPerms?.permissions.length || 0
        };
      });

      setUsers(enrichedUsers);
      setTotalPages(usersResponse.pagination?.totalPages || 1);
      setTotalUsers(usersResponse.pagination?.total || 0);
      setPermissions(permissionsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchTerm, filterActive, filterRole, filterDepartment]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load departments for filter
  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const response = await userService.getUsers({ limit: 1000, isActive: 'true' });
        const allUsers = Array.isArray(response) ? response : (response.data || []);
        const uniqueDepts = Array.from(new Set(allUsers.map((u: User) => u.department).filter(Boolean))) as string[];
        setDepartments(uniqueDepts.sort());
      } catch (error) {
        console.error('Error loading departments:', error);
      }
    };
    loadDepartments();
  }, []);

  const handleExport = async () => {
    try {
      setLoading(true);
      // Fetch all users and permissions
      const [usersResponse, usersWithPermissions] = await Promise.all([
        userService.getUsers({ page: 1, limit: 10000, search: searchTerm, isActive: 'true' }),
        permissionService.getAllUsersWithPermissions()
      ]);

      const allUsers = usersResponse.data || [];
      
      const dataToExport = allUsers.map(user => {
        const userPerms = usersWithPermissions.find(up => up.userId === user.id);
        const permissionCount = userPerms?.permissions.length || 0;
        
        return {
          'Nombre Completo': user.fullName,
          'Usuario': user.username,
          'Rol': user.role,
          'Área / Espacio': user.department || '-',
          'Permisos': permissionCount,
          'Estado': user.isActive ? 'ACTIVO' : 'INACTIVO'
        };
      });

      exportToExcel(dataToExport, 'Permisos_Usuarios');
    } catch (error) {
      console.error('Error exporting permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelect = (user: UserWithPermissions) => {
    // If called from row click or button, we might want to just select it, or open modal.
    // The original behavior was opening modal immediately on row click.
    // Now we want row click to select, and button to open modal.
    // But wait, onRowClick in Table usually selects if selectable is true?
    // Let's check Table component.
    // Assuming onRowClick is for interaction.
    // If I change onRowClick to just set selected user, then the button opens modal.
    setSelectedUser(user);
    setSelectedPermissions(user.userPermissions?.map(up => up.permissionId) || []);
    // setShowPermissionModal(true); // Don't open modal immediately on selection
  };

  const handleOpenManageModal = () => {
    if (selectedUser) {
        setSelectedPermissions(selectedUser.userPermissions?.map(up => up.permissionId) || []);
        setShowPermissionModal(true);
    }
  };

  const handlePermissionToggle = (permissionId: string) => {
    setSelectedPermissions(prev => 
      prev.includes(permissionId)
        ? prev.filter(id => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const handleSavePermissions = async () => {
    if (!selectedUser || !currentUser) return;

    try {
      setSaving(true);
      
      const currentPermissionIds = selectedUser.userPermissions?.map(up => up.permissionId) || [];
      
      // Permisos a revocar
      const toRevoke = currentPermissionIds.filter(id => !selectedPermissions.includes(id));
      
      // Permisos a asignar
      const toAssign = selectedPermissions.filter(id => !currentPermissionIds.includes(id));

      // Revocar permisos
      for (const permissionId of toRevoke) {
        await permissionService.revokePermission(selectedUser.id, permissionId);
      }

      // Asignar nuevos permisos
      if (toAssign.length > 0) {
        await permissionService.assignMultiplePermissions(selectedUser.id, toAssign, currentUser.id);
      }

      await loadData();
      setShowPermissionModal(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Error saving permissions:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleApplyRoleTemplate = async (role: string) => {
    if (!selectedUser || !currentUser) return;

    try {
      setSaving(true);
      await permissionService.applyRolePermissions(selectedUser.id, role, currentUser.id);
      await loadData();
      setShowRoleTemplateModal(false);
      
      // Actualizar permisos seleccionados
      const defaultPermissions = await permissionService.getDefaultPermissionsByRole(role);
      setSelectedPermissions(defaultPermissions);
    } catch (error) {
      console.error('Error applying role template:', error);
    } finally {
      setSaving(false);
    }
  };

  const getModuleBadge = (module: PermissionModule) => {
    const moduleConfig: Record<string, { label: string; class: string }> = {
      dashboard: { label: 'Dashboard', class: styles.moduleDashboard },
      users: { label: 'Residentes / Usuarios', class: styles.moduleUsers },
      equipment: { label: 'Cuotas de Mantto.', class: styles.moduleEquipment },
      tickets: { label: 'Reservaciones', class: styles.moduleTickets },
      reports: { label: 'Reportes', class: styles.moduleReports },
      profile: { label: 'Perfil', class: styles.moduleProfile },
      permissions: { label: 'Permisos', class: styles.modulePermissions },
      supplies: { label: 'Bitácora de Accesos', class: styles.moduleSupplies }
    };
    
    const config = moduleConfig[module] || { label: module, class: '' };
    return <span className={`${styles.moduleBadge} ${config.class}`}>{config.label}</span>;
  };

  const getActionBadge = (action: string) => {
    const actionConfig = {
      view: { label: 'Ver', class: styles.actionView },
      create: { label: 'Crear', class: styles.actionCreate },
      edit: { label: 'Editar', class: styles.actionEdit },
      delete: { label: 'Eliminar', class: styles.actionDelete },
      export: { label: 'Exportar', class: styles.actionExport },
      assign: { label: 'Asignar', class: styles.actionAssign }
    };
    
    const config = actionConfig[action as keyof typeof actionConfig] || { label: action, class: '' };
    return <span className={`${styles.actionBadge} ${config.class}`}>{config.label}</span>;
  };

  const getModuleLabel = (module: string) => {
    const labels: Record<string, string> = {
      dashboard: 'Dashboard',
      users: 'Residentes / Usuarios',
      equipment: 'Recaudación de Cuotas',
      tickets: 'Reservación de Áreas',
      reports: 'Reportes',
      profile: 'Perfil',
      permissions: 'Permisos',
      supplies: 'Bitácora de Accesos'
    };
    return labels[module] || module;
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      view: 'Ver',
      create: 'Crear',
      edit: 'Editar',
      delete: 'Eliminar',
      export: 'Exportar',
      assign: 'Asignar'
    };
    return labels[action] || action;
  };

  const filteredPermissions = filterModule === 'all' 
    ? permissions 
    : permissions.filter(p => p.module === filterModule);

  const groupedPermissions = filteredPermissions.reduce((acc, permission) => {
    if (!acc[permission.module]) {
      acc[permission.module] = [];
    }
    acc[permission.module].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  const filteredUsers = users.filter(user => {
    if (filterModule === 'all') return true;
    return user.userPermissions?.some(up => up.permission?.module === filterModule) || false;
  });

  const allColumns = [
    {
      key: 'fullName',
      label: 'Nombre Completo',
      render: (user: UserWithPermissions) => <div style={{ fontWeight: 500 }}>{user.fullName}</div>
    },
    {
      key: 'username',
      label: 'Usuario',
      render: (user: UserWithPermissions) => user.username
    },
    {
      key: 'role',
      label: 'Rol',
      render: (user: UserWithPermissions) => user.role
    },
    {
      key: 'department',
      label: 'Área / Espacio',
      render: (user: UserWithPermissions) => user.department || '-'
    },
    {
      key: 'permissionCount',
      label: 'Permisos',
      render: (user: UserWithPermissions) => user.permissionCount || 0
    },
    {
      key: 'isActive',
      label: 'Estado',
      render: (user: UserWithPermissions) => (
        user.isActive ? 'ACTIVO' : 'INACTIVO'
      )
    },
    {
      key: 'actions',
      label: 'Acciones',
      render: (user: UserWithPermissions) => (
        <button
          className={styles.btnEditar}
          onClick={(e) => {
            e.stopPropagation();
            handleUserSelect(user);
            setShowPermissionModal(true);
          }}
          style={{ padding: '4px 8px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          <Key size={14} /> Gestionar
        </button>
      )
    }
  ];

  const filteredColumns = allColumns.filter(col => visibleColumns.includes(col.key));

  const toggleColumn = (key: string) => {
    if (visibleColumns.includes(key)) {
      setVisibleColumns(visibleColumns.filter(k => k !== key));
    } else {
      setVisibleColumns([...visibleColumns, key]);
    }
  };

  if (!canAssign('permissions')) {
    return (
      <Layout>
        <div className={styles.unauthorizedContainer}>
          <AlertTriangle size={48} />
          <h2>Acceso Denegado</h2>
          <p>No tienes permisos para gestionar permisos de usuarios.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className={styles.container}>
        {!showPermissionModal && (
        <>
        <div className={styles.header} style={{ display: 'flex', alignItems: 'center', gap: '16px', justifyContent: 'flex-start' }}>
          <button 
            onClick={() => navigate('/dashboard')} 
            style={{ 
              background: 'white', 
              border: '1px solid #e5e7eb', 
              borderRadius: '8px', 
              padding: '8px', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: '#374151',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
              transition: 'all 0.2s'
            }}
            title="Volver al Panel Principal"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1>Gestión de Permisos</h1>
            <p>Administra los permisos de acceso de los usuarios del sistema</p>
          </div>
        </div>

        <div style={{ background: 'white', padding: 16, borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          {/* Filtros y Búsqueda */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, alignItems: 'end' }}>
               
               <div className="form-group" style={{ marginBottom: 0 }}>
                 <label className="form-label">Estado</label>
                 <select 
                    className="form-select"
                    value={filterActive} 
                    onChange={e => setFilterActive(e.target.value)}
                  >
                    <option value="all">Todos</option>
                    <option value="true">Activos</option>
                    <option value="false">Inactivos</option>
                  </select>
               </div>

               <div className="form-group" style={{ marginBottom: 0 }}>
                 <label className="form-label">Rol</label>
                 <select 
                    className="form-select"
                    value={filterRole} 
                    onChange={e => setFilterRole(e.target.value)}
                  >
                    <option value="all">Todos</option>
                    <option value="admin">Admin</option>
                    <option value="tecnico">Técnico</option>
                    <option value="usuario">Usuario</option>
                  </select>
               </div>

               <div className="form-group" style={{ marginBottom: 0 }}>
                 <label className="form-label">Área / Espacio</label>
                 <select 
                    className="form-select"
                    value={filterDepartment}
                    onChange={e => setFilterDepartment(e.target.value)}
                  >
                    <option value="all">Todos</option>
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
               </div>

               <div className="form-group" style={{ marginBottom: 0 }}>
                 <label className="form-label">Módulo</label>
                 <select 
                    className="form-select"
                    value={filterModule}
                    onChange={(e) => setFilterModule(e.target.value as PermissionModule | 'all')}
                  >
                     <option value="all">Todos</option>
                     <option value="dashboard">Dashboard</option>
                     <option value="users">Residentes / Usuarios</option>
                     <option value="equipment">Recaudación de Cuotas</option>
                     <option value="tickets">Reservaciones</option>
                     <option value="reports">Reportes</option>
                     <option value="permissions">Permisos</option>
                     <option value="supplies">Bitácora de Accesos</option>
                  </select>
               </div>
             </div>

             <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
               <div style={{ position: 'relative', flex: 1 }}>
                   <Search size={20} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                   <input 
                      className="form-input"
                      type="text" 
                      placeholder="Buscar usuarios..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{ width: '100%', paddingLeft: 40, height: '48px', fontSize: '1rem' }}
                   />
               </div>

               <button 
                  className="btn btn-outline"
                  onClick={handleExport}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#107c41', borderColor: '#107c41', height: '48px' }}
                  title="Exportar a Excel"
                >
                  <FileSpreadsheet size={20} />
                  Excel
                </button>
                
                <div style={{ position: 'relative' }}>
                    <button 
                      className="btn btn-outline"
                      onClick={() => setShowColumnSelector(!showColumnSelector)}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, height: '48px' }}
                      title="Columnas"
                    >
                      <Columns size={20} />
                      Columnas
                    </button>
                    {showColumnSelector && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        background: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: 8,
                        padding: 12,
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        zIndex: 10,
                        minWidth: 200
                      }}>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: 14 }}>Columnas Visibles</h4>
                        {allColumns.map(col => (
                          <label key={col.key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, fontSize: 13, cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={visibleColumns.includes(col.key)}
                              onChange={() => toggleColumn(col.key)}
                              disabled={col.key === 'actions'}
                            />
                            {col.label}
                          </label>
                        ))}
                      </div>
                    )}
                </div>
             </div>
          </div>

        </div>

        {/* Tabla de usuarios */}
        <div className={styles.tableContainer}>
          <Table
            data={filteredUsers}
            columns={filteredColumns}
            loading={loading}
            onRowClick={handleUserSelect}
            emptyMessage="No se encontraron usuarios"
            selectable={false}
          />
        </div>

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
        </>
        )}

        {/* Modal de permisos */}
        {showPermissionModal && selectedUser && (
        <div style={{ background: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
         <div style={{ marginBottom: '24px', borderBottom: '1px solid #e5e7eb', paddingBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', fontSize: '14px', color: '#6b7280', marginBottom: '8px', fontFamily: 'system-ui' }}>
              <span style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={() => navigate('/dashboard')}>
                 <Home size={14} style={{ marginRight: 4 }} /> Inicio
              </span>
              <span style={{ margin: '0 8px' }}>/</span>
              <span style={{ cursor: 'pointer' }} onClick={() => setShowPermissionModal(false)}>Permisos</span>
              <span style={{ margin: '0 8px' }}>/</span>
              <span style={{ color: '#111827', fontWeight: 600 }}>Gestionar Usuario</span>
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#111827', margin: 0 }}>
              Permisos de {selectedUser.fullName}
            </h2>
          </div>
            <div className={styles.permissionModal}>
              <div className={styles.modalHeader}>
                <div className={styles.userCard}>
                  <Users size={20} />
                  <div>
                    <h3>{selectedUser.fullName}</h3>
                    <p>{selectedUser.email} • {selectedUser.role}</p>
                  </div>
                </div>
                
                <button
                  className={styles.templateButton}
                  onClick={() => setShowRoleTemplateModal(true)}
                >
                  <Key size={16} />
                  Aplicar plantilla de rol
                </button>
              </div>

              <div className={styles.permissionsContainer}>
                {Object.entries(groupedPermissions).map(([module, modulePermissions]) => (
                  <div key={module} className={styles.moduleGroup}>
                    <div className={styles.moduleHeader}>
                      <h4 className={styles.moduleTitle}>{getModuleLabel(module)}</h4>
                    </div>
                    <div className={styles.actionsGrid}>
                      {modulePermissions.map((permission) => (
                        <div
                          key={permission.id}
                          className={`${styles.actionChip} ${
                            selectedPermissions.includes(permission.id) ? styles.selected : ''
                          }`}
                          onClick={() => handlePermissionToggle(permission.id)}
                        >
                          {getActionLabel(permission.action)}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles.modalActions}>
                <button
                  className={styles.cancelButton}
                  onClick={() => setShowPermissionModal(false)}
                  disabled={saving}
                >
                  <X size={16} />
                  Regresar
                </button>
                
                <button
                  className={styles.saveButton}
                  onClick={handleSavePermissions}
                  disabled={saving}
                >
                  {saving ? (
                    <>Guardando...</>
                  ) : (
                    <>
                      <Save size={16} />
                      Guardar permisos
                    </>
                  )}
                </button>
              </div>
            </div>
        </div>
        )}

        {/* Modal de plantillas de rol */}
        {showRoleTemplateModal && (
          <Modal
            isOpen={showRoleTemplateModal}
            onClose={() => setShowRoleTemplateModal(false)}
            title="Aplicar plantilla de permisos por rol"
          >
            <div className={styles.roleTemplateModal}>
              <p>Selecciona un rol para aplicar sus permisos por defecto:</p>
              
              <div className={styles.roleCards}>
                <div
                  className={styles.roleCard}
                  onClick={() => handleApplyRoleTemplate('admin')}
                >
                  <Shield size={24} />
                  <h3>Administrador</h3>
                  <p>Todos los permisos del sistema</p>
                </div>
                
                 <div
                   className={styles.roleCard}
                   onClick={() => handleApplyRoleTemplate('tecnico')}
                 >
                   <Key size={24} />
                   <h3>Tesorero</h3>
                   <p>Permisos para gestión de recaudación y bitácora de accesos</p>
                 </div>
                 
                 <div
                   className={styles.roleCard}
                   onClick={() => handleApplyRoleTemplate('usuario')}
                 >
                   <Users size={24} />
                   <h3>Residente</h3>
                   <p>Permisos básicos de consulta, reservas y perfil</p>
                 </div>
              </div>
              
              {saving && (
                <div className={styles.saving}>
                  Aplicando plantilla...
                </div>
              )}
            </div>
          </Modal>
        )}
      </div>
    </Layout>
  );
};

export default PermissionsPage;