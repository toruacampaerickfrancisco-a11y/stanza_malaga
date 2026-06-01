import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Equipment, User, Department } from '@/types';
import { equipmentService } from '../services/equipmentService';
import { userService } from '../services/userService';
import { departmentService } from '../services/departmentService';
import styles from './Equipment.module.css';
import Table from '../components/Table';
import AddEquipmentModal from '../components/AddEquipmentModal';
import Pagination from '../components/Pagination';
import { Pencil, Trash2, Plus, Eye, Filter, Columns, ChevronLeft, ChevronRight, Search, FileSpreadsheet, ArrowLeft, Home, CreditCard } from 'lucide-react';
import { exportToExcel } from '../utils/exportUtils';
import { showSuccess, showError, showConfirm } from '../utils/swal';
import { useAuth } from '../hooks/useAuth';

const getWarrantyStatus = (dateString?: string) => {
  if (!dateString) return { text: 'Sin información', className: '' };
  const expiration = new Date(dateString);
  const now = new Date();
  const daysLeft = Math.ceil((expiration.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) return { text: 'Vencido / Atrasado', className: styles.warrantyExpired };
  if (daysLeft < 30) return { text: 'Próximo a vencer', className: styles.warrantyWarning };
  return { text: 'Al corriente / Vigente', className: styles.warrantyValid };
};

const EquipmentPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination & Filters State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEquipment, setTotalEquipment] = useState(0);
  const [filters, setFilters] = useState({ type: '', status: '', search: '', location: '' });
  const [visibleColumns, setVisibleColumns] = useState<string[]>(['name', 'type', 'brand', 'serialNumber', 'inventoryNumber', 'status', 'assignedUser', 'actions']);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [statuses, setStatuses] = useState<string[]>([]);

  const fetchEquipmentAndUsers = useCallback(async () => {
    try {
      setLoading(true);
      const [equipmentResponse, usersResponse, departmentsResponse] = await Promise.all([
        equipmentService.getEquipment({
          page,
          limit,
          search: filters.search,
          type: filters.type,
          status: filters.status,
          location: filters.location
        }),
        userService.getUsers({ limit: 1000, isActive: 'true' }),
        departmentService.getAll()
      ]);
      
      setEquipment(equipmentResponse.data || []);
      setTotalPages(equipmentResponse.pagination?.totalPages || 1);
      setTotalEquipment(equipmentResponse.pagination?.total || 0);

      setUsers(usersResponse.data || []);
      if (departmentsResponse.success) {
        setDepartments(departmentsResponse.data);
      }
      setError(null);
    } catch (err) {
      setError('No se pudo cargar la información. Por favor, intente de nuevo más tarde.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, filters]);

  useEffect(() => {
    fetchEquipmentAndUsers();
  }, [fetchEquipmentAndUsers]);

  useEffect(() => {
    const loadFiltersData = async () => {
      try {
        const response = await equipmentService.getEquipment({ limit: 10000 });
        const allEquipment = response.data || [];
        
        const uniqueStatuses = Array.from(new Set(allEquipment.map(e => e.status).filter(Boolean))) as string[];
        setStatuses(uniqueStatuses.sort());
      } catch (error) {
        console.error('Error loading filter data:', error);
      }
    };
    loadFiltersData();
  }, []);

  const formatStatusLabel = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'retired' || s === 'baja') return 'RECHAZADO';
    if (s === 'active' || s === 'activo' || s === 'operativo') return 'PAGADO';
    if (s === 'maintenance' || s === 'mantenimiento' || s === 'en_reparacion') return 'PENDIENTE';
    if (s === 'en_almacen') return 'EN CONCILIACIÓN';
    return status.toUpperCase();
  };

  const handleOpenModal = (equipment: Equipment | null = null) => {
    setCurrentEquipment(equipment);
    setIsEditing(!!equipment);
    setIsModalOpen(true);
  };

  const handleOpenDetailsModal = (equipment: Equipment) => {
    setCurrentEquipment(equipment);
    setIsDetailsModalOpen(true);
  };

  const handleCloseModals = () => {
    setIsModalOpen(false);
    setIsDetailsModalOpen(false);
    setCurrentEquipment(null);
    setIsEditing(false);
    setError(null);
  };

  const handleSubmit = async (data: any) => {
    const mapped = {
      name: data.name,
      type: data.type,
      brand: data.brand,
      model: data.model,
      serialNumber: data.serialNumber,
      inventoryNumber: data.inventoryNumber,
      status: data.status,
      location: data.location,
      assignedUserId: data.assignedUserId || null,
      purchaseDate: data.purchaseDate || null,
      warrantyExpiration: data.warrantyExpiration || null,
      description: data.notes,
      processor: data.processor,
      ram: data.ram,
      hardDrive: data.hardDrive,
      operatingSystem: data.operatingSystem,
      notes: data.notes,
      requirement: data.requirement
    };

    if (data.notes && !mapped.description) {
      mapped.description = data.notes;
    }

    try {
      if (isEditing && currentEquipment) {
        await equipmentService.updateEquipment(currentEquipment.id, mapped);
        await showSuccess('Éxito', 'Pago actualizado exitosamente.');
      } else {
        await equipmentService.createEquipment(mapped);
        await showSuccess('Éxito', 'Pago registrado exitosamente.');
      }
      fetchEquipmentAndUsers();
      handleCloseModals();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Ocurrió un error al guardar el registro de pago.';
      await showError('Error', errorMessage);
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (await showConfirm('¿Eliminar registro?', '¿Está seguro de que desea eliminar este registro de pago?')) {
      try {
        await equipmentService.deleteEquipment(id);
        fetchEquipmentAndUsers();
        await showSuccess('Eliminado', 'Registro eliminado correctamente.');
      } catch (err: any) {
        const errorMessage = err.response?.data?.message || 'Ocurrió un error al eliminar el registro de pago.';
        setError(errorMessage);
        console.error(err);
      }
    }
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [currentEquipment, setCurrentEquipment] = useState<Equipment | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<(string | number)[]>([]);

  const handleExport = async () => {
    try {
      setLoading(true);
      const response = await equipmentService.getEquipment({
        page: 1,
        limit: 10000,
        search: filters.search,
        type: filters.type,
        status: filters.status,
        location: filters.location
      });
      
      const allEquipment = response.data || [];

      const dataToExport = allEquipment.map(item => {
        const row: Record<string, any> = {};
        
        if (visibleColumns.includes('name')) row['Concepto de Pago'] = item.name;
        if (visibleColumns.includes('type')) row['Forma de Pago'] = item.type;
        if (visibleColumns.includes('brand')) row['Período (Mes/Año)'] = `${item.brand} ${item.model}`;
        if (visibleColumns.includes('serialNumber')) row['Folio / Referencia'] = item.serialNumber;
        if (visibleColumns.includes('inventoryNumber')) row['Monto ($)'] = item.inventoryNumber;
        if (visibleColumns.includes('status')) row['Estatus de Pago'] = formatStatusLabel(item.status);
        if (visibleColumns.includes('location')) row['Espacio / Área'] = item.location || 'General';
        if (visibleColumns.includes('assignedUser')) row['Propietario / Residente'] = item.assignedUser?.fullName || 'No asignado';
        if (visibleColumns.includes('purchaseDate')) row['Fecha de Pago'] = item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString() : '-';
        if (visibleColumns.includes('warrantyExpiration')) row['Fecha Límite'] = item.warrantyExpiration ? new Date(item.warrantyExpiration).toLocaleDateString() : '-';
        
        return row;
      });

      exportToExcel(dataToExport, 'Recaudacion_Cuotas');
    } catch (err) {
      console.error('Error exporting payments:', err);
      await showError('Error', 'No se pudo exportar los datos.');
    } finally {
      setLoading(false);
    }
  };

  const allColumns = [
    { 
      key: 'name', 
      label: 'Concepto de Transacción', 
      render: (row: Equipment) => (
        <span style={{ fontWeight: 600, color: row.location === 'GASTO' ? '#ef4444' : '#111827' }}>
          {row.location === 'GASTO' ? '🔻 [EGRESO] ' : ''}{row.name}
        </span>
      )
    },
    { key: 'type', label: 'Forma de Pago' },
    { 
      key: 'brand', 
      label: 'Período', 
      render: (row: Equipment) => `${row.brand} ${row.model}` 
    },
    { 
      key: 'serialNumber', 
      label: 'Folio / Referencia',
      render: (row: Equipment) => <code style={{ color: row.location === 'GASTO' ? '#ef4444' : '#2563eb' }}>{row.serialNumber}</code>
    },
    { 
      key: 'inventoryNumber', 
      label: 'Monto ($)',
      render: (row: Equipment) => {
        const isGasto = row.location === 'GASTO';
        return (
          <strong style={{ color: isGasto ? '#ef4444' : '#10b981' }}>
            {isGasto ? '-' : ''}${parseFloat(row.inventoryNumber || '0').toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </strong>
        );
      }
    },
    { 
      key: 'status', 
      label: 'Estatus', 
      render: (row: Equipment) => {
        const isGasto = row.location === 'GASTO';
        const lbl = isGasto 
          ? (['active', 'activo', 'operativo'].includes(row.status.toLowerCase()) ? 'PAGADO' : row.status === 'en_almacen' ? 'EN ACLARACIÓN' : 'PENDIENTE')
          : formatStatusLabel(row.status);
        
        let badgeClass = styles.warrantyValid;
        if (lbl === 'PENDIENTE') badgeClass = styles.warrantyWarning;
        if (lbl === 'RECHAZADO') badgeClass = styles.warrantyExpired;
        if (lbl === 'EN CONCILIACIÓN' || lbl === 'EN ACLARACIÓN') badgeClass = styles.warrantyWarning;
        
        if (isGasto) {
          if (lbl === 'PAGADO') {
            return <span className={styles.statusBadge} style={{ background: '#fee2e2', color: '#991b1b', textTransform: 'uppercase', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 }}>{lbl}</span>;
          } else {
            return <span className={styles.statusBadge} style={{ background: '#ffedd5', color: '#c2410c', textTransform: 'uppercase', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 }}>{lbl}</span>;
          }
        }
        return <span className={`${styles.statusBadge} ${badgeClass}`}>{lbl}</span>;
      }
    },
    { 
      key: 'location', 
      label: 'Área / Estatus Contable',
      render: (row: Equipment) => row.location === 'GASTO' ? <span style={{ color: '#ef4444', fontWeight: 600 }}>EGRESO / GASTO</span> : (row.location || 'General')
    },
    { 
      key: 'assignedUser', 
      label: 'Residente / Propietario', 
      render: (row: Equipment) => row.location === 'GASTO' ? <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>N/A (Gasto Interno)</span> : (row.assignedUser?.fullName || 'No asignado') 
    },
    { 
      key: 'purchaseDate', 
      label: 'Fecha de Pago',
      render: (row: Equipment) => row.purchaseDate ? new Date(row.purchaseDate).toLocaleDateString() : '-'
    },
    { 
      key: 'warrantyExpiration', 
      label: 'Fecha Límite',
      render: (row: Equipment) => {
        const status = getWarrantyStatus(row.warrantyExpiration as any);
        return (
          <span className={status.className}>
            {row.warrantyExpiration ? new Date(row.warrantyExpiration).toLocaleDateString() : '-'}
          </span>
        );
      }
    },
    {
      key: 'actions',
      label: 'Acciones',
      render: (row: Equipment) => (
        <div style={{ display: 'flex', gap: 8 }}>
          <button 
            onClick={(e) => { e.stopPropagation(); handleOpenDetailsModal(row); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}
            title="Ver Detalles"
          >
            <Eye size={16} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); handleOpenModal(row); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb' }}
            title="Editar"
          >
            <Pencil size={16} />
          </button>
          {['admin', 'presidente', 'tesorero'].includes(user?.role || '') && (
            <button 
              onClick={(e) => { e.stopPropagation(); handleDelete(row.id.toString()); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}
              title="Eliminar"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      )
    }
  ];

  const columns = allColumns.filter(col => visibleColumns.includes(col.key));

  const toggleColumn = (key: string) => {
    if (visibleColumns.includes(key)) {
      setVisibleColumns(visibleColumns.filter(c => c !== key));
    } else {
      setVisibleColumns([...visibleColumns, key]);
    }
  };

  return (
    <Layout>
      <div className={styles.container}>
        {!isModalOpen && !isDetailsModalOpen && (
        <>
        <div className={styles.header} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button 
            className={styles.backButton}
            onClick={() => navigate('/dashboard')}
            title="Volver al Panel Principal"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1>Recaudación de Cuota de Mantenimiento</h1>
            <p>Registro y seguimiento de los pagos y cuotas del condominio.</p>
          </div>
        </div>

        <div style={{ background: 'white', padding: 16, borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          {/* Filtros y Búsqueda */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, alignItems: 'end' }}>
               <div className="form-group" style={{ marginBottom: 0 }}>
                 <label className="form-label">Forma de Pago</label>
                 <select 
                    className="form-select"
                    value={filters.type} 
                    onChange={(e) => {
                      setFilters({ ...filters, type: e.target.value });
                      setPage(1);
                    }}
                  >
                    <option value="">TODAS</option>
                    <option value="Transferencia">TRANSFERENCIA</option>
                    <option value="Efectivo">EFECTIVO</option>
                    <option value="Tarjeta">TARJETA</option>
                    <option value="Depósito">DEPÓSITO</option>
                    <option value="Otro">OTRO</option>
                  </select>
               </div>

               <div className="form-group" style={{ marginBottom: 0 }}>
                 <label className="form-label">Estatus de Pago</label>
                 <select 
                    className="form-select"
                    value={filters.status} 
                    onChange={(e) => {
                      setFilters({ ...filters, status: e.target.value });
                      setPage(1);
                    }}
                  >
                    <option value="">TODOS</option>
                    <option value="operativo">PAGADO</option>
                    <option value="en_reparacion">PENDIENTE</option>
                    <option value="en_almacen">EN CONCILIACIÓN</option>
                    <option value="baja">RECHAZADO</option>
                  </select>
               </div>

               <div className="form-group" style={{ marginBottom: 0 }}>
                 <label className="form-label">Espacio / Área Común</label>
                 <select 
                    className="form-select"
                    value={filters.location} 
                    onChange={(e) => {
                      setFilters({ ...filters, location: e.target.value });
                      setPage(1);
                    }}
                  >
                    <option value="">TODAS</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.display_name}>{dept.display_name.toUpperCase()}</option>
                    ))}
                  </select>
               </div>

               <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <div className={styles.columnSelectorWrapper} style={{ display: 'flex', gap: 8 }}>
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
                      <div className={styles.columnSelector}>
                        <h3>Columnas Visibles</h3>
                        {allColumns.map(col => (
                          <label key={col.key} className={styles.columnOption}>
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
                     placeholder="Buscar registros de pagos y cuotas..." 
                     value={filters.search}
                     onChange={(e) => {
                       setFilters({ ...filters, search: e.target.value });
                       setPage(1);
                     }}
                     style={{ width: '100%', paddingLeft: 40, height: '48px', fontSize: '1rem' }}
                  />
             </div>
          </div>

          {/* Acciones */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button className={styles.btnAgregar} onClick={() => handleOpenModal()}>
              <Plus size={16} />
              Registrar Pago
            </button>
          </div>

        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.tableWrapper}>
          <Table 
            columns={columns} 
            data={equipment} 
            loading={loading}
            selectable={false}
            selectedIds={selectedEquipmentIds}
            onSelectionChange={setSelectedEquipmentIds}
          />
        </div>

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
        </>
        )}

      {isModalOpen && (
        <div style={{ background: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
         <div style={{ marginBottom: '24px', borderBottom: '1px solid #e5e7eb', paddingBottom: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              className={styles.backButton}
              onClick={handleCloseModals}
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
                <span style={{ cursor: 'pointer' }} onClick={handleCloseModals}>Recaudación</span>
                <span style={{ margin: '0 8px' }}>/</span>
                <span style={{ color: '#111827', fontWeight: 600 }}>{isEditing ? 'Editar Pago' : 'Registrar Pago'}</span>
              </div>
              <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#111827', margin: 0 }}>
                {isEditing ? 'Editar Registro de Pago' : 'Registrar Pago'}
              </h2>
            </div>
          </div>
          <AddEquipmentModal
            onSubmit={handleSubmit}
            loading={loading}
            users={users}
            departments={departments}
            onCancel={handleCloseModals}
            initialData={currentEquipment ? {
              name: currentEquipment.name,
              type: currentEquipment.type,
              brand: currentEquipment.brand,
              model: currentEquipment.model,
              serialNumber: currentEquipment.serialNumber,
              inventoryNumber: currentEquipment.inventoryNumber,
              status: currentEquipment.status,
              location: currentEquipment.location,
              assignedUserId: currentEquipment.assignedUserId,
              purchaseDate: currentEquipment.purchaseDate,
              warrantyExpiration: currentEquipment.warrantyExpiration,
              notes: currentEquipment.description,
              processor: currentEquipment.processor,
              ram: currentEquipment.ram,
              hardDrive: currentEquipment.hardDrive,
              operatingSystem: currentEquipment.operatingSystem
            } : {}}
          />
        </div>
      )}

      {isDetailsModalOpen && currentEquipment && (
        <div style={{ background: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
         <div style={{ marginBottom: '24px', borderBottom: '1px solid #e5e7eb', paddingBottom: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              className={styles.backButton}
              onClick={handleCloseModals}
              title="Volver"
            >
              <ArrowLeft size={20} />
            </button>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
                <span style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={() => navigate('/dashboard')}>
                  <Home size={14} style={{ marginRight: 4 }} /> Inicio
                </span>
                <span style={{ margin: '0 8px' }}>/</span>
                <span style={{ cursor: 'pointer' }} onClick={handleCloseModals}>Recaudación</span>
                <span style={{ margin: '0 8px' }}>/</span>
                <span style={{ color: '#111827', fontWeight: 600 }}>Detalles del Pago</span>
              </div>
              <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#111827', margin: 0 }}>
                Detalles del Registro de Pago
              </h2>
            </div>
          </div>
          <div className={styles.detailsContent}>
            <div className={styles.detailsHeader}>
              <div className={styles.equipmentTitle}>
                <CreditCard size={24} style={{ marginRight: 8, color: '#2563eb' }} />
                <h3>{currentEquipment.name}</h3>
              </div>
              {(() => {
                const lbl = formatStatusLabel(currentEquipment.status || '');
                let badgeClass = styles.warrantyValid;
                if (lbl === 'PENDIENTE') badgeClass = styles.warrantyWarning;
                if (lbl === 'RECHAZADO') badgeClass = styles.warrantyExpired;
                if (lbl === 'EN CONCILIACIÓN') badgeClass = styles.warrantyWarning;
                return <span className={`${styles.statusBadge} ${badgeClass}`}>{lbl}</span>;
              })()}
            </div>
            <div className={styles.detailsGrid}>
              <div className={styles.detailItem}>
                <label>Forma de Pago</label>
                <span>{currentEquipment.type}</span>
              </div>
              <div className={styles.detailItem}>
                <label>Período / Año</label>
                <span>{currentEquipment.brand} / {currentEquipment.model}</span>
              </div>
              <div className={styles.detailItem}>
                <label>Folio / Referencia</label>
                <span className={styles.serialNumber}>{currentEquipment.serialNumber}</span>
              </div>
              <div className={styles.detailItem}>
                <label>Monto Pagado ($)</label>
                <strong style={{ color: '#10b981', fontSize: '1.1rem' }}>
                  ${parseFloat(currentEquipment.inventoryNumber || '0').toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </strong>
              </div>
              <div className={styles.detailItem}>
                <label>Espacio / Área Común</label>
                <span>{currentEquipment.location || 'General / Ninguno'}</span>
              </div>
              <div className={styles.detailItem}>
                <label>Propietario / Residente</label>
                <span>{currentEquipment.assignedUser?.fullName || <span className={styles.noAssigned}>No asignado</span>}</span>
              </div>
              <div className={styles.detailItem}>
                <label>Fecha de Pago</label>
                <span>{currentEquipment.purchaseDate ? new Date(currentEquipment.purchaseDate).toLocaleDateString() : 'N/A'}</span>
              </div>
              <div className={styles.detailItem}>
                <label>Estatus del Período</label>
                <span className={getWarrantyStatus(currentEquipment.warrantyExpiration).className}>
                  {getWarrantyStatus(currentEquipment.warrantyExpiration).text}
                  {currentEquipment.warrantyExpiration ? ` (Límite: ${new Date(currentEquipment.warrantyExpiration).toLocaleDateString()})` : ''}
                </span>
              </div>
              <div className={`${styles.detailItem} ${styles.fullWidth}`}>
                <label>Detalles de Transacción</label>
                <p>{currentEquipment.requirement || 'Sin detalles registrados.'}</p>
              </div>
              <div className={`${styles.detailItem} ${styles.fullWidth}`}>
                <label>Observaciones</label>
                <p>{currentEquipment.notes || currentEquipment.description || 'Sin observaciones.'}</p>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className="btn btn-secondary" onClick={handleCloseModals}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </Layout>
  );
};

export default EquipmentPage;