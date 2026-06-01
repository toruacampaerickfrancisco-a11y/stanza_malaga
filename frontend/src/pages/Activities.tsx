import React, { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { Activity, ActivityStatus, ActivityPriority, ActivityVisibility, User, Ticket } from '@/types';
import { activityService } from '../services/activityService';
import { userService } from '../services/userService';
import { ticketService } from '../services/ticketService';
import styles from './Activities.module.css';
import Modal from '../components/Modal';
import { Plus, Filter, Calendar, User as UserIcon, MessageSquare, Tag, Home, Edit, Trash2, Eye, FileSpreadsheet, Columns, Search, ArrowLeft, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Swal from 'sweetalert2';
import Table from '../components/Table'; // Importar Tabla
import { exportToExcel } from '../utils/exportUtils'; // Importar exportToExcel

// Estilos para badgets (reutilizados del CSS module o inline por simplicidad)
const badgeStyle = { px: '8px', py: '2px', r: '4px', fs: '12px' };

interface ParsedDescription {
  notes: string;
  budget: number;
  documentUrl?: string;
  documentName?: string;
}

const parseActivityDescription = (desc: string): ParsedDescription => {
  try {
    const d = (desc || '').trim();
    if (d.startsWith('{') && d.endsWith('}')) {
      return JSON.parse(d);
    }
  } catch (e) {
    // fallback
  }
  return { notes: desc || '', budget: 0 };
};

const Activities: React.FC = () => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [reservaciones, setReservaciones] = useState<Ticket[]>([]);
  
  // Filtros
  const [filterPriority, setFilterPriority] = useState<string>('');
  const [filterVisibility, setFilterVisibility] = useState<string>('');
  const [dateRange, setDateRange] = useState<{from?: string, to?: string}>({});
  const [searchTerm, setSearchTerm] = useState('');

  // Columnas Visibles - Incluyendo Presupuesto por defecto
  const [visibleColumns, setVisibleColumns] = useState<string[]>(['title', 'status', 'priority', 'budget', 'due_date', 'creator', 'actions']);
  const [showColumnSelector, setShowColumnSelector] = useState(false);

  // Modal Creation/Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentActivity, setCurrentActivity] = useState<Partial<Activity> | null>(null);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  
  // Estados para Presupuesto y Archivos Adjuntos
  const [projectNotes, setProjectNotes] = useState('');
  const [projectBudget, setProjectBudget] = useState<number | ''>('');
  const [attachedFile, setAttachedFile] = useState<{ url: string; name: string } | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  // View Details Modal
  const [viewActivity, setViewActivity] = useState<Activity | null>(null);
  const [commentText, setCommentText] = useState('');

  const navigate = useNavigate();

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await activityService.getActivities({
        priority: filterPriority,
        visibility: filterVisibility,
        from_date: dateRange.from,
        to_date: dateRange.to
      });
      setActivities(res.data || []);
      
      // Load users for assignment (fetch more to ensure we get all staff)
      const usersRes = await userService.getUsers({ limit: 1000 });

      // Load reservaciones
      const ticketsRes = await ticketService.getTickets({ limit: 100, status: 'nuevo' }); // Load recent/active reservaciones
      // Or maybe all open reservaciones ? For now just 100 recent.
      setReservaciones(ticketsRes.data || []);

      setUsers(usersRes.data || []);
    } catch (error) {
      console.error('Error loading data', error);
      Swal.fire('Error', 'No se pudieron cargar las actividades', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterPriority, filterVisibility, dateRange]);

  const handleExport = () => {
      const dataToExport = activities.map(act => ({
          'Título': act.title,
          'Descripción': act.description,
          'Prioridad': act.priority,
          'Estado': act.status,
          'Visibilidad': act.visibility,
          'Creado Por': act.creator?.nombre_completo || 'Desconocido',
          'Fecha Vencimiento': act.due_date ? new Date(act.due_date).toLocaleDateString() : '',
          'Fecha Creación': new Date(act.createdAt).toLocaleString()
      }));
      exportToExcel(dataToExport, 'Bitacora_Actividades');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const fileData = event.target?.result as string;
        const res = await activityService.uploadFile(file.name, fileData);
        if (res.success) {
          setAttachedFile({ url: res.url, name: res.name });
          Swal.fire('Subido', 'El documento de respaldo ha sido cargado', 'success');
        } else {
          Swal.fire('Error', 'No se pudo subir el archivo', 'error');
        }
        setUploadingFile(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading file:', error);
      Swal.fire('Error', 'Ocurrió un error al cargar el archivo', 'error');
      setUploadingFile(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentActivity?.title) return;

    try {
      const descJSON = JSON.stringify({
        notes: projectNotes,
        budget: Number(projectBudget) || 0,
        documentUrl: attachedFile?.url || undefined,
        documentName: attachedFile?.name || undefined
      });

      const payload: any = { 
        ...currentActivity, 
        description: descJSON 
      };

      if (selectedParticipants.length > 0) {
        payload.participants = selectedParticipants.map(uid => ({ user_id: uid, role: 'collaborator' }));
      }

      if (currentActivity.id) {
        // For update, we might need a different logic for participants if backend doesn't support full replace
        // But for now, let's assume updateActivity handles basic fields.
        // If we want to update participants, we might need separate calls or backend support.
        // Warning: Standard update usually doesn't update relations.
        await activityService.updateActivity(currentActivity.id, payload);
        Swal.fire('Actualizado', 'Actividad actualizada', 'success');
      } else {
        await activityService.createActivity(payload);
        Swal.fire('Creado', 'Actividad creada', 'success');
      }
      setIsModalOpen(false);
      setCurrentActivity(null);
      setSelectedParticipants([]);
      loadData();
    } catch (error) {
      Swal.fire('Error', 'Error al guardar actividad', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: '¿Eliminar actividad?',
      text: "No podrás revertir esto",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar'
    });

    if (result.isConfirmed) {
      try {
        await activityService.deleteActivity(id);
        loadData();
        Swal.fire('Eliminado', 'La actividad ha sido eliminada', 'success');
        if (viewActivity?.id === id) setViewActivity(null);
      } catch (error) {
        Swal.fire('Error', 'No se pudo eliminar', 'error');
      }
    }
  };

  const handleStatusChange = async (activity: Activity, newStatus: ActivityStatus) => {
    try {
      await activityService.updateActivity(activity.id, { status: newStatus });
      
      // Update viewActivity if it matches
      if (viewActivity?.id === activity.id) {
          setViewActivity((prev: Activity | null) => prev ? ({ ...prev, status: newStatus }) : null);
      }

      // update local state optimistically
      setActivities(prev => prev.map(a => a.id === activity.id ? { ...a, status: newStatus } : a));
    } catch (error) {
        loadData(); // revert on error
    }
  };
  
  const handleAddComment = async () => {
      if (!viewActivity || !commentText.trim()) return;
      try {
          const res = await activityService.addComment(viewActivity.id, commentText);
          const newComment = res.data;
          
          // Update view modal state
          const updatedActivity = { 
              ...viewActivity, 
              comments: [newComment, ...(viewActivity.comments || [])] 
          };
          setViewActivity(updatedActivity);
          
          // Update list state
          setActivities(prev => prev.map(a => a.id === viewActivity.id ? updatedActivity : a));
          
          setCommentText('');
      } catch (error) {
          console.error(error);
      }
  };

  const openNewModal = () => {
      setProjectNotes('');
      setProjectBudget('');
      setAttachedFile(null);
      setCurrentActivity({
          title: '',
          description: '',
          priority: 'normal',
          visibility: 'team',
          status: 'todo',
          ticket_id: ''
      });
      setSelectedParticipants([]);
      setIsModalOpen(true);
  };

  const openEditModal = (activity: Activity) => {
    const parsed = parseActivityDescription(activity.description);
    setProjectNotes(parsed.notes);
    setProjectBudget(parsed.budget || '');
    setAttachedFile(parsed.documentUrl ? { url: parsed.documentUrl, name: parsed.documentName || 'Documento' } : null);
    setCurrentActivity(activity);
    // Populate participants if they exist
    if (activity.participants) {
        setSelectedParticipants(activity.participants.map((p: any) => p.user_id));
    } else {
        setSelectedParticipants([]);
    }
    setIsModalOpen(true);
  };

  const allColumns = [
    { 
      key: 'title', 
      label: 'Título', 
      render: (row: Activity) => <span style={{ fontWeight: 500 }}>{row.title}</span> 
    },
    { 
       key: 'budget', 
       label: 'Presupuesto',
       render: (row: Activity) => {
         const parsed = parseActivityDescription(row.description);
         return parsed.budget > 0 
           ? <strong style={{ color: '#10b981' }}>${parsed.budget.toLocaleString('es-MX')}</strong> 
           : <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>-</span>;
       }
    },
    { 
      key: 'status', 
      label: 'Estado', 
      render: (row: Activity) => {
        const map: Record<string, string> = { 'todo': 'Por Hacer', 'in_progress': 'En Progreso', 'review': 'En Revisión', 'done': 'Completado' };
        const color: Record<string, string> = { 'todo': '#6c757d', 'in_progress': '#007bff', 'review': '#ffc107', 'done': '#28a745' };
        return (
            <span style={{ backgroundColor: color[row.status] || '#ccc', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>
                {map[row.status] || row.status}
            </span>
        );
      }
    },
    { 
       key: 'priority', 
       label: 'Prioridad',
       render: (row: Activity) => {
           const map: Record<string, string> = { 'low': 'Baja', 'normal': 'Normal', 'high': 'Alta', 'urgent': 'Urgente' };
           const color: Record<string, string> = { 'low': '#28a745', 'normal': '#17a2b8', 'high': '#ffc107', 'urgent': '#dc3545' };
           return (
            <span style={{ color: color[row.priority] || '#333', fontWeight: 'bold', fontSize: '13px' }}>
                {map[row.priority] || row.priority}
            </span>
           );
       }
    },
    { 
       key: 'due_date', 
       label: 'Vencimiento',
       render: (row: Activity) => row.due_date ? new Date(row.due_date).toLocaleDateString() : '-' 
    },
    { 
       key: 'creator', 
       label: 'Creador',
       render: (row: Activity) => row.creator?.nombre_completo || 'Desconocido'
    },
    {
       key: 'actions',
       label: 'Acciones',
       render: (row: Activity) => (
         <div style={{ display: 'flex', gap: '8px' }}>
           <button 
             onClick={() => setViewActivity(row)}
             style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#666' }}
             title="Ver detalles"
           >
             <Eye size={18} />
           </button>
           <button 
             onClick={() => openEditModal(row)}
             style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#0052cc' }}
             title="Editar"
           >
             <Edit size={18} />
           </button>
           <button 
             onClick={() => handleDelete(row.id)}
             style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#dc3545' }}
             title="Eliminar"
           >
             <Trash2 size={18} />
           </button>
         </div>
       )
    }
  ];

  const filteredColumns = allColumns.filter(col => visibleColumns.includes(col.key));
  
  const filteredActivities = activities.filter(act => 
     searchTerm === '' || 
     act.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
     (act.description && act.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <Layout title="Bitácora de Actividades">
      {!isModalOpen ? (
      <div style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px', gap: '12px' }}>
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
              justifyContent: 'center' 
            }}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#111827', margin: 0 }}>Gestión de Actividades</h1>
            <p style={{ margin: 0, color: '#6b7280' }}>Administra las tareas y actividades de la administración.</p>
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* ROW 1: Filters (Left) and Aux Buttons (Right) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
                  
                  {/* Left: Filters */}
                  <div style={{ display: 'flex', gap: '16px', flex: 1, flexWrap: 'wrap' }}>
                    <div className="form-group" style={{ marginBottom: 0, minWidth: '200px' }}>
                        <label className="form-label" style={{ display:'block', marginBottom:'4px', fontSize:'14px', fontWeight:500 }}>Prioridad</label>
                        <select 
                            className="form-select"
                            style={{ width:'100%', padding:'8px', borderRadius:'4px', border:'1px solid #d1d5db' }}
                            value={filterPriority} 
                            onChange={e => setFilterPriority(e.target.value)}
                        >
                            <option value="">TODAS</option>
                            <option value="low">BAJA</option>
                            <option value="normal">NORMAL</option>
                            <option value="high">ALTA</option>
                            <option value="urgent">URGENTE</option>
                        </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0, minWidth: '200px' }}>
                        <label className="form-label" style={{ display:'block', marginBottom:'4px', fontSize:'14px', fontWeight:500 }}>Visibilidad</label>
                        <select 
                            className="form-select"
                            style={{ width:'100%', padding:'8px', borderRadius:'4px', border:'1px solid #d1d5db' }}
                            value={filterVisibility} 
                            onChange={e => setFilterVisibility(e.target.value)}
                        >
                            <option value="">TODAS</option>
                            <option value="team">INTERNO</option>
                            <option value="private">PRIVADO</option>
                            <option value="public">PÚBLICO</option>
                        </select>
                    </div>
                  </div>

                  {/* Right: Excel & Columns (Aligned to bottom of fitlers) */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                          onClick={handleExport}
                          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'white', border: '1px solid #107c41', color: '#107c41', borderRadius: '4px', cursor: 'pointer', height: '38px' }}
                      >
                          <FileSpreadsheet size={20} />
                          Excel
                      </button>

                      <div style={{ position: 'relative' }}>
                        <button 
                          onClick={() => setShowColumnSelector(!showColumnSelector)}
                          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'white', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer', height: '38px' }}
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
                            borderRadius: '8px',
                            padding: '12px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            zIndex: 50,
                            width: '200px'
                          }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {allColumns.map(col => (
                                <label key={col.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                                  <input
                                    type="checkbox"
                                    checked={visibleColumns.includes(col.key)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setVisibleColumns([...visibleColumns, col.key]);
                                      } else {
                                        setVisibleColumns(visibleColumns.filter(k => k !== col.key));
                                      }
                                    }}
                                  />
                                  {col.label}
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                  </div>
              </div>

              {/* ROW 2: Search Bar (Full Width) */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                 <div style={{ position: 'relative', width: '100%' }}>
                    <Search size={20} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                    <input 
                       type="text" 
                       placeholder="Buscar actividades..." 
                       value={searchTerm}
                       onChange={e => setSearchTerm(e.target.value)}
                       style={{ width: '100%', paddingLeft: 40, height: '48px', fontSize: '1rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
                    />
                 </div>
              </div>

              {/* ROW 3: Add Button (Right) */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <button 
                      onClick={openNewModal}
                      className={styles.btnAgregar}
                  >
                      <Plus size={16} />
                      Agregar
                  </button>
              </div>

            </div>

            <Table 
                columns={filteredColumns}
                data={filteredActivities}
                loading={loading}
                onRowClick={(row) => setViewActivity(row)}
            />
        </div>
      </div>
      ) : (
      <div style={{ background: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', margin: '20px' }}>
          <div style={{ marginBottom: '24px', borderBottom: '1px solid #e5e7eb', paddingBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', fontSize: '14px', color: '#6b7280', marginBottom: '8px', fontFamily: 'system-ui' }}>
              <span style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={() => navigate('/dashboard')}>
                 <Home size={14} style={{ marginRight: 4 }} /> Inicio
              </span>
              <span style={{ margin: '0 8px' }}>/</span>
              <span style={{ cursor: 'pointer' }} onClick={() => setIsModalOpen(false)}>Actividades</span>
              <span style={{ margin: '0 8px' }}>/</span>
              <span style={{ color: '#111827', fontWeight: 600 }}>{currentActivity?.id ? 'Editar' : 'Crear'} Actividad</span>
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#111827', margin: 0 }}>
              {currentActivity?.id ? 'Editar Actividad' : 'Crear Actividad'}
            </h2>
          </div>

        <form onSubmit={handleCreate}>
            <div className={styles.formGroup}>
                <label className={styles.label}>Título</label>
                <input 
                    className={styles.input} 
                    required 
                    value={currentActivity?.title || ''} 
                    onChange={e => setCurrentActivity({...currentActivity!, title: e.target.value})}
                />
            </div>
            
            <div className={styles.formGroup}>
                <label className={styles.label}>Notas / Descripción del Proyecto</label>
                <textarea 
                    className={styles.textarea} 
                    value={projectNotes} 
                    onChange={e => setProjectNotes(e.target.value)}
                    placeholder="Detalles sobre el proyecto, materiales, cotizaciones, etc..."
                />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Presupuesto Estimado ($)</label>
                    <input 
                        type="number"
                        className={styles.input} 
                        placeholder="Ej: 25000"
                        value={projectBudget} 
                        onChange={e => setProjectBudget(e.target.value === '' ? '' : Number(e.target.value))}
                    />
                </div>
                
                <div className={styles.formGroup}>
                    <label className={styles.label}>Documento de Respaldo / Cotización</label>
                    <input 
                        type="file"
                        className={styles.input} 
                        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                        onChange={handleFileChange}
                        disabled={uploadingFile}
                    />
                    {uploadingFile && <span style={{ fontSize: '12px', color: '#3b82f6', display: 'block', marginTop: '4px' }}>Cargando archivo...</span>}
                    {attachedFile && (
                      <div style={{ marginTop: '5px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: '#22c55e', fontWeight: 600 }}>✓ {attachedFile.name}</span>
                        <button 
                          type="button" 
                          onClick={() => setAttachedFile(null)}
                          style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '11px' }}
                        >
                          Remover
                        </button>
                      </div>
                    )}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Prioridad</label>
                    <select 
                        className={styles.select}
                        value={currentActivity?.priority || 'normal'}
                        onChange={e => setCurrentActivity({...currentActivity!, priority: e.target.value as ActivityPriority})}
                    >
                        <option value="low">Baja</option>
                        <option value="normal">Normal</option>
                        <option value="high">Alta</option>
                        <option value="urgent">Urgente</option>
                    </select>
                </div>
                
                <div className={styles.formGroup}>
                    <label className={styles.label}>Visibilidad</label>
                    <select 
                         className={styles.select}
                         value={currentActivity?.visibility || 'team'}
                         onChange={e => setCurrentActivity({...currentActivity!, visibility: e.target.value as ActivityVisibility})}
                    >
                        <option value="team">Mesa Directiva / Administración</option>
                        <option value="private">Privado (Solo yo)</option>
                        <option value="public">Público</option>
                    </select>
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label}>Estado</label>
                    <select 
                         className={styles.select}
                         value={currentActivity?.status || 'todo'}
                         onChange={e => setCurrentActivity({...currentActivity!, status: e.target.value as ActivityStatus})}
                    >
                         <option value="todo">Por Hacer</option>
                         <option value="in_progress">En Progreso</option>
                         <option value="review">En Revisión</option>
                         <option value="done">Completado</option>
                    </select>
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label}>Fecha Vencimiento</label>
                    <input 
                        type="date"
                        className={styles.input}
                        value={currentActivity?.due_date ? currentActivity.due_date.split('T')[0] : ''}
                        onChange={e => setCurrentActivity({...currentActivity!, due_date: e.target.value})}
                    />
                </div>
            </div>

            <div className={styles.formGroup} style={{ marginTop: '10px' }}>
                <label className={styles.label}>Relacionar con Reservación (Opcional)</label>
                <select 
                    className={styles.select}
                    value={currentActivity?.ticket_id || ''}
                    onChange={e => setCurrentActivity({...currentActivity!, ticket_id: e.target.value})}
                >
                    <option value="">-- Ninguna --</option>
                    {reservaciones.map(t => (
                        <option key={t.id} value={t.id}>{t.ticketNumber} - {t.title}</option>
                    ))}
                </select>
            </div>

            <div className={styles.formGroup} style={{ marginTop: '10px' }}>
                <label className={styles.label}>Participantes (Responsables/Admin)</label>
                <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #d1d5db', borderRadius: '4px', padding: '8px' }}>
                    {users
                        .filter(u => ['admin', 'presidente', 'vicepresidente', 'tesorero', 'eventos', 'guardia'].includes(u.role))
                        .sort((a, b) => (a.fullName || a.username).localeCompare(b.fullName || b.username))
                        .map(u => (
                        <div key={u.id} style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                            <input 
                                type="checkbox" 
                                checked={selectedParticipants.includes(u.id)}
                                onChange={e => {
                                    if (e.target.checked) setSelectedParticipants([...selectedParticipants, u.id]);
                                    else setSelectedParticipants(selectedParticipants.filter(id => id !== u.id));
                                }}
                                style={{ marginRight: '8px' }}
                            />
                            <span>{u.fullName || u.username}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid #ccc', background: 'white' }}>Regresar</button>
                <button type="submit" style={{ padding: '8px 16px', borderRadius: '4px', border: 'none', background: '#0052cc', color: 'white' }}>Guardar</button>
            </div>
        </form>
      </div>)}

      {/* VIEW DETAILS MODAL */}
      <Modal
        isOpen={!!viewActivity}
        onClose={() => setViewActivity(null)}
        title={viewActivity?.title || ''}
        size="lg"
      >
          {(() => {
              if (!viewActivity) return null;
              const parsed = parseActivityDescription(viewActivity.description);
              
              let docUrl = '';
              if (parsed.documentUrl) {
                if (parsed.documentUrl.startsWith('http')) {
                  docUrl = parsed.documentUrl;
                } else {
                  const isNative = window.location.origin.includes('localhost') && !window.location.port;
                  const base = (isNative || window.location.protocol.startsWith('capacitor')) ? 'http://10.0.2.2:3000' : `http://${window.location.hostname}:3000`;
                  docUrl = `${base}${parsed.documentUrl}`;
                }
              }

              return (
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
                  {/* Left Column: Details & Comments */}
                  <div>
                      <div style={{ marginBottom: '20px' }}>
                           <label className={styles.label}>Notas / Descripción del Proyecto</label>
                           <div style={{ padding: '12px', background: '#f9fafb', borderRadius: '6px', border: '1px solid #e5e7eb', minHeight: '60px', whiteSpace: 'pre-wrap', color: '#1f2937' }}>
                               {parsed.notes || 'Sin notas registradas.'}
                           </div>
                      </div>

                      {parsed.budget > 0 && (
                        <div style={{ marginBottom: '20px' }}>
                             <label className={styles.label} style={{ color: '#047857', fontWeight: 600 }}>Presupuesto Estimado / Costo Obra</label>
                             <div style={{ padding: '12px 16px', background: '#d1fae5', borderRadius: '8px', border: '1px solid #a7f3d0', color: '#065f46', fontSize: '1.25rem', fontWeight: 700 }}>
                                 ${parsed.budget.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                             </div>
                        </div>
                      )}

                      {docUrl && (
                        <div style={{ marginBottom: '20px' }}>
                             <label className={styles.label} style={{ color: '#800020', fontWeight: 600 }}>Documento de Respaldo / Cotización</label>
                             <div>
                                 <a 
                                     href={docUrl} 
                                     target="_blank" 
                                     rel="noopener noreferrer"
                                     style={{ 
                                         display: 'inline-flex', 
                                         alignItems: 'center', 
                                         gap: '8px', 
                                         padding: '10px 16px', 
                                         background: '#800020', 
                                         color: 'white', 
                                         borderRadius: '6px', 
                                         textDecoration: 'none', 
                                         fontWeight: 600,
                                         boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                     }}
                                 >
                                     <Download size={16} />
                                     Ver Documento Adjunto ({parsed.documentName || 'Respaldo'})
                                 </a>
                             </div>
                        </div>
                      )}

                      {viewActivity.ticket && (
                        <div style={{ marginBottom: '20px' }}>
                             <label className={styles.label}>Reservación Relacionada</label>
                             <div style={{ padding: '10px', background: '#e3f2fd', borderRadius: '4px', border: '1px solid #bbdefb', color: '#0d47a1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                 <Tag size={16} />
                                 <span style={{ fontWeight: 600 }}>{viewActivity.ticket.ticketNumber}</span>
                                 <span>- {viewActivity.ticket.title}</span>
                             </div>
                        </div>
                      )}

                      <div style={{ marginBottom: '20px' }}>
                          <h4 style={{ marginBottom: '10px' }}>Comentarios</h4>
                          <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '15px' }}>
                              {viewActivity.comments?.map((comment: any) => (
                                  <div key={comment.id} style={{ marginBottom: '10px', padding: '10px', background: 'white', border: '1px solid #eee', borderRadius: '4px' }}>
                                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display:'flex', justifyContent:'space-between' }}>
                                          <strong>{comment.author?.nombre_completo || 'Usuario'}</strong>
                                          <span>{comment.createdAt ? new Date(comment.createdAt).toLocaleString() : ''}</span>
                                      </div>
                                      <div>{comment.content}</div>
                                  </div>
                              ))}
                              {(!viewActivity.comments || viewActivity.comments.length === 0) && (
                                  <div style={{ color: '#888', fontStyle: 'italic' }}>No hay comentarios aún.</div>
                              )}
                          </div>
                          
                          <div style={{ display: 'flex', gap: '10px' }}>
                              <input 
                                  className={styles.input} 
                                  placeholder="Escribe un comentario..." 
                                  value={commentText}
                                  onChange={e => setCommentText(e.target.value)}
                                  onKeyPress={e => e.key === 'Enter' && handleAddComment()}
                              />
                              <button onClick={handleAddComment} className={styles.addButton}><MessageSquare size={16}/></button>
                          </div>
                      </div>
                  </div>

                  {/* Right Column: Meta & Actions */}
                  <div style={{ background: '#f4f5f7', padding: '15px', borderRadius: '8px' }}>
                      <div className={styles.formGroup}>
                           <label className={styles.label}>Estado</label>
                           <select 
                                className={styles.select}
                                value={viewActivity.status}
                                onChange={e => handleStatusChange(viewActivity, e.target.value as ActivityStatus)}
                           >
                                <option value="todo">Por Hacer</option>
                                <option value="in_progress">En Progreso</option>
                                <option value="review">En Revisión</option>
                                <option value="done">Completado</option>
                           </select>
                      </div>

                      <div className={styles.formGroup}>
                           <label className={styles.label}>Prioridad</label>
                           <div className={styles.badge} style={{ display:'inline-block', background: '#fff', border: '1px solid #ccc' }}>
                               {viewActivity.priority}
                           </div>
                      </div>
                      
                      <div className={styles.formGroup}>
                           <label className={styles.label}>Creado por</label>
                           <span>{viewActivity.creator?.nombre_completo || 'Desconocido'}</span>
                      </div>

                      <div className={styles.formGroup}>
                           <label className={styles.label}>Participantes</label>
                           <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                               {viewActivity.participants?.map((p: any) => (
                                   <div key={p.id} className={styles.avatar} title={p.user?.nombre_completo}>
                                       {p.user?.nombre_completo?.charAt(0) || '?'}
                                   </div>
                               ))}
                           </div>
                      </div>

                      <div style={{ marginTop: '30px', borderTop: '1px solid #ddd', paddingTop: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <button 
                              onClick={() => { setIsModalOpen(true); setViewActivity(null); setCurrentActivity(viewActivity); }}
                              style={{ width:'100%', padding: '8px', background: 'white', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}
                          >
                              Editar
                          </button>
                          <button 
                              onClick={() => handleDelete(viewActivity.id)}
                              style={{ width:'100%', padding: '8px', background: '#ffebe6', color: '#bf2600', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                          >
                              Eliminar
                          </button>
                      </div>
                  </div>
              </div>
              );
          })()}
      </Modal>

    </Layout>
  );
};

export default Activities;
