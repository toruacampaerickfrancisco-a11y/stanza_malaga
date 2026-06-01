import React, { useState, useEffect } from 'react';
import { User, Equipment } from '@/types';
import { useAuth } from '@/hooks/useAuth.tsx';
import { apiClient } from '@/services/apiClient';
import SearchableSelect from './SearchableSelect';

export interface TicketFormProps {
  onSubmit: (data: any) => void;
  loading?: boolean;
  initialData?: any;
  users?: User[];
  equipment?: Equipment[];
  onCancel?: () => void;
  isEditMode?: boolean;
}

const DetailItem = ({ label, value, fullWidth = false }: { label: string, value: React.ReactNode, fullWidth?: boolean }) => (
  <div className="form-group" style={fullWidth ? { gridColumn: '1 / -1' } : {}}>
    <label className="form-label" style={{ color: '#6b7280', fontSize: '0.875rem' }}>{label}</label>
    <div style={{ padding: '0.5rem 0', color: '#111827', fontWeight: 500 }}>{value}</div>
  </div>
);

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

const TicketForm: React.FC<TicketFormProps> = ({ 
  onSubmit, 
  loading = false, 
  initialData = {}, 
  users = [], 
  equipment = [],
  onCancel,
  isEditMode = false
}) => {
  const { user } = useAuth();

  // Roles que pueden gestionar reservaciones (confirmar, asignar, etc.)
  const isManager = ['admin', 'presidente', 'vicepresidente', 'tesorero', 'eventos'].includes(user?.role || '');
  // Rol que solo puede solicitar
  const isResident = user?.role === 'residente' || user?.role === 'usuario';

  const isTechnician = isManager; // Para mantener compatibilidad con el resto del código
  const isClosed = initialData?.status === 'realizado';

  // Filter equipment for residents (show all common areas)
  let filteredEquipment = isManager
    ? equipment 
    : equipment.filter(eq => {
        // Áreas comunes son visibles para todos los residentes para reserva
        const isCommonArea = 
          (eq.location && (eq.location.toLowerCase().includes('área común') || eq.location.toLowerCase().includes('area comun'))) ||
          (eq.type === 'other' && eq.brand === 'Área');
        
        return isCommonArea;
    });

  // Asegurar que Tejaban Principal siempre esté disponible en el listado de áreas comunes
  const hasTejaban = filteredEquipment.some(eq => eq.name && eq.name.toLowerCase().includes('tejaban'));
  if (!hasTejaban) {
    const tejabanVirtual: Equipment = {
      id: '36b65adf-f5ac-4916-b89f-367598e6ebaa',
      name: 'Tejaban Principal',
      type: 'other',
      brand: 'Área',
      model: 'Común',
      serialNumber: 'TP-01',
      inventoryNumber: '0.00',
      status: 'available',
      location: 'Área Común',
      assignedUserId: undefined,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    filteredEquipment = [tejabanVirtual, ...filteredEquipment];
  }

  const availableEquipment = filteredEquipment;

  // Debug logging for assignment issues (console only)
  useEffect(() => {
    if (!isTechnician && equipment.length > 0) {
      console.log('TicketForm Equipment Check:', {
        userId: user?.id,
        totalEquipment: equipment.length,
        available: availableEquipment.length,
        firstFew: equipment.slice(0, 3).map(e => ({ 
          id: e.id, 
          assignedTo: e.assignedUserId,
          match: e.assignedUserId === user?.id
        }))
      });
    }
  }, [isTechnician, equipment, user, availableEquipment.length]);

  const [title, setTitle] = useState(initialData.title || '');
  const [description, setDescription] = useState(initialData.description || '');
  const [priority, setPriority] = useState(initialData.priority || 'sin_clasificar');
  const [status, setStatus] = useState(initialData.status || 'solicitado');
  const [serviceType, setServiceType] = useState(initialData.serviceType || 'social');
  const [equipmentId, setEquipmentId] = useState(initialData.equipmentId || '');
  const [assignedToId, setAssignedToId] = useState(initialData.assignedToId || '');
  const [reportedById, setReportedById] = useState(initialData.reportedById || user?.id || '');
  const [eventDate, setEventDate] = useState(initialData.eventDate || '');
  const [eventTime, setEventTime] = useState(initialData.eventTime || '');
  const [eventDuration, setEventDuration] = useState(initialData.eventDuration !== undefined ? initialData.eventDuration : 5);
  const [diagnosis, setDiagnosis] = useState(initialData.diagnosis || '');
  const [solution, setSolution] = useState(initialData.solution || '');
  const [notes, setNotes] = useState(initialData.notes || '');
  const [timeSpent, setTimeSpent] = useState(initialData.timeSpent || '');
  const [parts, setParts] = useState<Array<{ nombre: string; cantidad: number }>>(() => {
    if (!initialData.parts) return [];
    if (Array.isArray(initialData.parts)) return initialData.parts;
    if (typeof initialData.parts === 'string') {
      try {
        return JSON.parse(initialData.parts);
      } catch (e) {
        console.error('Error parsing initial parts:', e);
        return [];
      }
    }
    return [];
  });
  const [commonServices, setCommonServices] = useState<Array<{ nombre: string; tipo: string }>>([]);
  const [insumos, setInsumos] = useState<Array<{ nombre: string; cantidad: number; unidad: string }>>([]);
  const [activePartIndex, setActivePartIndex] = useState<number | null>(null);

  useEffect(() => {
    fetch('/catalogo_servicios.json')
      .then(res => res.json())
      .then(data => setCommonServices(data))
      .catch(err => console.error('Error loading services catalog:', err));

    // Cargar insumos para el autocompletado
    apiClient.get('/insumos')
      .then(response => {
        if (response.data.success && Array.isArray(response.data.data)) {
          setInsumos(response.data.data);
        } else if (Array.isArray(response.data)) {
           setInsumos(response.data);
        }
      })
      .catch(err => console.error('Error loading insumos:', err));
  }, []);

  useEffect(() => {
    // Solo actualizar si initialData tiene contenido real (modo edición)
    // Evita borrar el formulario cuando initialData es {} o contiene campos parciales (modo creación) y el componente se re-renderiza
    if (initialData && Object.keys(initialData).length > 0 && (initialData.id || isEditMode)) {
      setTitle(initialData.title || '');
      setDescription(initialData.description || '');
      setPriority(initialData.priority || 'importante');
      setStatus(initialData.status || 'solicitado');
      setServiceType(initialData.serviceType || 'social');
      setEquipmentId(initialData.equipmentId || '');
      setAssignedToId(initialData.assignedToId || '');
      setReportedById(initialData.reportedById || user?.id || '');
      setDiagnosis(initialData.diagnosis || '');
      setSolution(initialData.solution || '');
      setNotes(initialData.notes || '');
      setTimeSpent(initialData.timeSpent || '');
      setEventDate(initialData.eventDate || '');
      setEventTime(initialData.eventTime || '');
      setEventDuration(initialData.eventDuration !== undefined ? initialData.eventDuration : 5);
      
      let parsedParts = [];
      if (typeof initialData.parts === 'string') {
        try {
          parsedParts = JSON.parse(initialData.parts);
        } catch (e) {
          console.error('Error parsing parts:', e);
        }
      } else if (Array.isArray(initialData.parts)) {
        parsedParts = initialData.parts;
      }
      setParts(parsedParts);
    } else if (!isTechnician && availableEquipment.length === 1 && !equipmentId) {
      // Auto-select equipment if user has only one AND none is selected yet
      setEquipmentId(availableEquipment[0].id);
    }
  }, [initialData, isTechnician, availableEquipment]);

  // Auto-select equipment when reportedBy changes (only for technicians creating new tickets)
  useEffect(() => {
    if (isTechnician && !initialData.id && reportedById) {
      const assignedEquipment = equipment.find(e => e.assignedUserId === reportedById);
      if (assignedEquipment) {
        setEquipmentId(assignedEquipment.id);
      }
    }
  }, [reportedById, equipment, isTechnician, initialData.id]);

  function handleAddPart() {
    setParts([...parts, { nombre: '', cantidad: 1 }]);
  }
  function handleRemovePart(idx: number) {
    setParts(parts.filter((_, i) => i !== idx));
  }
  function handlePartChange(idx: number, field: 'nombre' | 'cantidad', value: string | number) {
    setParts(parts.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  }

  function handleCommonServiceChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const selectedName = e.target.value;
    // Permitir deseleccionar si es necesario
    if (!selectedName) {
      if (!isTechnician) {
        setTitle('');
        setServiceType('social');
      }
      return;
    }
    
    const service = commonServices.find(s => s.nombre === selectedName);
    if (service) {
      setTitle(service.nombre);
      setServiceType(service.tipo.toLowerCase());
    }
  }

  const selectedEquipment = availableEquipment.find(e => e.id === equipmentId);

  if (isClosed) {
    return (
      <div className="ticket-viewer">
        <div className="form-section">
          <h3 className="section-title">Resumen de la Reservación</h3>
          <div className="ticket-header" style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#f3f4f6', borderRadius: '0.5rem' }}>
             <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#111827' }}>{title}</h2>
             <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <span className={`status-badge status-${status}`}>
                  {status === 'solicitado' ? 'SOLICITADO' :
                   status === 'confirmado' ? 'CONFIRMADO' :
                   status === 'realizado' ? 'REALIZADO' :
                   status === 'cancelado' ? 'CANCELADO' : status.toUpperCase()}
                </span>
                <span className={`priority-badge priority-${priority}`}>
                  {priority === 'sin_clasificar' ? 'SIN CUOTA' :
                   priority === 'normal' ? 'CUOTA DE $1,500' :
                   priority === 'importante' ? 'CUOTA ESPECIAL' : priority.toUpperCase()}
                </span>
             </div>
          </div>
        </div>

        <div className="form-section">
            <h3 className="section-title">Datos del Solicitante</h3>
            <div className="details-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <DetailItem label="Nombre" value={initialData.reportedBy?.fullName || 'N/A'} />
                <DetailItem label="Calle / Lote" value={initialData.reportedBy?.department || 'N/A'} />
            </div>
        </div>

        <div className="form-section">
            <h3 className="section-title">Área Común Reservada</h3>
             {selectedEquipment ? (
                <div className="details-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <DetailItem 
                    label="Área Común" 
                    value={
                      (selectedEquipment.inventoryNumber && selectedEquipment.inventoryNumber !== '0.00' && selectedEquipment.inventoryNumber !== '0' && selectedEquipment.inventoryNumber !== 'S/N' && selectedEquipment.inventoryNumber !== 'TP-01')
                        ? `${selectedEquipment.name} (${selectedEquipment.inventoryNumber})` 
                        : ((selectedEquipment.serialNumber && selectedEquipment.serialNumber !== '0.00' && selectedEquipment.serialNumber !== '0' && selectedEquipment.serialNumber !== 'S/N' && selectedEquipment.serialNumber !== 'TP-01')
                          ? `${selectedEquipment.name} (${selectedEquipment.serialNumber})`
                          : selectedEquipment.name)
                    } 
                  />
                  <DetailItem label="Encargado de Área" value={selectedEquipment.assignedUser?.fullName || users.find(u => u.id === selectedEquipment.assignedUserId)?.fullName || 'Eventos'} />
                  <DetailItem label="Ubicación" value={selectedEquipment.location} />
                </div>
             ) : (
                <p style={{ color: '#6b7280', fontStyle: 'italic' }}>No hay información del área común.</p>
             )}
        </div>

        <div className="form-section">
            <h3 className="section-title">Fecha y Horario del Evento</h3>
            <div className="details-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <DetailItem label="Fecha del Evento" value={eventDate ? new Date(eventDate + 'T00:00:00').toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'No especificada'} />
                <DetailItem label="Hora de Inicio" value={eventTime || 'No especificada'} />
                <DetailItem label="Hora de Término" value={eventTime ? calculateEndTime(eventTime, eventDuration || 5) : 'No especificada'} />
                <DetailItem label="Duración Estimada" value={eventDuration ? `${eventDuration} horas` : '5 horas'} />
            </div>
        </div>

        <div className="form-section">
            <h3 className="section-title">Descripción y Normas del Evento</h3>
            <div className="text-block" style={{ backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '0.5rem', color: '#374151' }}>
                {description}
            </div>
        </div>

        <div className="form-section">
            <h3 className="section-title">Inspección y Estatus</h3>
            <div className="details-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <DetailItem label="Detalles de Recepción / Inspección" value={diagnosis || 'Sin diagnóstico'} fullWidth />
                <DetailItem label="Resultados / Estatus del Evento" value={solution || 'Sin solución registrada'} fullWidth />
                <DetailItem label="Duración / Tiempo (horas)" value={timeSpent ? `${timeSpent} horas` : 'N/A'} />
                <DetailItem label="Encargado / Conciliador" value={users.find(u => u.id === assignedToId)?.fullName || 'Sin asignar'} />
            </div>
        </div>

        <div className="form-section">
            <h3 className="section-title">Insumos Requeridos</h3>
            {parts.length > 0 ? (
                <ul className="parts-list" style={{ listStyle: 'none', padding: 0 }}>
                    {parts.map((p, idx) => (
                        <li key={idx} style={{ padding: '0.5rem', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between' }}>
                            <span>{p.nombre}</span>
                            <span style={{ fontWeight: 600 }}>x{p.cantidad}</span>
                        </li>
                    ))}
                </ul>
            ) : (
                <p style={{ color: '#6b7280', fontStyle: 'italic' }}>No se solicitaron insumos.</p>
            )}
        </div>

        <div className="form-actions" style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
            <button type="button" className="btn btn-secondary" onClick={onCancel}>Cerrar</button>
        </div>
      </div>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    // For residents, force default status and unassigned
    const finalStatus = isManager ? status : 'solicitado';
    const finalAssignedToId = isManager ? assignedToId : null;
    
    const finalTitle = title || 'Nueva Reservación';

    onSubmit({ 
      title: finalTitle,
      description,
      priority: isManager ? priority : 'sin_clasificar',
      status: finalStatus,
      serviceType,
      equipmentId, 
      assignedToId: finalAssignedToId,
      reportedById,
      diagnosis,
      solution,
      notes,
      timeSpent,
      partsUsed: parts,
      eventDate,
      eventTime,
      eventDuration: Number(eventDuration)
    });
  }

  const selectedUser = users.find(u => u.id === reportedById) || (initialData.reportedBy) || user;

  return (
    <form onSubmit={handleSubmit} className="ticket-form">
      {/* Sección 1: Datos del residente */}
      <div className="form-section">
        <h3 className="section-title">Datos del Residente</h3>
        {user?.role === 'admin' ? (
          <div className="form-group">
            <label className="form-label">Residente Solicitante (Admin)</label>
            <SearchableSelect
              options={[...users]
                .sort((a, b) => a.fullName.localeCompare(b.fullName))
                .map(u => ({
                  value: u.id,
                  label: u.fullName,
                  subLabel: u.department && u.department !== 'Sin Departamento' ? u.department : undefined
                }))
              }
              value={reportedById}
              onChange={(val) => setReportedById(val)}
              placeholder="Seleccionar Residente"
            />
          </div>
        ) : (
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nombre del Residente</label>
              <input 
                className="form-input" 
                value={selectedUser?.fullName || ''} 
                disabled 
                readOnly 
              />
            </div>
            <div className="form-group">
              <label className="form-label">Calle / Lote</label>
              <input 
                className="form-input" 
                value={selectedUser?.department || ''} 
                disabled 
                readOnly 
              />
            </div>
          </div>
        )}
      </div>

      {/* Sección 2: Información del área común */}
      <div className="form-section">
        <h3 className="section-title">Información del Área Común</h3>
        <div className="form-group">
          <label className="form-label form-label-required">Seleccionar Área Común</label>
          {!isTechnician && availableEquipment.length === 0 && (
             <div style={{ fontSize: '0.85rem', color: '#b91c1c', marginBottom: '0.5rem', padding: '0.75rem', backgroundColor: '#fef2f2', borderRadius: '0.375rem', border: '1px solid #fecaca' }}>
               {equipment.length === 0 ? 'Cargando áreas comunes...' : 'No tiene áreas asignadas. Por favor contacte al administrador si cree que esto es un error.'}
             </div>
          )}
          <SearchableSelect
            required
            placeholder="Seleccionar Área Común"
            value={equipmentId}
            onChange={(val) => setEquipmentId(val)}
            options={availableEquipment.map(eq => {
              const inventory = eq.inventoryNumber || eq.serialNumber || 'S/N';
              const assignedName = eq.assignedUser?.fullName || users.find(u => u.id === eq.assignedUserId)?.fullName || 'Eventos';
              
              // No mostrar folios de relleno como "0.00", "0" o "S/N"
              const hasValidInventory = inventory && inventory !== '0.00' && inventory !== '0' && inventory !== 'S/N' && inventory !== 'TP-01';

              return {
                value: eq.id,
                label: eq.name, // Columna principal: Nombre del área
                subLabel: hasValidInventory ? `(${inventory})` : undefined, // Columna secundaria: Folio
                extraInfo: assignedName // Columna terciaria: Encargado
              };
            })}
          />
        </div>

        {selectedEquipment && (
          <div className="equipment-details-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '0.5rem' }}>
            <div className="form-group">
              <label className="form-label">Encargado de Área</label>
              <input className="form-input" value={selectedEquipment.assignedUser?.fullName || users.find(u => u.id === selectedEquipment.assignedUserId)?.fullName || 'Eventos'} disabled readOnly />
            </div>
            <div className="form-group">
              <label className="form-label">Dirección del Residente</label>
              <input className="form-input" value={selectedUser?.department || 'Sin Dirección'} disabled readOnly />
            </div>
          </div>
        )}
      </div>

      {/* Sección: Fecha y Horario del Evento */}
      <div className="form-section">
        <h3 className="section-title">Fecha y Horario del Evento</h3>
        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label form-label-required">Fecha del Evento</label>
            <input 
              type="date"
              required
              className="form-input"
              value={eventDate}
              onChange={e => setEventDate(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label className="form-label form-label-required">Hora de Inicio</label>
            <input 
              type="time"
              required
              className="form-input"
              value={eventTime}
              onChange={e => setEventTime(e.target.value)}
              disabled={loading}
            />
          </div>
          {isManager && (
            <div className="form-group">
              <label className="form-label form-label-required">Duración del Evento (Horas)</label>
              <input 
                type="number"
                required
                min={1}
                max={24}
                className="form-input"
                value={eventDuration}
                onChange={e => setEventDuration(Number(e.target.value))}
                disabled={loading}
              />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Hora de Término (Calculada)</label>
            <input 
              type="time"
              className="form-input"
              value={calculateEndTime(eventTime, Number(eventDuration) || 5)}
              disabled
              readOnly
              style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
            />
          </div>
        </div>
      </div>

      {/* Sección 3: Descripción Detallada */}
      <div className="form-section">
        <h3 className="section-title">Descripción del Evento y Normas</h3>
        <div className="form-group">
          <textarea 
            required
            minLength={3}
            rows={4}
            className="form-input"
            placeholder="Describa detalladamente el evento, horarios y normas aplicables..." 
            value={description} 
            onChange={e => setDescription(e.target.value)} 
            style={{ resize: 'vertical' }}
            disabled={loading || isClosed}
          />
        </div>
      </div>

      {/* Sección 4: Catálogo de eventos */}
      <div className="form-section">
        <h3 className="section-title">Concepto / Nombre del Evento</h3>
        <div className="form-group">
          <label className="form-label form-label-required">Seleccionar Tipo de Evento</label>
          <select 
            required
            className="form-input" 
            value={
              ['Bautizo', 'Cumpleaños', 'Fiesta Infantil', 'Reunión Familiar', 'Asamblea de Residentes'].includes(title)
                ? title
                : title === '' ? '' : 'Otro'
            }
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'Otro') {
                setTitle('');
              } else {
                setTitle(val);
              }
            }}
            disabled={loading || isClosed}
          >
            <option value="">-- Seleccionar Evento --</option>
            <option value="Bautizo">Bautizo</option>
            <option value="Cumpleaños">Cumpleaños</option>
            <option value="Fiesta Infantil">Fiesta Infantil</option>
            <option value="Reunión Familiar">Reunión Familiar</option>
            <option value="Asamblea de Residentes">Asamblea de Residentes</option>
            <option value="Otro">Otro (Especificar)</option>
          </select>
        </div>

        {/* Mostrar entrada de texto si se selecciona "Otro" o si tiene un valor personalizado */}
        {(!['Bautizo', 'Cumpleaños', 'Fiesta Infantil', 'Reunión Familiar', 'Asamblea de Residentes'].includes(title) || title === '') && (
          <div className="form-group" style={{ marginTop: '0.75rem' }}>
            <label className="form-label form-label-required">Escriba el Concepto / Nombre del Evento</label>
            <input 
              required
              minLength={3}
              className="form-input"
              placeholder="Ej. Boda, Primera Comunión, Graduación, etc." 
              value={title} 
              onChange={e => setTitle(e.target.value)}
              disabled={loading || isClosed}
            />
          </div>
        )}
      </div>

      {/* Sección 5: Prioridad, Estado, Tipo de Reservación */}
      {isTechnician && (
      <div className="form-section">
        <h3 className="section-title">Clasificación de la Reservación</h3>
        <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className="form-group">
            <label className="form-label">Cuota</label>
            <select 
              className="form-input" 
              value={priority} 
              onChange={e => setPriority(e.target.value)}
              disabled={loading || isClosed} 
            >
              <option value="sin_clasificar">Sin Cuota</option>
              <option value="normal">Cuota de $1,500</option>
              <option value="importante">Cuota Especial</option>
            </select>
          </div>
          
          <div className="form-group">
            <label className="form-label">Estatus de Confirmación</label>
            <select 
              className="form-input" 
              value={status} 
              onChange={e => setStatus(e.target.value)}
              disabled={loading || isClosed} 
            >
              <option value="solicitado">Solicitado</option>
              <option value="confirmado">Confirmado</option>
              <option value="realizado">Realizado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
        </div>
      </div>
      )}

      {/* Secciones Técnicas (Solo visibles para técnicos al editar) */}
      {isTechnician && initialData.id && (
        <>
          {/* Sección 6: Inspección Inicial del Área */}
          <div className="form-section">
            <h3 className="section-title">Detalles de Recepción / Inspección Inicial</h3>
            <div className="form-group">
              <textarea 
                rows={3}
                className="form-input"
                placeholder="Observaciones de la inspección inicial del área..." 
                value={diagnosis} 
                onChange={e => setDiagnosis(e.target.value)} 
                style={{ resize: 'vertical' }} 
                disabled={loading || isClosed}
              />
            </div>
          </div>

          {/* Sección 7: Resultados y Estatus Final */}
          <div className="form-section">
            <h3 className="section-title">Resultados del Evento</h3>
            <div className="form-group">
              <textarea 
                rows={3}
                className="form-input"
                placeholder="Comentarios sobre entrega de llaves, limpieza o resultados finales..." 
                value={solution} 
                onChange={e => setSolution(e.target.value)} 
                style={{ resize: 'vertical' }} 
              />
            </div>
            <div className="form-group">
              <label className="form-label">Duración / Tiempo (horas)</label>
              <input 
                type="number"
                min="0"
                step="0.5"
                className="form-input"
                placeholder="0.0" 
                value={timeSpent} 
                onChange={e => setTimeSpent(e.target.value)} 
              />
            </div>
            <div className="form-group">
              <label className="form-label">Encargado / Conciliador</label>
            <select
                className="form-input" 
                value={assignedToId} 
                onChange={e => setAssignedToId(e.target.value)}
                disabled={loading || isClosed || (!!initialData.assignedToId && !['admin', 'eventos'].includes(user?.role || ''))}
              >
                <option value="">-- Sin Asignar --</option>
                {users.filter(u => ['admin', 'presidente', 'vicepresidente', 'eventos'].includes(u.role)).map(u => (
                  <option key={u.id} value={u.id}>{u.fullName}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Sección 8: Insumos para el Evento */}
          <div className="form-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 className="section-title" style={{ marginBottom: 0 }}>Insumos Requeridos para el Evento</h3>
              <button 
                type="button" 
                onClick={handleAddPart} 
                style={{ 
                  fontSize: '0.85rem', 
                  color: '#2563eb', 
                  background: 'none', 
                  border: 'none', 
                  cursor: 'pointer',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                + Agregar Insumo
              </button>
            </div>
            
            {parts.length === 0 && <p style={{ fontSize: '0.875rem', color: '#9ca3af', fontStyle: 'italic' }}>No se han asignado insumos.</p>}

            {parts.map((p, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'flex-start' }}>
                <div style={{ flex: 2, position: 'relative' }}>
                  <input
                    className="form-input"
                    placeholder="Nombre del insumo"
                    value={p.nombre}
                    onChange={e => handlePartChange(idx, 'nombre', e.target.value)}
                    onFocus={() => setActivePartIndex(idx)}
                    onBlur={() => setTimeout(() => setActivePartIndex(null), 200)}
                    style={{ width: '100%' }}
                    autoComplete="off"
                  />
                  {activePartIndex === idx && (
                    <div style={{
                      position: 'absolute',
                      bottom: '100%',
                      left: 0,
                      right: 0,
                      zIndex: 50,
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.375rem',
                      marginBottom: '4px',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 -2px 4px -1px rgba(0, 0, 0, 0.06)'
                    }}>
                      {insumos
                        .filter(i => !p.nombre || i.nombre.toLowerCase().includes(p.nombre.toLowerCase()))
                        .map((item, i) => (
                          <div
                            key={i}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handlePartChange(idx, 'nombre', item.nombre);
                              setActivePartIndex(null);
                            }}
                            style={{
                              padding: '8px 12px',
                              cursor: 'pointer',
                              borderBottom: '1px solid #f3f4f6',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              fontSize: '0.9rem'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                          >
                            <span style={{ fontWeight: 500, color: '#374151' }}>{item.nombre}</span>
                            <span style={{ fontSize: '0.8rem', color: item.cantidad > 0 ? '#059669' : '#dc2626', backgroundColor: item.cantidad > 0 ? '#d1fae5' : '#fee2e2', padding: '2px 6px', borderRadius: '4px' }}>
                              {item.cantidad} {item.unidad}
                            </span>
                          </div>
                        ))}
                        {insumos.filter(i => !p.nombre || i.nombre.toLowerCase().includes(p.nombre.toLowerCase())).length === 0 && (
                          <div style={{ padding: '8px 12px', color: '#9ca3af', fontSize: '0.9rem', fontStyle: 'italic' }}>
                            No se encontraron insumos
                          </div>
                        )}
                    </div>
                  )}
                </div>
                <input
                  type="number"
                  min={1}
                  className="form-input"
                  placeholder="Cant."
                  value={p.cantidad}
                  onChange={e => handlePartChange(idx, 'cantidad', Number(e.target.value))}
                  style={{ flex: 1 }}
                />
                <button 
                  type="button" 
                  onClick={() => handleRemovePart(idx)} 
                  style={{ 
                    padding: '0 0.5rem', 
                    color: '#dc2626', 
                    background: 'none', 
                    border: 'none', 
                    cursor: 'pointer',
                    height: '38px'
                  }}
                  title="Eliminar"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {/* Sección 9: Observaciones Adicionales */}
          <div className="form-section">
            <h3 className="section-title">Observaciones Adicionales</h3>
            <div className="form-group">
              <textarea 
                rows={3}
                className="form-input"
                placeholder="Observaciones adicionales para la reservación..." 
                value={notes} 
                onChange={e => setNotes(e.target.value)} 
                style={{ resize: 'vertical' }} 
              />
            </div>
          </div>
        </>
      )}

      <div className="form-actions" style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
        {onCancel && (
          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={onCancel}
          >
            Regresar
          </button>
        )}
        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={loading} 
        >
          {loading ? 'Guardando...' : 'Guardar Reservación'}
        </button>
      </div>
    </form>
  );
};

export default TicketForm;
