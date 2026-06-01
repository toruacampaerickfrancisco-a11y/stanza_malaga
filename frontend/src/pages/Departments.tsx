import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { departmentService, Department } from '../services/departmentService';
import Table from '../components/Table';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import { Pencil, Trash2, Plus, Search, ArrowLeft, FileSpreadsheet, Columns, Home } from 'lucide-react';
import { showSuccess, showError, showConfirm } from '../utils/swal';
import { exportToExcel } from '../utils/exportUtils';
import { useAuth } from '../hooks/useAuth';
import styles from './Users.module.css'; // Reusing styles for consistency

const Departments: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentDepartment, setCurrentDepartment] = useState<Partial<Department> | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Column Selector State
  const [visibleColumns, setVisibleColumns] = useState<string[]>(['dependencia', 'display_name', 'is_active', 'id']);
  const [showColumnSelector, setShowColumnSelector] = useState(false);

  const fetchDepartments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await departmentService.getAll();
      if (response.success) {
        setDepartments(response.data);
      } else {
        setError(response.message || 'Error al cargar áreas y eventos');
      }
    } catch (err) {
      setError('No se pudo cargar la lista de áreas y eventos.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const handleOpenModal = (dept: Department | null = null) => {
    if (dept) {
      setCurrentDepartment(dept);
      setIsEditing(true);
    } else {
      setCurrentDepartment({ display_name: '', is_active: true });
      setIsEditing(false);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentDepartment(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentDepartment?.display_name) return;

    try {
      if (isEditing && currentDepartment.id) {
        await departmentService.update(currentDepartment.id, currentDepartment);
        showSuccess('Área/Evento actualizado correctamente');
      } else {
        await departmentService.create(currentDepartment);
        showSuccess('Área/Evento creado correctamente');
      }
      handleCloseModal();
      fetchDepartments();
    } catch (err) {
      showError('Error al guardar el área/evento');
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm('¿Estás seguro?', 'Esta acción no se puede deshacer.');
    if (confirmed) {
      try {
        await departmentService.delete(id);
        showSuccess('Área/Evento eliminado correctamente');
        fetchDepartments();
      } catch (err) {
        showError('Error al eliminar el área/evento');
        console.error(err);
      }
    }
  };

  const handleExport = async () => {
    try {
      setLoading(true);
      const dataToExport = departments.map(dept => {
        const row: Record<string, any> = {};
        if (visibleColumns.includes('dependencia')) row['Administración'] = 'Administración Residencial';
        if (visibleColumns.includes('display_name')) row['Área / Evento'] = dept.display_name;
        if (visibleColumns.includes('is_active')) row['Habilitado'] = dept.is_active ? 'Sí' : 'No';
        return row;
      });
      exportToExcel(dataToExport, 'Catalogo_Eventos_Areas');
    } catch (err) {
      console.error('Error exporting areas/events:', err);
      await showError('Error', 'No se pudo exportar los datos.');
    } finally {
      setLoading(false);
    }
  };

  // Filter and Pagination Logic
  const filteredDepartments = departments.filter(dept => 
    dept.display_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredDepartments.length / limit);
  const paginatedDepartments = filteredDepartments.slice((page - 1) * limit, page * limit);

  const allColumns = [
    {
      label: 'Administración',
      key: 'dependencia',
      render: () => 'Administración Residencial'
    },
    { 
      label: 'Área / Tipo de Evento', 
      key: 'display_name',
      render: (dept: Department) => <div style={{ fontWeight: 500 }}>{dept.display_name}</div>
    },
    { 
      label: 'Activo', 
      key: 'is_active',
      render: (dept: Department) => (
        <span className={`badge ${dept.is_active ? 'bg-success' : 'bg-danger'}`} style={{ 
          padding: '4px 8px', 
          borderRadius: '4px', 
          fontSize: '0.75rem', 
          fontWeight: 600,
          backgroundColor: dept.is_active ? '#dcfce7' : '#fee2e2',
          color: dept.is_active ? '#166534' : '#991b1b'
        }}>
          {dept.is_active ? 'Sí' : 'No'}
        </span>
      )
    },
    {
      label: 'Acciones',
      key: 'id',
      render: (dept: Department) => (
        <div style={{ display: 'flex', gap: 8 }}>
          <button 
            onClick={() => handleOpenModal(dept)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb' }}
            title="Editar"
          >
            <Pencil size={16} />
          </button>
          <button 
            onClick={() => handleDelete(dept.id)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}
            title="Eliminar"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  const filteredColumns = allColumns.filter(col => visibleColumns.includes(col.key) || col.key === 'id');

  const toggleColumn = (key: string) => {
    if (visibleColumns.includes(key)) {
      setVisibleColumns(visibleColumns.filter(k => k !== key));
    } else {
      setVisibleColumns([...visibleColumns, key]);
    }
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
            <h1>Catálogo de Áreas y Eventos</h1>
            <p>Administra las áreas comunes y los tipos de eventos permitidos.</p>
          </div>
        </div>

        <div className={styles.tableCard}>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
            
            {/* Top Section: Buttons & Search */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              
              {/* Buttons Row (Excel & Columns) */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button 
                  className="btn btn-outline"
                  onClick={handleExport}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#107c41', borderColor: '#107c41' }}
                  title="Exportar a Excel"
                >
                  <FileSpreadsheet size={20} />
                  Excel
                </button>
                
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
                      {allColumns.filter(col => col.key !== 'id').map(col => (
                        <label key={col.key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, fontSize: 13, cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={visibleColumns.includes(col.key)}
                            onChange={() => toggleColumn(col.key)}
                          />
                          {col.label}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Search Bar */}
              <div style={{ position: 'relative', width: '100%' }}>
                <Search size={20} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                <input
                  className="form-input"
                  type="text"
                  placeholder="Buscar área o evento..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                  style={{ width: '100%', paddingLeft: 40, height: '48px', fontSize: '1rem' }}
                />
              </div>
            </div>

            {/* Actions Row (Add Button) */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button 
                className={styles.btnAgregar} 
                onClick={() => handleOpenModal()}
              >
                <Plus size={16} />
                Agregar
              </button>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}

            <Table
              columns={filteredColumns}
              data={paginatedDepartments}
              loading={loading}
            />

            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        </div>
        </>
        )}

      {isModalOpen && (
        <div style={{ background: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
         <div style={{ marginBottom: '24px', borderBottom: '1px solid #e5e7eb', paddingBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', fontSize: '14px', color: '#6b7280', marginBottom: '8px', fontFamily: 'system-ui' }}>
              <span style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={() => navigate('/dashboard')}>
                 <Home size={14} style={{ marginRight: 4 }} /> Inicio
              </span>
              <span style={{ margin: '0 8px' }}>/</span>
              <span style={{ cursor: 'pointer' }} onClick={handleCloseModal}>Áreas y Eventos</span>
              <span style={{ margin: '0 8px' }}>/</span>
              <span style={{ color: '#111827', fontWeight: 600 }}>{isEditing ? 'Editar' : 'Nueva'} Área / Evento</span>
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#111827', margin: 0 }}>
              {isEditing ? 'Editar Área / Evento' : 'Nueva Área / Evento'}
            </h2>
          </div>
          
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '600px' }}>
            <div className="form-group">
              <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Nombre del Área / Evento</label>
              <input
                type="text"
                className="form-input"
                value={currentDepartment?.display_name || ''}
                onChange={(e) => setCurrentDepartment({ ...currentDepartment, display_name: e.target.value })}
                required
                placeholder="Ej. Casa Club o Alberca"
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '4px' }}
              />
            </div>
            <div className="form-group" style={{ marginTop: 16 }}>
              <label className="flex items-center gap-2 cursor-pointer" style={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={currentDepartment?.is_active || false}
                  onChange={(e) => setCurrentDepartment({ ...currentDepartment, is_active: e.target.checked })}
                  style={{ width: '16px', height: '16px' }}
                />
                <span style={{ marginLeft: 8 }}>Área / Evento Habilitado</span>
              </label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-start', gap: 12, marginTop: 24 }}>
              <button type="submit" className="btn btn-primary">
                {isEditing ? 'Actualizar' : 'Crear'}
              </button>
              <button type="button" className="btn btn-outline" onClick={handleCloseModal}>
                Regresar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
    </Layout>
  );
};

export default Departments;
