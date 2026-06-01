import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Ticket } from '@/types';
import { ticketService } from '@/services/ticketService';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Info, 
  X, 
  Plus,
  Tag,
  BookOpen,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth.tsx';
import styles from './Calendar.module.css';

// Helper to calculate end time
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

// Formatter for Spanish months
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: Ticket[];
}

type ViewMode = 'month' | 'week' | 'day';

const CalendarPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<Ticket | null>(null);

  const isManager = ['admin', 'presidente', 'vicepresidente', 'eventos'].includes(user?.role || '');

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const response = await ticketService.getTickets({ limit: 1000 });
      setTickets(response.data || []);
    } catch (error) {
      console.error('Error fetching calendar tickets:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Navigation handlers
  const handlePrev = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(year, month - 1, 1));
    } else if (viewMode === 'week') {
      const prevWeek = new Date(currentDate);
      prevWeek.setDate(currentDate.getDate() - 7);
      setCurrentDate(prevWeek);
    } else {
      const prevDay = new Date(currentDate);
      prevDay.setDate(currentDate.getDate() - 1);
      setCurrentDate(prevDay);
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(year, month + 1, 1));
    } else if (viewMode === 'week') {
      const nextWeek = new Date(currentDate);
      nextWeek.setDate(currentDate.getDate() + 7);
      setCurrentDate(nextWeek);
    } else {
      const nextDay = new Date(currentDate);
      nextDay.setDate(currentDate.getDate() + 1);
      setCurrentDate(nextDay);
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await ticketService.updateTicket(id, { status } as any);
      if (selectedEvent && selectedEvent.id === id) {
        setSelectedEvent({ ...selectedEvent, status: status as any });
      }
      fetchEvents();
    } catch (err) {
      console.error('Error al actualizar el estado:', err);
    }
  };

  // Generate calendar days for Month View
  const generateMonthDays = (): CalendarDay[] => {
    const today = new Date();
    const firstDayOfMonth = new Date(year, month, 1);

    // Day of week for the 1st (0=Sun, 1=Mon, ..., 6=Sat)
    const firstDayWeekday = firstDayOfMonth.getDay();

    // We want Monday (1) to be the first column.
    // If firstDayWeekday is 0 (Sunday), we need 6 leading days.
    // If it's 1 (Monday), 0 leading days.
    // If it's 2 (Tuesday), 1 leading day, etc.
    const leadingDaysCount = firstDayWeekday === 0 ? 6 : firstDayWeekday - 1;

    const calendarDays: CalendarDay[] = [];

    // Start from the first Monday shown in the grid
    const startDate = new Date(firstDayOfMonth);
    startDate.setDate(firstDayOfMonth.getDate() - leadingDaysCount);

    // We always show 42 days (6 weeks) to keep the grid height stable
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);

      calendarDays.push({
        date,
        isCurrentMonth: date.getMonth() === month,
        isToday: isSameDate(date, today),
        events: getEventsForDate(date)
      });
    }

    return calendarDays;
  };

  // Generate days for Week View
  const generateWeekDays = (): CalendarDay[] => {
    const today = new Date();
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);

    const weekDays: CalendarDay[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      weekDays.push({
        date,
        isCurrentMonth: date.getMonth() === month,
        isToday: isSameDate(date, today),
        events: getEventsForDate(date)
      });
    }
    return weekDays;
  };

  // Generate for Day View
  const generateDayView = (): CalendarDay[] => {
    const today = new Date();
    return [{
      date: currentDate,
      isCurrentMonth: true,
      isToday: isSameDate(currentDate, today),
      events: getEventsForDate(currentDate)
    }];
  };

  const getDisplayDays = () => {
    if (viewMode === 'month') return generateMonthDays();
    if (viewMode === 'week') return generateWeekDays();
    return generateDayView();
  };

  const getHeaderText = () => {
    if (viewMode === 'month') {
      return `${MONTHS[month]} ${year}`;
    }
    if (viewMode === 'week') {
      const days = generateWeekDays();
      const first = days[0].date;
      const last = days[6].date;
      if (first.getMonth() === last.getMonth()) {
        return `${first.getDate()} - ${last.getDate()} de ${MONTHS[first.getMonth()]} ${first.getFullYear()}`;
      }
      return `${first.getDate()} ${MONTHS[first.getMonth()].substring(0,3)} - ${last.getDate()} ${MONTHS[last.getMonth()].substring(0,3)} ${last.getFullYear()}`;
    }
    return `${currentDate.getDate()} de ${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  };

  // Check if two dates are same year, month, and day
  const isSameDate = (d1: Date, d2: Date): boolean => {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  // Find events matching a specific date (formatted YYYY-MM-DD)
  const getEventsForDate = (date: Date): Ticket[] => {
    const formattedDateStr = formatDateKey(date);
    return tickets.filter(ticket => {
      if (!ticket.eventDate) return false;
      
      // Normalizar la fecha del ticket para comparación (algunas bases de datos guardan ISO string completa)
      let ticketDateStr = ticket.eventDate;
      if (ticketDateStr.includes('T')) {
        ticketDateStr = ticketDateStr.split('T')[0];
      }
      return ticketDateStr === formattedDateStr;
    });
  };

  // Format date to local key YYYY-MM-DD
  const formatDateKey = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Get status class for event pills
  const getEventStatusClass = (status: string) => {
    switch (status) {
      case 'solicitado':
        return styles.eventSolicitado;
      case 'confirmado':
        return styles.eventConfirmado;
      case 'realizado':
        return styles.eventRealizado;
      case 'cancelado':
        return styles.eventCancelado;
      default:
        return '';
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'solicitado':
        return { backgroundColor: '#fffbeb', color: '#b45309', borderColor: '#f59e0b' };
      case 'confirmado':
        return { backgroundColor: '#eff6ff', color: '#1d4ed8', borderColor: '#3b82f6' };
      case 'realizado':
        return { backgroundColor: '#ecfdf5', color: '#047857', borderColor: '#10b981' };
      case 'cancelado':
        return { backgroundColor: '#fff5f5', color: '#c53030', borderColor: '#f56565' };
      default:
        return { backgroundColor: '#f3f4f6', color: '#374151', borderColor: '#d1d5db' };
    }
  };

  const getPriorityBadgeStyle = (priority: string) => {
    switch (priority) {
      case 'sin_clasificar':
        return { backgroundColor: '#f3f4f6', color: '#4b5563', borderColor: '#d1d5db' };
      case 'normal':
        return { backgroundColor: '#ecfdf5', color: '#047857', borderColor: '#10b981' };
      case 'importante':
        return { backgroundColor: '#eff6ff', color: '#1d4ed8', borderColor: '#3b82f6' };
      default:
        return { backgroundColor: '#f3f4f6', color: '#374151', borderColor: '#d1d5db' };
    }
  };

  const displayDays = getDisplayDays();

  return (
    <Layout>
      <div className={styles.container}>
        {/* Header section */}
        <div className={styles.header}>
          <div className={styles.titleContainer}>
            <h1>Calendario de Reservaciones</h1>
            <p className={styles.subtitle}>Consulta visual y control de áreas comunes reservadas</p>
          </div>
          
          <div className={styles.controls}>
            <div className={styles.viewSwitcher}>
              <button
                className={`${styles.viewButton} ${viewMode === 'day' ? styles.activeView : ''}`}
                onClick={() => setViewMode('day')}
              >
                Día
              </button>
              <button
                className={`${styles.viewButton} ${viewMode === 'week' ? styles.activeView : ''}`}
                onClick={() => setViewMode('week')}
              >
                Semana
              </button>
              <button
                className={`${styles.viewButton} ${viewMode === 'month' ? styles.activeView : ''}`}
                onClick={() => setViewMode('month')}
              >
                Mes
              </button>
            </div>

            <button className={styles.todayButton} onClick={handleToday}>
              Hoy
            </button>
            <div className={styles.navGroup}>
              <button className={styles.navButton} onClick={handlePrev} title="Anterior">
                <ChevronLeft size={20} />
              </button>
              <span className={styles.currentMonth}>
                {getHeaderText()}
              </span>
              <button className={styles.navButton} onClick={handleNext} title="Siguiente">
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Floating Action Button for Mobile */}
        <button
          className={styles.fabButton}
          onClick={() => navigate('/tickets', { state: { openCreateModal: true } })}
          title="Nueva Reservación"
        >
          <Plus size={24} />
        </button>

        {/* Main Calendar Card */}
        <div className={`${styles.calendarCard} ${viewMode !== 'month' ? styles.listCard : styles.monthView}`}>
          {/* Weekday Names - Only for Month view to avoid confusion in list view */}
          {viewMode === 'month' && (
            <div className={styles.weekdaysGrid}>
              {WEEKDAYS.map(day => (
                <div key={day} className={styles.weekday}>
                  {day}
                </div>
              ))}
            </div>
          )}

          {/* Days Grid / List */}
          <div className={`${styles.daysGrid} ${styles[viewMode + 'Grid']}`}>
            {loading ? (
              <div style={{ gridColumn: 'span 7', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
                <div style={{ color: '#6b7280', fontSize: '1rem' }}>Cargando reservaciones...</div>
              </div>
            ) : (
              displayDays.map((day, idx) => (
                <div 
                  key={idx} 
                  className={`${styles.dayCell} ${
                    viewMode === 'month' && !day.isCurrentMonth ? styles.otherMonth : ''
                  } ${viewMode !== 'month' ? styles.listRow : ''}`}
                  onClick={() => {
                    if (viewMode === 'month') {
                      const dateStr = formatDateKey(day.date);
                      navigate('/tickets', { state: { openCreateModal: true, selectedDate: dateStr } });
                    }
                  }}
                >
                  <div className={styles.dayHeaderInfo}>
                    <div className={styles.dayNumberGroup}>
                      <span className={`${styles.dayNumber} ${day.isToday ? styles.isToday : ''}`}>
                        {day.date.getDate()}
                      </span>
                      {viewMode !== 'month' && (
                        <div className={styles.dayTextGroup}>
                          <span className={styles.dayNameLabel}>
                            {WEEKDAYS[day.date.getDay() === 0 ? 6 : day.date.getDay() - 1]}
                          </span>
                          <span className={styles.fullDateLabel}>
                            {MONTHS[day.date.getMonth()]} {day.date.getFullYear()}
                          </span>
                        </div>
                      )}
                    </div>

                    {day.events.length > 0 && viewMode === 'month' && (
                      <span className={styles.eventCount}>
                        {day.events.length}
                      </span>
                    )}

                    {viewMode !== 'month' && (
                      <button
                        className={styles.addEventIcon}
                        onClick={(e) => {
                          e.stopPropagation();
                          const dateStr = formatDateKey(day.date);
                          navigate('/tickets', { state: { openCreateModal: true, selectedDate: dateStr } });
                        }}
                      >
                        <Plus size={18} />
                      </button>
                    )}
                  </div>
                  
                  <div className={`${styles.eventsContainer} ${viewMode !== 'month' ? styles.listEvents : ''}`}>
                    {day.events.length === 0 && viewMode !== 'month' ? (
                      <div className={styles.noEvents}>Sin reservaciones</div>
                    ) : (
                      day.events.slice(0, viewMode === 'month' ? 3 : 99).map((event) => (
                        <div
                          key={event.id}
                          className={`${styles.eventPill} ${getEventStatusClass(event.status)} ${viewMode !== 'month' ? styles.listEventCard : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEvent(event);
                          }}
                        >
                          <div className={styles.eventMainInfo}>
                            <span className={styles.eventTime}>{event.eventTime || '00:00'}</span>
                            <span className={styles.eventTitle}>{event.title}</span>
                          </div>

                          {viewMode !== 'month' && (
                            <div className={styles.eventMetaInfo}>
                              <div className={styles.metaItem}>
                                <User size={14} />
                                <span>{event.reportedBy?.fullName || 'Residente'}</span>
                              </div>
                              <div className={styles.metaItem}>
                                <Tag size={14} />
                                <span>{event.reportedBy?.department || 'N/A'}</span>
                              </div>
                              <div className={styles.metaItem}>
                                <div className={styles.statusDot} style={{ backgroundColor: getStatusBadgeStyle(event.status).borderColor }}></div>
                                <span style={{ textTransform: 'capitalize' }}>{event.status}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}

                    {day.events.length > 3 && viewMode === 'month' && (
                      <div 
                        className={styles.plusBadge}
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewMode('day');
                          setCurrentDate(day.date);
                        }}
                      >
                        + {day.events.length - 3} más
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Event Details Modal */}
        {selectedEvent && (
          <div className={styles.modalOverlay} onClick={() => setSelectedEvent(null)}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2>Detalle de la Reservación</h2>
                <button className={styles.closeModalBtn} onClick={() => setSelectedEvent(null)}>
                  <X size={18} />
                </button>
              </div>
              
              <div className={styles.modalBody}>
                <div className={styles.detailRow}>
                  <div className={`${styles.detailItem} ${styles.fullWidth}`}>
                    <span className={styles.detailLabel}>Folio de Reserva</span>
                    <span className={styles.detailValue} style={{ fontWeight: 700, color: 'var(--color-primary-dark)' }}>
                      {selectedEvent.ticketNumber}
                    </span>
                  </div>
                </div>

                <div className={styles.detailRow}>
                  <div className={`${styles.detailItem} ${styles.fullWidth}`}>
                    <span className={styles.detailLabel}>Concepto / Evento</span>
                    <span className={styles.detailValue} style={{ fontSize: '1.05rem', fontWeight: 600 }}>
                      {selectedEvent.title}
                    </span>
                  </div>
                </div>

                {selectedEvent.description && (
                  <div className={styles.detailRow}>
                    <div className={`${styles.detailItem} ${styles.fullWidth}`}>
                      <span className={styles.detailLabel}>Descripción / Notas del Evento</span>
                      <div className={styles.descriptionBox}>
                        {selectedEvent.description}
                      </div>
                    </div>
                  </div>
                )}

                <div className={styles.detailRow}>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Fecha del Evento</span>
                    <span className={styles.detailValue} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <CalendarIcon size={16} style={{ color: 'var(--color-gray-500)' }} />
                      {selectedEvent.eventDate ? (
                        new Date(selectedEvent.eventDate + 'T00:00:00').toLocaleDateString('es-MX', {
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric'
                        })
                      ) : 'No especificada'}
                    </span>
                  </div>

                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Horario</span>
                    <span className={styles.detailValue} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Clock size={16} style={{ color: 'var(--color-gray-500)' }} />
                      {selectedEvent.eventTime ? (
                        `${selectedEvent.eventTime} a ${calculateEndTime(selectedEvent.eventTime, selectedEvent.eventDuration || 5)}`
                      ) : 'No especificada'}
                    </span>
                  </div>
                </div>

                <div className={styles.detailRow}>
                  <div className={`${styles.detailItem} ${styles.fullWidth}`}>
                    <span className={styles.detailLabel}>Duración</span>
                    <span className={styles.detailValue}>
                      {selectedEvent.eventDuration || 5} horas
                    </span>
                  </div>
                </div>

                <div className={styles.detailRow}>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Residente / Solicitante</span>
                    <span className={styles.detailValue} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <User size={16} style={{ color: 'var(--color-gray-500)' }} />
                      {selectedEvent.reportedBy?.fullName || 'Residente Stanza'}
                    </span>
                  </div>

                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Calle / Lote</span>
                    <span className={styles.detailValue}>
                      {selectedEvent.reportedBy?.department || 'N/A'}
                    </span>
                  </div>
                </div>

                <div className={styles.detailRow}>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Estatus de Confirmación</span>
                    <span className={styles.miniBadge} style={getStatusBadgeStyle(selectedEvent.status)}>
                      {selectedEvent.status === 'solicitado' ? 'Solicitado' :
                       selectedEvent.status === 'confirmado' ? 'Confirmado' :
                       selectedEvent.status === 'realizado' ? 'Realizado' :
                       selectedEvent.status === 'cancelado' ? 'Cancelado' : selectedEvent.status}
                    </span>
                  </div>

                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Cuota</span>
                    <span className={styles.miniBadge} style={getPriorityBadgeStyle(selectedEvent.priority)}>
                      {selectedEvent.priority === 'sin_clasificar' ? 'Sin Cuota' :
                       selectedEvent.priority === 'normal' ? 'Cuota de $1,500' :
                       selectedEvent.priority === 'importante' ? 'Cuota Especial' : selectedEvent.priority}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className={styles.modalFooter}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {isManager && selectedEvent.status === 'solicitado' && (
                    <>
                      <button
                        className="btn"
                        style={{ backgroundColor: '#10b981', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        onClick={() => handleStatusChange(selectedEvent.id, 'confirmado')}
                      >
                        <CheckCircle size={16} />
                        Confirmar
                      </button>
                      <button
                        className="btn"
                        style={{ backgroundColor: '#ef4444', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        onClick={() => handleStatusChange(selectedEvent.id, 'cancelado')}
                      >
                        <X size={16} />
                        Rechazar
                      </button>
                    </>
                  )}
                  <button
                    className="btn btn-outline"
                    onClick={() => setSelectedEvent(null)}
                  >
                    Cerrar
                  </button>
                </div>
                <button 
                  className="btn btn-primary"
                  onClick={() => {
                    setSelectedEvent(null);
                    // Navigate to Tickets page and we could let them manage it
                    navigate('/tickets');
                  }}
                >
                  <BookOpen size={16} />
                  Ver en Listado
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default CalendarPage;
