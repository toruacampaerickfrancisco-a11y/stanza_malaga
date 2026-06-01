import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';
import Modal from '../components/Modal';
import AddInsumoModal from '../components/AddInsumoModal';
import { Search, FileSpreadsheet, Columns, Edit, Trash2, ArrowLeft, History, Home } from 'lucide-react';
import { exportToExcel } from '../utils/exportUtils';
import { apiClient } from '../services/apiClient';
import Table from '../components/Table';
import styles from './Insumos.module.css';
import Layout from '../components/Layout';
import { showSuccess, showError, showConfirm } from '../utils/swal';
import { useAuth } from '../hooks/useAuth';

const Insumos = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { canView, loading: loadingPerms } = usePermissions();
  const [insumos, setInsumos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [loadingForm, setLoadingForm] = useState(false);
  const [form, setForm] = useState({ nombre: '', descripcion: '', cantidad: 0, unidad: 'Visita', ubicacion: '' });
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ unidad: '', ubicacion: '' });
  const [visibleColumns, setVisibleColumns] = useState(['nombre', 'descripcion', 'cantidad', 'unidad', 'ubicacion', 'last_entry', 'last_exit', 'actions']);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [editId, setEditId] = useState(null);
  
  // History Modal State
  const [showHistory, setShowHistory] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedInsumoName, setSelectedInsumoName] = useState('');

  useEffect(() => {
    fetchInsumos();
  }, []);

  async function fetchInsumos() {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('authToken');
      const response = await apiClient.get('/insumos', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (response.data && response.data.data) {
        setInsumos(response.data.data);
      } else if (Array.isArray(response.data)) {
        setInsumos(response.data);
      } else {
        setInsumos([]);
      }
      setError('');
    } catch (err) {
      console.error("Error fetching access log:", err);
      setInsumos([]);
      setError('Error al cargar la bitácora de entradas');
    } finally {
      setLoading(false);
    }
  }

  const handleEdit = (id) => {
    const insumo = insumos.find(i => i.id === id);
    if (insumo) {
      setForm({
        nombre: insumo.nombre,
        descripcion: insumo.descripcion,
        cantidad: insumo.cantidad,
        unidad: insumo.unidad,
        ubicacion: insumo.ubicacion
      });
      setEditId(id);
      setShowForm(true);
    }
  };

  const handleDelete = async (id) => {
    if (await showConfirm('¿Eliminar registro?', '¿Está seguro de que desea eliminar este registro de acceso?')) {
      try {
        const token = sessionStorage.getItem('authToken');
        await apiClient.delete(`/insumos/${id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        fetchInsumos();
        await showSuccess('Eliminado', 'Registro eliminado correctamente.');
      } catch (err) {
        console.error("Error deleting entry:", err);
        await showError('Error', 'Error al eliminar el registro de acceso');
      }
    }
  };

  const handleSubmit = async (formData) => {
    setLoadingForm(true);
    try {
      const token = sessionStorage.getItem('authToken');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      if (editId) {
        await apiClient.put(`/insumos/${editId}`, formData, { headers });
      } else {
        await apiClient.post('/insumos', formData, { headers });
      }

      fetchInsumos();
      setShowForm(false);
      setEditId(null);
      setForm({ nombre: '', descripcion: '', cantidad: 0, unidad: 'Visita', ubicacion: '' });
      await showSuccess('Éxito', 'Registro de entrada guardado correctamente.');
    } catch (err) {
      console.error("Error saving entry:", err);
      await showError('Error', 'Error al guardar el registro de entrada');
    } finally {
      setLoadingForm(false);
    }
  };

  const handleExport = () => {
    const dataToExport = filteredInsumos.map(item => ({
      'Visitante / Conductor': item.nombre,
      'Motivo / Placas': item.descripcion,
      'Acompañantes': item.cantidad,
      'Tipo de Acceso': item.unidad,
      'Destino / Lote': item.ubicacion,
      'Última Entrada': item.last_entry ? new Date(item.last_entry).toLocaleString() : '-',
      'Última Salida': item.last_exit ? new Date(item.last_exit).toLocaleString() : '-'
    }));
    exportToExcel(dataToExport, 'Bitacora_Entradas');
  };

  const handleViewHistory = async (item) => {
    setSelectedInsumoName(item.nombre);
    setShowHistory(true);
    setLoadingHistory(true);
    setHistoryData([]);
    
    try {
      const token = sessionStorage.getItem('authToken');
      const response = await apiClient.get(`/insumos/${item.id}/history`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (response.data && response.data.success) {
        setHistoryData(response.data.data);
      }
    } catch (err) {
      console.error("Error fetching visitor history:", err);
      await showError('Error', 'No se pudo cargar el historial de accesos');
    } finally {
      setLoadingHistory(false);
    }
  };

  const toggleColumn = (key) => {
    if (visibleColumns.includes(key)) {
      setVisibleColumns(visibleColumns.filter(c => c !== key));
    } else {
      setVisibleColumns([...visibleColumns, key]);
    }
  };

  const unidades = [...new Set(insumos.map(i => i.unidad).filter(Boolean))];
  const ubicaciones = [...new Set(insumos.map(i => i.ubicacion).filter(Boolean))];

  const allColumns = [
    { key: 'nombre', label: 'Visitante / Conductor' },
    { key: 'descripcion', label: 'Motivo / Placas' },
    { key: 'cantidad', label: 'Acompañantes' },
    { key: 'unidad', label: 'Tipo de Acceso' },
    { key: 'ubicacion', label: 'Destino / Lote' },
    { key: 'last_entry', label: 'Entrada' },
    { key: 'last_exit', label: 'Salida' },
    { key: 'actions', label: 'Acciones' }
  ];

  const columns = allColumns
    .filter(col => visibleColumns.includes(col.key))
    .map(col => {
      if (col.key === 'last_entry' || col.key === 'last_exit') {
        return {
          label: col.label,
          key: col.key,
          render: (item) => {
            if (!item[col.key]) return '-';
            
            const date = new Date(item[col.key]).toLocaleDateString() + ' ' + new Date(item[col.key]).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            const qtyKey = col.key === 'last_entry' ? 'last_entry_quantity' : 'last_exit_quantity';
            const qty = item[qtyKey];
            
            return (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span>{date}</span>
                {qty !== null && qty !== undefined && (
                  <span style={{ 
                    fontSize: '0.85em', 
                    fontWeight: 'bold',
                    color: col.key === 'last_entry' ? '#059669' : '#dc2626' 
                  }}>
                    {col.key === 'last_entry' ? `(+${qty})` : `(-${qty})`}
                  </span>
                )}
              </div>
            );
          }
        };
      }
      if (col.key === 'actions') {
        return {
          label: col.label,
          key: col.key,
          render: (item) => (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => handleViewHistory(item)} className="btn-icon" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#6b7280' }} title="Historial de Accesos">
                <History size={18} />
              </button>
              <button onClick={() => handleEdit(item.id)} className="btn-icon" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#2563eb' }} title="Editar">
                <Edit size={18} />
              </button>
              <button onClick={() => handleDelete(item.id)} className="btn-icon" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#ef4444' }} title="Eliminar">
                <Trash2 size={18} />
              </button>
            </div>
          )
        };
      }
      return { label: col.label, key: col.key };
    });

  const filteredInsumos = insumos.filter(item => {
    const s = search.toLowerCase();
    const matchesSearch = 
      (item.nombre?.toLowerCase() || '').includes(s) ||
      (item.descripcion?.toLowerCase() || '').includes(s) ||
      (item.unidad?.toLowerCase() || '').includes(s) ||
      (item.ubicacion?.toLowerCase() || '').includes(s) ||
      (String(item.cantidad) || '').includes(s);

    const matchesUnidad = filters.unidad ? item.unidad === filters.unidad : true;
    const matchesUbicacion = filters.ubicacion ? item.ubicacion === filters.ubicacion : true;
    return matchesSearch && matchesUnidad && matchesUbicacion;
  });

  if (loadingPerms) return null;

  if (!canView('supplies')) {
    return (
      <Layout>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <svg width="64" height="64" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" style={{ marginBottom: 24 }}><circle cx="12" cy="12" r="10" /><path d="M12 8v4" /><path d="M12 16h.01" /></svg>
          <h2 style={{ fontSize: '2rem', fontWeight: 600, marginBottom: 8 }}>Acceso No Autorizado</h2>
          <p style={{ color: '#6b7280', marginBottom: 24 }}>No tienes permisos para acceder a esta página.</p>
          <button className="btn" onClick={() => window.location.href = '/'} style={{ padding: '12px 24px', fontSize: '1rem', borderRadius: 8 }}>
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" style={{ marginRight: 8 }}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
            Volver al Inicio
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className={styles.pageWrapper}>
        {!showForm && !showHistory && (
        <>
        <div className={styles.headerRow}>
          <button 
            onClick={() => navigate('/dashboard')} 
            className={styles.backButton}
            title="Volver al Panel Principal"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className={styles.pageTitle}>Entradas a la Cerrada</h1>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginLeft: 'auto' }}>
            <button className={styles.btnAgregar} onClick={() => { setShowForm(true); setEditId(null); setForm({ nombre: '', descripcion: '', cantidad: 0, unidad: 'Visita', ubicacion: '' }); }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" style={{ marginRight: 6 }}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              Registrar Entrada
            </button>
          </div>
        </div>

        {/* Filtros y búsqueda */}
        <div style={{ background: 'white', padding: 16, borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, alignItems: 'end' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Tipo de Acceso</label>
              <select
                className="form-select"
                value={filters.unidad}
                onChange={e => setFilters({ ...filters, unidad: e.target.value })}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
              >
                <option value="">Todos</option>
                {unidades.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Destino / Lote</label>
              <select
                className="form-select"
                value={filters.ubicacion}
                onChange={e => setFilters({ ...filters, ubicacion: e.target.value })}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
              >
                <option value="">Todos</option>
                {ubicaciones.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              {['admin', 'presidente', 'vicepresidente'].includes(user?.role) && (
                <button
                  className={`${styles.btnExcel} btn btn-outline`}
                  onClick={handleExport}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#107c41', borderColor: '#107c41', background: 'white', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}
                  title="Exportar a Excel"
                >
                  <FileSpreadsheet size={20} />
                  Excel
                </button>
              )}
              <button className="btn btn-outline" onClick={() => setShowColumnSelector(!showColumnSelector)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'white', padding: '8px 16px', borderRadius: '4px', border: '1px solid #d1d5db', cursor: 'pointer' }} title="Columnas">
                <Columns size={20} />
                Columnas
              </button>
            </div>
          </div>

          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={20} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input
              className={styles.searchInput}
              type="text"
              placeholder="Buscar por visitante, placas, motivo o lote..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', paddingLeft: 40, height: '48px', fontSize: '1rem' }}
            />
          </div>

          {showColumnSelector && (
            <div className={styles.columnSelector} style={{ padding: '10px', border: '1px solid #eee', marginTop: '10px' }}>
              <h3>Columnas Visibles</h3>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {allColumns.map(col => (
                  <label key={col.key} className={styles.columnOption} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
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
            </div>
          )}
        </div>

        <Table
          columns={columns}
          data={filteredInsumos}
          loading={loading}
          error={error}
          selectable={false}
          rowKey="id"
        />
        </>
        )}

        {showForm && (
          <div style={{ background: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
             <div style={{ marginBottom: '24px', borderBottom: '1px solid #e5e7eb', paddingBottom: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <button
                  className={styles.backButton}
                  onClick={() => { setShowForm(false); setEditId(null); }}
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
                    <span style={{ cursor: 'pointer' }} onClick={() => setShowForm(false)}>Entradas</span>
                    <span style={{ margin: '0 8px' }}>/</span>
                    <span style={{ color: '#111827', fontWeight: 600 }}>{editId ? 'Editar' : 'Registrar'} Entrada</span>
                  </div>
                  <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#111827', margin: 0 }}>
                    {editId ? 'Editar Registro de Entrada' : 'Registrar Entrada'}
                  </h2>
                </div>
              </div>
          <AddInsumoModal
            onSubmit={handleSubmit}
            loading={loadingForm}
            initialData={form}
            onCancel={() => { setShowForm(false); setEditId(null); }}
          />
          {error && <p style={{ color: 'red', marginTop: 8 }}>{error}</p>}
        </div>
        )}

        {showHistory && (
          <div style={{ background: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
            <div style={{ marginBottom: '24px', borderBottom: '1px solid #e5e7eb', paddingBottom: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <button
                  className={styles.backButton}
                  onClick={() => setShowHistory(false)}
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
                    <span style={{ cursor: 'pointer' }} onClick={() => setShowHistory(false)}>Entradas</span>
                    <span style={{ margin: '0 8px' }}>/</span>
                    <span style={{ color: '#111827', fontWeight: 600 }}>Historial</span>
                  </div>
                  <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#111827', margin: 0 }}>
                    Historial de Accesos: {selectedInsumoName}
                  </h2>
                </div>
            </div>
          {loadingHistory ? (
            <p>Cargando historial...</p>
          ) : historyData.length === 0 ? (
            <p>No hay historial de accesos para este visitante.</p>
          ) : (
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
                    <th style={{ padding: '8px' }}>Fecha</th>
                    <th style={{ padding: '8px' }}>Reservación / Evento</th>
                    <th style={{ padding: '8px' }}>Detalles / Concepto</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Acompañantes</th>
                  </tr>
                </thead>
                <tbody>
                  {historyData.map((h, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '8px' }}>{new Date(h.date).toLocaleDateString()} {new Date(h.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                      <td style={{ padding: '8px' }}>{h.ticketNumber}</td>
                      <td style={{ padding: '8px' }}>{h.ticketTitle}</td>
                      <td style={{ 
                        padding: '8px', 
                        textAlign: 'right', 
                        fontWeight: 'bold', 
                        color: h.quantity > 0 ? '#059669' : '#dc2626' 
                      }}>
                        {h.quantity > 0 ? '+' : ''}{h.quantity}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div style={{ marginTop: '16px', textAlign: 'right' }}>
            <button className="btn btn-secondary" onClick={() => setShowHistory(false)}>Cerrar</button>
          </div>
        </div>
        )}

      </div>
    </Layout>
  );
}

export default Insumos;
