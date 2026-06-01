import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';

import { userService } from '../services/userService';
import { departmentService } from '../services/departmentService';
import { User, Department } from '@/types';

import styles from './Users.module.css';


import Table from '../components/Table';
import Modal from '../components/Modal';
import AddUserModal from '../components/AddUserModal';
import Pagination from '../components/Pagination';
import { Pencil, Trash2, Plus, Eye, EyeOff, Download, Filter, Columns, ChevronLeft, ChevronRight, ArrowLeft, Search, FileSpreadsheet, Home } from 'lucide-react';
import { exportToExcel } from '../utils/exportUtils';
import { showSuccess, showError, showConfirm, showAlert } from '../utils/swal';
import { useAuth } from '../hooks/useAuth';



const Users: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination & Filters State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [filters, setFilters] = useState({ role: '', department: '', search: '', isActive: 'true' });
  
  const DEFAULT_COLUMNS = ['fullName', 'username', 'email', 'department', 'employeeNumber', 'colonia', 'isActive', 'createdAt', 'actions'];
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem('users_visible_columns');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error('Error parsing visible columns from localStorage', e);
      }
    }
    return DEFAULT_COLUMNS;
  });
  
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<(string | number)[]>([]);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await userService.getUsers({
        page,
        limit,
        search: filters.search,
        role: filters.role,
        department: filters.department,
        isActive: filters.isActive
      });
      
      // Handle both response formats (array or object with pagination)
      if (Array.isArray(response)) {
        setUsers(response);
        setTotalPages(1);
        setTotalUsers(response.length);
      } else {
        setUsers(response.data || []);
        setTotalPages(response.pagination?.totalPages || 1);
        setTotalUsers(response.pagination?.total || 0);
      }
      setError(null);
    } catch (err) {
      setError('No se pudo cargar la lista de usuarios. Por favor, intente de nuevo más tarde.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, filters]);



  useEffect(() => {

    fetchUsers();

  }, [fetchUsers]);

  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const response = await departmentService.getAll();
        if (response.success) {
          setDepartments(response.data);
        }
      } catch (error) {
        console.error('Error loading departments:', error);
      }
    };
    loadDepartments();
  }, []);

  const handleOpenModal = (user: User | null = null) => {

    setCurrentUser(user);

    setIsEditing(!!user);

    setIsModalOpen(true);

    setShowPassword(false);

  };



  const handleCloseModal = () => {

    setIsModalOpen(false);

    setCurrentUser(null);

    setIsEditing(false);

    setError(null);

  };



  const handleSubmit = async (formData: any) => {
    // Mapear campos del formulario reutilizable a backend
    const mapped = {
      username: formData.username || formData.email,
      email: formData.email,
      password: formData.password,
      fullName: formData.name,
      role: formData.role || (isEditing && currentUser ? currentUser.role : 'usuario'),
      department: formData.department,
      employeeNumber: formData.employeeNumber,
      phone: formData.phone,
      isActive: formData.isActive !== undefined ? formData.isActive : true
    };
    if (!mapped.username || !mapped.fullName || !mapped.email) {
      setError("Por favor, complete todos los campos requeridos.");
      return;
    }
    if (!isEditing && !mapped.password) {
      setError("La contraseña es obligatoria para nuevos usuarios.");
      return;
    }

    try {
      if (isEditing && currentUser) {
        await userService.updateUser(currentUser.id, mapped as any);
        await showSuccess('Éxito', 'Usuario actualizado exitosamente.');
      } else {
        await userService.createUser(mapped as any);
        await showSuccess('Éxito', 'Usuario creado exitosamente.');
      }
      fetchUsers();
      handleCloseModal();
    } catch (err: any) {
      console.error(err);
      if (err.response && err.response.status === 409) {
        await showAlert('Usuario Duplicado', 'El usuario ya se encuentra registrado en el sistema.\n\nPor favor, verifique que el nombre de usuario, correo o número de empleado no pertenezcan a otro usuario existente.', 'warning');
      } else {
        const errorMessage = err.response?.data?.message || 'Ocurrió un error al guardar el usuario.';
        await showError('Error', errorMessage);
      }
    }
  };



  const handleDelete = async (id: string) => {

    if (await showConfirm('¿Eliminar usuario?', '¿Está seguro de que desea eliminar este usuario?')) {

      try {

        await userService.deleteUser(id);

        fetchUsers();
        
        await showSuccess('Eliminado', 'Usuario eliminado correctamente.');

      } catch (err) {

        setError('Error al eliminar el usuario.');

        console.error(err);

      }

    }

  };



  const handleBulkDelete = async () => {
    if (await showConfirm('¿Eliminar usuarios?', `¿Estás seguro de eliminar ${selectedUserIds.length} usuarios?`)) {
      try {
        setLoading(true);
        await Promise.all(selectedUserIds.map(id => userService.deleteUser(id.toString())));
        await fetchUsers();
        setSelectedUserIds([]);
        await showSuccess('Eliminados', 'Usuarios eliminados correctamente.');
      } catch (err) {
        console.error('Error deleting users:', err);
        setError('Error al eliminar algunos usuarios. Por favor intente de nuevo.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleExport = async () => {
    try {
      setLoading(true);
      // Fetch all users matching current filters
      const response = await userService.getUsers({
        page: 1,
        limit: 10000,
        search: filters.search,
        role: filters.role,
        department: filters.department,
        isActive: filters.isActive
      });
      
      const allUsers = Array.isArray(response) ? response : (response.data || []);

      const dataToExport = allUsers.map(user => {
        const row: Record<string, any> = {};
        
        if (visibleColumns.includes('fullName')) row['Nombre Completo'] = user.fullName;
        if (visibleColumns.includes('username')) row['Usuario'] = user.username;
        if (visibleColumns.includes('email')) row['Correo'] = user.email;
        if (visibleColumns.includes('department')) row['Dirección'] = user.department || '-';
        if (visibleColumns.includes('employeeNumber')) row['Número de Casa'] = user.employeeNumber || '-';
        if (visibleColumns.includes('colonia')) row['Colonia'] = 'Stanza Malaga Seccion Almeria';
        if (visibleColumns.includes('isActive')) row['Estado'] = user.isActive ? 'ACTIVO' : 'INACTIVO';
        if (visibleColumns.includes('createdAt')) row['Fecha Registro'] = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-';
        
        return row;
      });

      exportToExcel(dataToExport, 'Residentes');
    } catch (err) {
      console.error('Error exporting users:', err);
      await showError('Error', 'No se pudo exportar los datos.');
    } finally {
      setLoading(false);
    }
  };

  const allColumns = [
    {
      key: 'fullName',
      label: 'Nombre Completo',
      render: (user: User) => <div style={{ fontWeight: 500 }}>{user.fullName}</div>
    },
    {
      key: 'username',
      label: 'Usuario',
      render: (user: User) => user.username
    },
    {
      key: 'email',
      label: 'Correo',
      render: (user: User) => user.email
    },
    {
      key: 'department',
      label: 'Dirección',
      render: (user: User) => user.department || '-'
    },
    {
      key: 'employeeNumber',
      label: 'Número de Casa',
      render: (user: User) => user.employeeNumber || '-'
    },
    {
      key: 'colonia',
      label: 'Colonia',
      render: (user: User) => 'Stanza Malaga Seccion Almeria'
    },
    {
      key: 'isActive',
      label: 'Estado',
      render: (user: User) => (
        user.isActive ? 'ACTIVO' : 'INACTIVO'
      )
    },
    {
      key: 'createdAt',
      label: 'Fecha Registro',
      render: (user: User) => user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'
    },
    {
      key: 'actions',
      label: 'Acciones',
      render: (user: User) => (
        <div style={{ display: 'flex', gap: 8 }}>
          <button 
            onClick={(e) => { e.stopPropagation(); handleOpenModal(user); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb' }}
            title="Editar"
          >
            <Pencil size={16} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); handleDelete(user.id.toString()); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}
            title="Eliminar"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  const filteredColumns = allColumns.filter(col => visibleColumns.includes(col.key));

  const toggleColumn = (key: string) => {
    let newColumns: string[];
    if (visibleColumns.includes(key)) {
      newColumns = visibleColumns.filter(k => k !== key);
    } else {
      newColumns = [...visibleColumns, key];
    }
    setVisibleColumns(newColumns);
    localStorage.setItem('users_visible_columns', JSON.stringify(newColumns));
  };

  return (
    <Layout>
      <div className={styles.container}>
        {!isModalOpen && (
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
            <h1>Gestión de Residentes / Usuarios</h1>
            <p>Crea, edita y gestiona los residentes y personal del sistema.</p>
          </div>
        </div>
        
        <div className={styles.tableCard}>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
            
            {/* Filtros y Búsqueda */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, alignItems: 'end' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Estado</label>
                  <select 
                    className="form-select"
                    value={filters.isActive} 
                    onChange={e => setFilters({ ...filters, isActive: e.target.value })}
                  >
                    <option value="">TODOS</option>
                    <option value="true">ACTIVOS</option>
                    <option value="false">INACTIVOS</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Rol</label>
                  <select 
                    className="form-select"
                    value={filters.role} 
                    onChange={e => setFilters({ ...filters, role: e.target.value })}
                  >
                    <option value="">TODOS</option>
                    <option value="admin">ADMIN</option>
                    <option value="presidente">PRESIDENTE</option>
                    <option value="vicepresidente">VICEPRESIDENTE</option>
                    <option value="tesorero">TESORERO</option>
                    <option value="eventos">EVENTOS</option>
                    <option value="guardia">GUARDIA</option>
                    <option value="residente">RESIDENTE</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Área / Espacio</label>
                  <select 
                    className="form-select"
                    value={filters.department}
                    onChange={e => setFilters({ ...filters, department: e.target.value })}
                  >
                    <option value="">TODOS</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.display_name.toUpperCase()}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  {(user?.role === 'admin' || user?.role === 'presidente' || user?.role === 'vicepresidente') && (
                    <button 
                      className={`${styles.btnExcel} btn btn-outline`}
                      onClick={handleExport}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#107c41', borderColor: '#107c41' }}
                      title="Exportar a Excel"
                    >
                      <FileSpreadsheet size={20} />
                      Excel
                    </button>
                  )}
                  <div style={{ position: 'relative' }}>
                    <button 
                      className="btn btn-outline"
                      onClick={() => setShowColumnSelector(!showColumnSelector)}
                      style={{ display: 'flex', alignItems: 'center', gap: 8 }}
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

              <div style={{ position: 'relative', width: '100%' }}>
                 <Search size={20} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                 <input
                    className="form-input"
                    type="text"
                    placeholder="Buscar usuarios..."
                    value={filters.search}
                    onChange={e => setFilters({ ...filters, search: e.target.value })}
                    style={{ width: '100%', paddingLeft: 40, height: '48px', fontSize: '1rem' }}
                 />
              </div>
        </div>

            {/* Acciones */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              {selectedUserIds.length > 0 && (
                <button 
                  className="btn btn-danger" 
                  onClick={handleBulkDelete}
                  style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  <Trash2 size={16} />
                  Eliminar ({selectedUserIds.length})
                </button>
              )}
              <button className={styles.btnAgregar} onClick={() => handleOpenModal()}>
                <Plus size={16} />
                Agregar
              </button>
            </div>
          </div>

          <Table
            columns={filteredColumns}
            data={users}
            loading={loading}
            error={error && !loading ? error : null}
            selectable={false}
            selectedIds={selectedUserIds}
            onSelectionChange={setSelectedUserIds}
          />

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
        </>
        )}

        {isModalOpen && (
          <div style={{ background: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
         <div style={{ marginBottom: '24px', borderBottom: '1px solid #e5e7eb', paddingBottom: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              className={styles.backButton}
              onClick={handleCloseModal}
              title="Volver"
            >
              <ArrowLeft size={20} />
            </button>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', fontSize: '14px', color: '#6b7280', marginBottom: '4px', fontFamily: 'system-ui' }}>
                <span style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={() => navigate('/dashboard')}>
                  <Home size={14} style={{ marginRight: 4 }} /> Inicio
                </span>
                <span style={{ margin: '0 8px' }}>/</span>
                <span style={{ cursor: 'pointer' }} onClick={handleCloseModal}>Residentes</span>
                <span style={{ margin: '0 8px' }}>/</span>
                <span style={{ color: '#111827', fontWeight: 600 }}>{isEditing ? 'Editar' : 'Crear'} Registro</span>
              </div>
              <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#111827', margin: 0 }}>
                {isEditing ? 'Editar Residente' : 'Crear Residente'}
              </h2>
            </div>
          </div>
            <AddUserModal
              onSubmit={handleSubmit}
              loading={loading}
              onCancel={handleCloseModal}
              departments={departments}
              initialData={currentUser ? {
                id: currentUser.id,
                name: currentUser.fullName,
                username: currentUser.username,
                email: currentUser.email,
                role: currentUser.role,
                departmentId: currentUser.departmentId,
                department: currentUser.department,
                employeeNumber: currentUser.employeeNumber,
                phone: currentUser.phone || currentUser.cargo || '',
                isActive: currentUser.isActive,
                createdAt: currentUser.createdAt
              } : {}}
            />
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Users;
