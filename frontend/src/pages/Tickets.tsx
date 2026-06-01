import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Ticket, Equipment, User } from '@/types';
import { ticketService } from '../services/ticketService';
import { equipmentService } from '../services/equipmentService';
import { userService } from '../services/userService';
import styles from './Tickets.module.css';
import Table from '../components/Table';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import { Plus, Eye, Pencil, Play, CheckCircle, X, FileText, Filter, Columns, ChevronLeft, ChevronRight, Search, Trash2, FileSpreadsheet, ArrowLeft, Home } from 'lucide-react';
import TicketForm from '../components/TicketForm';
import { exportToExcel } from '../utils/exportUtils';
import { useAuth } from '../hooks/useAuth';
import { showSuccess, showError, showConfirm } from '../utils/swal';
import Swal from 'sweetalert2';

const calculateEndTime = (startTime: string, durationHours: number): string => {
  if (!startTime) return '';
  const [hoursStr, minutesStr] = startTime.split(':');
  let hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);
  if (isNaN(hours) || isNaN(minutes)) return '';
  
  hours += durationHours;
  const endHours = hours % 24;
  const formattedHours = String(endHours).padStart(2, '0');
  const formattedMinutes = String(minutes).padStart(2, '0');
  return `${formattedHours}:${formattedMinutes}`;
};

const TicketStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, string> = {
    'solicitado': 'new',
    'confirmado': 'inProgress',
    'realizado': 'closed',
    'cancelado': 'pending'
  };
  const statusKey = map[status] || status;
  return <span className={`${styles.statusBadge} ${styles[statusKey]}`}>{status.replace('_', ' ')}</span>;
};

const PriorityBadge: React.FC<{ priority: string }> = ({ priority }) => (
  <span className={`${styles.priorityBadge} ${styles[priority]}`}>{priority}</span>
);

const TicketsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination & Filters State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTickets, setTotalTickets] = useState(0);
  const [filters, setFilters] = useState({ status: '', priority: '', serviceType: '', search: '' });
  const [visibleColumns, setVisibleColumns] = useState<string[]>(['ticketNumber', 'eventDate', 'priority', 'status', 'assignedTo', 'createdAt', 'actions']);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [currentTicket, setCurrentTicket] = useState<Ticket | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedTicketIds, setSelectedTicketIds] = useState<(string | number)[]>([]);
  const [preselectedDate, setPreselectedDate] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      const promises: Promise<any>[] = [
        ticketService.getTickets({
          page,
          limit,
          search: filters.search,
          status: filters.status,
          priority: filters.priority,
          serviceType: filters.serviceType
        }),
        equipmentService.getEquipment({ limit: 1000 })
      ];

      // Only fetch users if technician or management to avoid 403 errors
      const canViewUsers = ['admin', 'presidente', 'vicepresidente', 'eventos', 'tecnico', 'technician'].includes(user?.role || '');
      if (canViewUsers) {
        promises.push(userService.getUsers({ limit: 1000, isActive: 'true' }));
      }

      const results = await Promise.all(promises);
      
      const ticketsResponse = results[0];
      const equipmentResponse = results[1];
      const usersResponse = canViewUsers ? results[2] : { data: [] };
      
      setTickets(ticketsResponse.data || []);
      setTotalPages(ticketsResponse.pagination?.totalPages || 1);
      setTotalTickets(ticketsResponse.pagination?.total || 0);

      setEquipment(equipmentResponse.data || []);
      setUsers(usersResponse.data || []);
      setError(null);
    } catch (err) {
      setError('No se pudo cargar los datos. Por favor, intente de nuevo.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, filters, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (location.state && (location.state as any).openCreateModal) {
      const date = (location.state as any).selectedDate || null;
      handleOpenModal(null, date);
      // Clear location state
      window.history.replaceState({}, document.title);
    }
  }, [location, fetchData]);

  const handleOpenModal = (ticket: Ticket | null = null, date: string | null = null) => {
    setCurrentTicket(ticket);
    setIsEditing(!!ticket);
    setPreselectedDate(date);
    setIsModalOpen(true);
  };

  const handleOpenDetailsModal = (ticket: Ticket) => {
    setCurrentTicket(ticket);
    setIsDetailsModalOpen(true);
  };

  const handleCloseModals = () => {
    setIsModalOpen(false);
    setIsDetailsModalOpen(false);
    setCurrentTicket(null);
    setIsEditing(false);
    setPreselectedDate(null);
    setError(null);
  };

  const handleSubmit = async (data: any) => {
    const backendPayload = {
      title: data.title,
      description: data.description,
      priority: data.priority,
      status: data.status,
      serviceType: data.serviceType,
      equipmentId: data.equipmentId || null,
      assignedToId: (data.assignedToId && data.assignedToId !== '') ? data.assignedToId : null,
      reportedById: data.reportedById, // Include reportedById
      diagnosis: data.diagnosis,
      solution: data.solution,
      notes: data.notes, // Include notes
      partsUsed: data.partsUsed,
      timeSpent: data.timeSpent ? Number(data.timeSpent) : undefined,
      eventDate: data.eventDate || null,
      eventTime: data.eventTime || null,
      eventDuration: data.eventDuration ? Number(data.eventDuration) : 5
    };

    try {
      if (isEditing && currentTicket) {
        await ticketService.updateTicket(currentTicket.id, backendPayload);
        await showSuccess('Éxito', 'Reservación actualizada exitosamente.');
      } else {
        await ticketService.createTicket(backendPayload as any);
        await showSuccess('Éxito', 'Reservación creada exitosamente.');
      }
      fetchData();
      handleCloseModals();
    } catch (err: any) {
      const errorMessage = err.message || 'Ocurrió un error al guardar la reservación.';
      await showError('Error', errorMessage);
      console.error(err);
    }
  };
  
  const handleStatusChange = async (id: string, status: 'solicitado' | 'confirmado' | 'realizado' | 'cancelado') => {
    try {
      await ticketService.updateTicket(id, { status } as any);
      fetchData();
      if (currentTicket && currentTicket.id === id) {
        setCurrentTicket({ ...currentTicket, status });
      }
    } catch (err) {
      setError('Error al actualizar el estado.');
    }
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: '¿Eliminar reservación?',
      text: 'Por favor, ingrese una justificación para eliminar esta reservación.',
      input: 'textarea',
      inputPlaceholder: 'Escriba la justificación aquí...',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444',
      inputValidator: (value) => {
        if (!value) {
          return '¡Necesita escribir una justificación!';
        }
      }
    });

    if (result.isConfirmed && result.value) {
      try {
        await ticketService.deleteTicket(id, result.value);
        fetchData();
        await showSuccess('Eliminada', 'Reservación eliminada correctamente.');
      } catch (err) {
        setError('Error al eliminar la reservación.');
        console.error(err);
      }
    }
  };

  const handleBulkDelete = async () => {
    if (await showConfirm('¿Eliminar reservaciones?', `¿Estás seguro de eliminar ${selectedTicketIds.length} reservaciones?`)) {
      try {
        setLoading(true);
        await Promise.all(selectedTicketIds.map(id => ticketService.deleteTicket(id.toString())));
        await fetchData();
        setSelectedTicketIds([]);
        await showSuccess('Eliminadas', 'Reservaciones eliminadas correctamente.');
      } catch (err) {
        console.error('Error deleting reservations:', err);
        setError('Error al eliminar algunas reservaciones. Por favor intente de nuevo.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleExport = async () => {
    try {
      setLoading(true);
      // Fetch all tickets matching current filters
      const response = await ticketService.getTickets({
        page: 1,
        limit: 10000,
        search: filters.search,
        status: filters.status,
        priority: filters.priority,
        serviceType: filters.serviceType
      });
      
      const allTickets = response.data || [];

      const dataToExport = allTickets.map(ticket => {
        const row: Record<string, any> = {};
        
        if (visibleColumns.includes('ticketNumber')) row['Folio'] = ticket.ticketNumber;
        if (visibleColumns.includes('title')) row['Evento'] = ticket.title;
        if (visibleColumns.includes('eventDate')) {
          row['Fecha Evento'] = ticket.eventDate || 'N/A';
          row['Hora Inicio'] = ticket.eventTime || 'N/A';
          row['Hora Término'] = ticket.eventTime ? calculateEndTime(ticket.eventTime, ticket.eventDuration || 5) : 'N/A';
          row['Duración (Horas)'] = ticket.eventDuration || 5;
        }
        if (visibleColumns.includes('equipment')) row['Área Común'] = ticket.equipment ? ticket.equipment.name : 'N/A';
        if (visibleColumns.includes('status')) row['Estatus'] = ticket.status;
        if (visibleColumns.includes('priority')) row['Prioridad'] = ticket.priority;
        if (visibleColumns.includes('serviceType')) row['Categoría'] = ticket.serviceType;
        if (visibleColumns.includes('reportedBy')) row['Residente'] = ticket.reportedBy?.fullName || 'N/A';
        if (visibleColumns.includes('assignedTo')) row['Encargado'] = ticket.assignedTo?.fullName || 'No asignado';
        if (visibleColumns.includes('createdAt')) row['Fecha Solicitud'] = new Date(ticket.createdAt).toLocaleDateString();
        
        return row;
      });

      exportToExcel(dataToExport, 'Reservaciones');
    } catch (err) {
      console.error('Error exporting tickets:', err);
      await showError('Error', 'No se pudo exportar los datos.');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePdf = async (ticketId: string) => {
    try {
      const blob = await ticketService.generatePdf(ticketId);
      // Crear un nuevo Blob asegurando el tipo MIME correcto
      const pdfBlob = new Blob([blob], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ticket-${ticketId}.pdf`);
      // Añadir target="_blank" puede ayudar a evitar bloqueos de descargas en algunos navegadores
      link.setAttribute('target', '_blank'); 
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      // Liberar el objeto URL después de un breve retraso
      setTimeout(() => window.URL.revokeObjectURL(url), 100);
    } catch (error) {
      console.error('Error generating PDF:', error);
      await showError('Error', 'Error al generar el PDF. Verifique que tenga permisos.');
    }
  };

  const allColumns = [
    {
      key: 'ticketNumber',
      label: 'Folio / Evento',
      render: (ticket: Ticket) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span>{ticket.ticketNumber}</span>
          <strong>{ticket.title}</strong>
        </div>
      ),
    },
    {
      key: 'eventDate',
      label: 'Fecha del Evento',
      render: (ticket: Ticket) => {
        if (!ticket.eventDate) return <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>No especificada</span>;
        
        try {
          const formattedDate = new Date(ticket.eventDate + 'T00:00:00').toLocaleDateString('es-MX', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });
          
          const endTime = ticket.eventTime ? calculateEndTime(ticket.eventTime, ticket.eventDuration || 5) : '';
          
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontWeight: 500 }}>{formattedDate}</span>
              {ticket.eventTime && (
                <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                  de {ticket.eventTime} a {endTime} ({ticket.eventDuration || 5} horas)
                </span>
              )}
            </div>
          );
        } catch (e) {
          return <span>{ticket.eventDate}</span>;
        }
      }
    },
    {
      key: 'equipment',
      label: 'Área Común',
      render: (ticket: Ticket) => ticket.equipment ? ticket.equipment.name : 'N/A'
    },
    {
      key: 'status',
      label: 'Estatus de Confirmación',
      render: (ticket: Ticket) => ticket.status === 'solicitado' ? 'Solicitado' :
                       ticket.status === 'confirmado' ? 'Confirmado' :
                       ticket.status === 'realizado' ? 'Realizado' :
                       ticket.status === 'cancelado' ? 'Cancelado' : ticket.status
    },
    {
      key: 'priority',
      label: 'Cuota',
      render: (ticket: Ticket) => ticket.priority === 'sin_clasificar' ? 'Sin Cuota' :
                       ticket.priority === 'normal' ? 'Cuota de $1,500' :
                       ticket.priority === 'importante' ? 'Cuota Especial' : ticket.priority
    },
    {
      key: 'reportedBy',
      label: 'Residente',
      render: (ticket: Ticket) => <span>{ticket.reportedBy?.fullName || 'N/A'}</span>,
    },
    {
      key: 'assignedTo',
      label: 'Responsable de Mesa Directiva',
      render: (ticket: Ticket) => {
        return ticket.assignedTo ? (
          <span>{ticket.assignedTo.fullName}</span>
        ) : (
          <span style={{ color: '#bdbdbd', fontStyle: 'italic' }}>No asignado</span>
        );
      },
    },
    {
      key: 'createdAt',
      label: 'Fecha Solicitud',
      render: (ticket: Ticket) => <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>,
    },
    {
      key: 'actions',
      label: 'Acciones',
      render: (ticket: Ticket) => {
        const isManager = ['admin', 'presidente', 'vicepresidente', 'eventos'].includes(user?.role || '');
        const isViewOnly = ticket.status === 'realizado' || (ticket.status === 'cancelado' && !isManager);

        return (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button 
            onClick={(e) => { e.stopPropagation(); handleOpenModal(ticket); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: isViewOnly ? '#6b7280' : '#2563eb' }}
            title={isViewOnly ? "Ver Detalles" : "Editar"}
          >
            {isViewOnly ? <Eye size={16} /> : <Pencil size={16} />}
          </button>
          
          {/* Quick actions for managers on 'solicitado' tickets */}
          {isManager && ticket.status === 'solicitado' && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); handleStatusChange(ticket.id, 'confirmado'); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#10b981' }}
                title="Confirmar Reservación"
              >
                <CheckCircle size={16} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleStatusChange(ticket.id, 'cancelado'); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}
                title="Rechazar/Cancelar"
              >
                <X size={16} />
              </button>
            </>
          )}

          {/* Botón PDF solo para admin y técnico, y solo si el ticket está cerrado */}
          {(() => {
            const role = (user?.role || '').toLowerCase();
            const isAuthorized = ['admin', 'presidente', 'eventos'].includes(role);
            const isClosed = ticket.status === 'realizado';
            
            return isAuthorized && isClosed && (
              <button 
                onClick={(e) => { e.stopPropagation(); handleGeneratePdf(ticket.id.toString()); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ea580c' }}
                title="Generar PDF para Firma"
              >
                <FileText size={16} />
              </button>
            );
          })()}

          {/* Botón Eliminar solo para admin */}
          {user?.role === 'admin' && (
            <button 
              onClick={(e) => { e.stopPropagation(); handleDelete(ticket.id.toString()); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}
              title="Eliminar"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      )
    }
  },
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
        <div className={styles.header}>
          <button 
            className={styles.backButton}
            onClick={() => navigate('/dashboard')}
            title="Volver al Panel Principal"
          >
            <ArrowLeft size={20} />
          </button>
          <div className={styles.titleWrapper}>
            <h1>Registro del Evento del Área Común</h1>
            <p>Seguimiento a las reservaciones y solicitudes de áreas comunes.</p>
          </div>
        </div>

        <div className={styles.filterCard}>
          
          {/* Filtros y Búsqueda */}
          <div className={styles.filterSection}>
             <div className={styles.filterGrid}>
               <div className="form-group" style={{ marginBottom: 0 }}>
                 <label className="form-label">Estado</label>
                 <select 
                    className="form-select"
                    value={filters.status} 
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  >
                    <option value="">TODOS</option>
                    <option value="solicitado">SOLICITADO</option>
                    <option value="confirmado">CONFIRMADO</option>
                    <option value="realizado">REALIZADO</option>
                    <option value="cancelado">CANCELADO</option>
                  </select>
               </div>

               <div className="form-group" style={{ marginBottom: 0 }}>
                 <label className="form-label">Cuota</label>
                 <select 
                    className="form-select"
                    value={filters.priority} 
                    onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                  >
                    <option value="">TODAS</option>
                    <option value="sin_clasificar">SIN CUOTA</option>
                    <option value="normal">CUOTA DE $1,500</option>
                    <option value="importante">CUOTA ESPECIAL</option>
                  </select>
               </div>

               <div className={styles.actionButtonsRow}>
                  <div className={styles.columnSelectorWrapper}>
                    {(user?.role === 'admin' || user?.role === 'presidente' || user?.role === 'vicepresidente') && (
                      <button 
                        className={`${styles.btnExcel} btn btn-outline`}
                        onClick={handleExport}
                        style={{ color: '#107c41', borderColor: '#107c41' }}
                        title="Exportar a Excel"
                      >
                        <FileSpreadsheet size={18} />
                        Excel
                      </button>
                    )}
                    <button 
                      className="btn btn-outline"
                      onClick={() => setShowColumnSelector(!showColumnSelector)}
                      title="Columnas"
                    >
                      <Columns size={18} />
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

             <div className={styles.searchWrapper}>
                 <Search size={20} className={styles.searchIcon} />
                 <input 
                    className="form-input"
                    type="text" 
                    placeholder="Buscar reservaciones..." 
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                 />
             </div>
          </div>

          {/* Acciones */}
          <div className={styles.mainActions}>
            <button className={styles.btnAgregar} onClick={() => handleOpenModal()}>
              <Plus size={16} />
              Agregar
            </button>
          </div>

        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.tableWrapper}>
          <Table 
            columns={columns} 
            data={tickets} 
            loading={loading}
            selectable={false}
            selectedIds={selectedTicketIds}
            onSelectionChange={setSelectedTicketIds}
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
                <span style={{ cursor: 'pointer' }} onClick={handleCloseModals}>Reservaciones</span>
                <span style={{ margin: '0 8px' }}>/</span>
                <span style={{ color: '#111827', fontWeight: 600 }}>{isEditing ? 'Editar' : 'Crear'} Reservación</span>
              </div>
              <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#111827', margin: 0 }}>
                {isEditing ? 'Editar Reservación' : 'Crear Reservación'}
              </h2>
            </div>
          </div>
          <TicketForm
            onSubmit={handleSubmit}
            loading={loading}
            users={users}
            equipment={equipment}
            onCancel={handleCloseModals}
            isEditMode={isEditing}
            initialData={currentTicket ? {
              id: currentTicket.id,
              title: currentTicket.title,
              description: currentTicket.description,
              priority: currentTicket.priority,
              status: currentTicket.status,
              serviceType: currentTicket.serviceType,
              equipmentId: currentTicket.equipmentId,
              assignedToId: currentTicket.assignedToId,
              reportedById: currentTicket.reportedById,
              reportedBy: currentTicket.reportedBy,
              diagnosis: currentTicket.diagnosis,
              solution: currentTicket.solution,
              notes: currentTicket.notes,
              timeSpent: currentTicket.timeSpent,
              parts: typeof currentTicket.parts === 'string' ? JSON.parse(currentTicket.parts) : (currentTicket.parts || []),
              eventDate: currentTicket.eventDate,
              eventTime: currentTicket.eventTime,
              eventDuration: currentTicket.eventDuration
            } : (preselectedDate ? { eventDate: preselectedDate } : {})}
          />
        </div>
      )}

      {isDetailsModalOpen && currentTicket && (
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
                <span style={{ cursor: 'pointer' }} onClick={handleCloseModals}>Reservaciones</span>
                <span style={{ margin: '0 8px' }}>/</span>
                <span style={{ color: '#111827', fontWeight: 600 }}>{currentTicket.ticketNumber}</span>
              </div>
              <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#111827', margin: 0 }}>
                Detalles del Evento / Reservación
              </h2>
            </div>
          </div>
          <div className={styles.detailsContent}>
            <div className={styles.detailsHeader}>
              <div className={styles.ticketInfo}>
                <span className={styles.ticketNumber}>{currentTicket.ticketNumber}</span>
                <h3 className={styles.detailsTitle}>{currentTicket.title}</h3>
              </div>
              <div className={styles.badgeGroup}>
                <TicketStatusBadge status={currentTicket.status} />
                <PriorityBadge priority={currentTicket.priority} />
              </div>
            </div>
            
            <div className={styles.detailsGrid}>
              <div className={styles.detailSection}>
                <h4>Información General del Evento</h4>
                <div className={styles.detailItem}>
                  <label>Descripción / Normas</label>
                  <p>{currentTicket.description}</p>
                </div>

                <div className={styles.detailItem}>
                  <label>Fecha del Evento</label>
                  <span>{currentTicket.eventDate ? new Date(currentTicket.eventDate + 'T00:00:00').toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'No especificada'}</span>
                </div>
                <div className={styles.detailItem}>
                  <label>Hora de Inicio</label>
                  <span>{currentTicket.eventTime || 'No especificada'}</span>
                </div>
                <div className={styles.detailItem}>
                  <label>Duración Estimada</label>
                  <span>{currentTicket.eventDuration ? `${currentTicket.eventDuration} horas` : '5 horas'}</span>
                </div>
              </div>

              <div className={styles.detailSection}>
                <h4>Personas Involucradas</h4>
                <div className={styles.detailItem}>
                  <label>Residente</label>
                  <span>{currentTicket.reportedBy?.fullName || 'N/A'}</span>
                </div>
                <div className={styles.detailItem}>
                  <label>Calle / Lote</label>
                  <span>{currentTicket.reportedBy?.department || 'N/A'}</span>
                </div>
                <div className={styles.detailItem}>
                  <label>Responsable de Mesa Directiva</label>
                  <span>{users.find(u => u.id === currentTicket.assignedToId)?.fullName || 'Sin asignar'}</span>
                </div>
              </div>

              <div className={styles.detailSection}>
                <h4>Inspección y Estatus</h4>
                <div className={styles.detailItem}>
                  <label>Notas de Entrega de Área</label>
                  <p>{currentTicket.diagnosis || 'Pendiente'}</p>
                </div>
                <div className={styles.detailItem}>
                  <label>Notas de Recepción de Área</label>
                  <p>{currentTicket.solution || 'Pendiente'}</p>
                </div>
              </div>
            </div>

            <div className={styles.modalFooter} style={{ justifyContent: 'space-between', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  type="button" 
                  className="btn" 
                  style={{ background: '#3b82f6', color: 'white' }}
                  onClick={() => handleStatusChange(currentTicket.id, 'solicitado')}
                  disabled={currentTicket.status === 'solicitado'}
                >
                  Solicitado
                </button>
                <button 
                  type="button" 
                  className="btn" 
                  style={{ background: '#f59e0b', color: 'white' }}
                  onClick={() => handleStatusChange(currentTicket.id, 'confirmado')}
                  disabled={currentTicket.status === 'confirmado'}
                >
                  Confirmado
                </button>
                <button 
                  type="button" 
                  className="btn" 
                  style={{ background: '#3b82f6', color: 'white' }}
                  onClick={() => handleStatusChange(currentTicket.id, 'realizado')}
                  disabled={currentTicket.status === 'realizado'}
                >
                  Realizado
                </button>
                <button 
                  type="button" 
                  className="btn" 
                  style={{ background: '#10b981', color: 'white' }}
                  onClick={() => handleStatusChange(currentTicket.id, 'cancelado')}
                  disabled={currentTicket.status === 'cancelado'}
                >
                  Cancelado
                </button>
              </div>
              <button type="button" className="btn btn-secondary" onClick={handleCloseModals}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </Layout>
  );
};

export default TicketsPage;