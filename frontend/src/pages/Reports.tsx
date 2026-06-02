import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Filter, 
  FileText, 
  BarChart3, 
  TrendingUp, 
  Calendar, 
  Search,
  DollarSign,
  Wallet,
  RefreshCw,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Clock,
  Briefcase
} from 'lucide-react';
import Layout from '@/components/Layout';
import Modal from '@/components/Modal';
import Table from '@/components/Table';
import { Ticket, User as UserType, Equipment, Activity } from '@/types';
import { ticketService } from '@/services/ticketService';
import { userService } from '@/services/userService';
import { equipmentService } from '@/services/equipmentService';
import { activityService } from '@/services/activityService';
import { showError } from '@/utils/swal';
import { useAuth } from '@/hooks/useAuth.tsx';
import { exportToExcel } from '@/utils/exportUtils';

import styles from './Reports.module.css';

interface ReportFilters {
  dateFrom: string;
  dateTo: string;
  technicianId: string;
  status: string;
  priority: string;
  equipmentId: string;
  // Financial Filters
  residentId: string;
  paymentMethod: string;
  conceptName: string;
}

interface ReportStats {
  totalTickets: number;
  closedTickets: number;
  avgResolutionTime: number;
  ticketsByStatus: Record<string, number>;
  ticketsByPriority: Record<string, number>;
  ticketsByManagement: Record<string, number>;
  areaActivity: Array<{ area: string; count: number }>;
}

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

const ReportsPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'financial' | 'projects' | 'reservations'>('financial');
  
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [deletedTickets, setDeletedTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [reportStats, setReportStats] = useState<ReportStats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [filters, setFilters] = useState<ReportFilters>({
    dateFrom: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0],
    technicianId: '',
    status: '',
    priority: '',
    equipmentId: '',
    residentId: '',
    paymentMethod: '',
    conceptName: ''
  });

  // Enforce financial tab for tesorero
  useEffect(() => {
    if (user?.role === 'tesorero') {
      setActiveTab('financial');
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (tickets.length > 0) {
      calculateStats();
    }
  }, [tickets, filters, users, equipment]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [ticketsData, usersData, equipmentData, deletedTicketsData, activitiesData] = await Promise.all([
        ticketService.getTickets({ limit: 1000 }),
        userService.getUsers({ limit: 1000, isActive: 'true' }),
        equipmentService.getEquipment({ limit: 1000 }),
        ticketService.getDeletedTickets(),
        activityService.getActivities()
      ]);
      
      setTickets(ticketsData.data);
      setUsers(usersData.data);
      setEquipment(equipmentData.data);
      setDeletedTickets(deletedTicketsData || []);
      setActivities(activitiesData.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    const filteredTickets = filterTickets(tickets);
    
    const stats: ReportStats = {
      totalTickets: filteredTickets.length,
      closedTickets: filteredTickets.filter(t => t.status === 'realizado').length,
      avgResolutionTime: 0,
      ticketsByStatus: {},
      ticketsByPriority: {},
      ticketsByManagement: {},
      areaActivity: []
    };

    // Calcular tiempo promedio de respuesta/cierre
    const closedTickets = filteredTickets.filter(t => t.status === 'realizado' && t.closedAt);
    if (closedTickets.length > 0) {
      const totalTime = closedTickets.reduce((acc, ticket) => {
        if (ticket.closedAt) {
          const resolutionTime = (new Date(ticket.closedAt).getTime() - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60);
          return acc + resolutionTime;
        }
        return acc;
      }, 0);
      stats.avgResolutionTime = Math.round(totalTime / closedTickets.length * 100) / 100;
    }

    // Agrupar por estado
    filteredTickets.forEach(ticket => {
      stats.ticketsByStatus[ticket.status] = (stats.ticketsByStatus[ticket.status] || 0) + 1;
    });

    // Agrupar por cuota (prioridad)
    filteredTickets.forEach(ticket => {
      stats.ticketsByPriority[ticket.priority] = (stats.ticketsByPriority[ticket.priority] || 0) + 1;
    });

    // Agrupar por Responsable de la Mesa
    filteredTickets.forEach(ticket => {
      if (ticket.assignedToId) {
        const adminUser = users.find(u => u.id === ticket.assignedToId);
        const adminName = adminUser ? adminUser.fullName : 'Sin asignar';
        stats.ticketsByManagement[adminName] = (stats.ticketsByManagement[adminName] || 0) + 1;
      }
    });

    // Áreas (Equipos) con más reservaciones
    const areaCount: Record<string, number> = {};
    filteredTickets.forEach(ticket => {
      if (ticket.equipmentId) {
        const area = equipment.find(e => e.id === ticket.equipmentId);
        const areaName = area ? area.name : 'Área General';
        areaCount[areaName] = (areaCount[areaName] || 0) + 1;
      }
    });

    stats.areaActivity = Object.entries(areaCount)
      .map(([area, count]) => ({ area, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    setReportStats(stats);
  };

  const filterTickets = (ticketList: Ticket[]): Ticket[] => {
    return ticketList.filter(ticket => {
      const ticketDate = new Date(ticket.createdAt);
      const fromDate = filters.dateFrom ? new Date(filters.dateFrom) : null;
      const toDate = filters.dateTo ? new Date(filters.dateTo) : null;
      
      if (fromDate && ticketDate < fromDate) return false;
      if (toDate && ticketDate > toDate) return false;
      if (filters.technicianId && ticket.assignedToId !== filters.technicianId) return false;
      if (filters.status && ticket.status !== filters.status) return false;
      if (filters.priority && ticket.priority !== filters.priority) return false;
      if (filters.equipmentId && ticket.equipmentId !== filters.equipmentId) return false;
      
      return true;
    });
  };

  // Financial filtering logic
  const filterEquipment = (list: Equipment[]): Equipment[] => {
    return list.filter(item => {
      const itemDate = item.purchaseDate ? new Date(item.purchaseDate) : new Date(item.createdAt);
      const fromDate = filters.dateFrom ? new Date(filters.dateFrom) : null;
      const toDate = filters.dateTo ? new Date(filters.dateTo) : null;
      
      if (fromDate && itemDate < fromDate) return false;
      if (toDate && itemDate > toDate) return false;
      if (filters.residentId && item.assignedUserId !== filters.residentId) return false;
      if (filters.paymentMethod && item.type !== filters.paymentMethod) return false;
      if (filters.conceptName && item.name !== filters.conceptName) return false;
      
      if (filters.status) {
        const s = item.status.toLowerCase();
        if (filters.status === 'pagado' && !['active', 'activo', 'operativo'].includes(s)) return false;
        if (filters.status === 'pendiente' && !['maintenance', 'mantenimiento', 'en_reparacion'].includes(s)) return false;
        if (filters.status === 'conciliacion' && s !== 'en_almacen') return false;
        if (filters.status === 'rechazado' && !['retired', 'baja'].includes(s)) return false;
      }
      
      return true;
    });
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      solicitado: 'Solicitado',
      confirmado: 'Confirmado',
      realizado: 'Realizado',
      cancelado: 'Cancelado'
    };
    return labels[status as keyof typeof labels] || status;
  };

  const getPriorityLabel = (priority: string) => {
    const labels = {
      sin_clasificar: 'Sin Cuota',
      normal: 'Cuota de $1,500',
      importante: 'Cuota Especial'
    };
    return labels[priority as keyof typeof labels] || priority;
  };

  const formatEquipmentStatusLabel = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'retired' || s === 'baja') return 'RECHAZADO';
    if (s === 'active' || s === 'activo' || s === 'operativo') return 'PAGADO';
    if (s === 'maintenance' || s === 'mantenimiento' || s === 'en_reparacion') return 'PENDIENTE';
    if (s === 'en_almacen') return 'EN CONCILIACIÓN';
    return status.toUpperCase();
  };

  const formatStatusClass = (status: string) => {
    const lbl = formatEquipmentStatusLabel(status);
    if (lbl === 'PAGADO') return styles.statusPagado;
    if (lbl === 'PENDIENTE') return styles.statusPendiente;
    if (lbl === 'EN CONCILIACIÓN') return styles.statusConciliacion;
    return styles.statusRechazado;
  };

  const generateFullReport = async () => {
    setGenerating(true);
    try {
      if (activeTab === 'financial') {
        const filteredList = filterEquipment(equipment);
        
        const colVal = filteredList
          .filter(e => e.location !== 'GASTO' && ['active', 'activo', 'operativo'].includes(e.status.toLowerCase()))
          .reduce((acc, e) => acc + parseFloat(e.inventoryNumber || '0'), 0);

        const expVal = filteredList
          .filter(e => e.location === 'GASTO' && ['active', 'activo', 'operativo'].includes(e.status.toLowerCase()))
          .reduce((acc, e) => acc + parseFloat(e.inventoryNumber || '0'), 0);

        const concVal = filteredList
          .filter(e => e.status.toLowerCase() === 'en_almacen')
          .reduce((acc, e) => acc + parseFloat(e.inventoryNumber || '0'), 0);

        const totalNet = colVal - expVal;

        const rptMonthlyMap: Record<string, { income: number; expense: number; total: number; brand: string; model: string }> = {};
        filteredList.forEach(item => {
          const periodKey = `${item.brand} ${item.model}`;
          const amount = parseFloat(item.inventoryNumber || '0');
          const isGasto = item.location === 'GASTO';
          const status = item.status.toLowerCase();
          
          if (!rptMonthlyMap[periodKey]) {
            rptMonthlyMap[periodKey] = { income: 0, expense: 0, total: 0, brand: item.brand, model: item.model };
          }
          if (['active', 'activo', 'operativo'].includes(status)) {
            if (isGasto) {
              rptMonthlyMap[periodKey].expense += amount;
            } else {
              rptMonthlyMap[periodKey].income += amount;
            }
          }
          rptMonthlyMap[periodKey].total = rptMonthlyMap[periodKey].income - rptMonthlyMap[periodKey].expense;
        });

        const rptSortedPeriods = Object.entries(rptMonthlyMap).sort((a, b) => {
          const yearA = parseInt(a[1].model) || 0;
          const yearB = parseInt(b[1].model) || 0;
          if (yearA !== yearB) return yearA - yearB;
          const monthA = monthOrder[a[1].brand.toLowerCase()] || 0;
          const monthB = monthOrder[b[1].brand.toLowerCase()] || 0;
          return monthA - monthB;
        });

        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>Balance de Caja y Flujo Neto</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
              .header { text-align: center; border-bottom: 2px solid #800020; padding-bottom: 20px; margin-bottom: 30px; }
              .logo { font-size: 24px; font-weight: bold; color: #800020; }
              .subtitle { color: #666; margin-top: 5px; }
              .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin: 30px 0; }
              .stat-card { border: 1px solid #ddd; padding: 15px; border-radius: 8px; text-align: center; }
              .stat-value { font-size: 1.4em; font-weight: bold; }
              .stat-value.collected { color: #10b981; }
              .stat-value.expense { color: #ef4444; }
              .stat-value.reconciliation { color: #3b82f6; }
              .stat-value.total { color: #047857; }
              .stat-label { color: #666; margin-top: 5px; font-size: 0.9em; }
              .section { margin: 30px 0; }
              .section-title { background: #f5f5f5; padding: 10px; font-weight: bold; border-left: 4px solid #800020; margin-bottom: 15px; }
              .table { width: 100%; border-collapse: collapse; margin-top: 15px; }
              .table th, .table td { padding: 10px; border: 1px solid #ddd; text-align: left; font-size: 0.9em; }
              .table th { background-color: #f9fafb; font-weight: bold; }
              .badge { display: inline-block; padding: 3px 8px; border-radius: 12px; font-size: 0.8em; font-weight: bold; text-transform: uppercase; }
              .badge-pagado { background-color: #d1fae5; color: #065f46; }
              .badge-pendiente { background-color: #fef3c7; color: #92400e; }
              .badge-conciliacion { background-color: #dbeafe; color: #1e40af; }
              .badge-rechazado { background-color: #fee2e2; color: #991b1b; }
              .filters { background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; font-size: 0.9em; line-height: 1.5; }
              .month-bar-row { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="logo">STANZA MALAGA</div>
              <div class="subtitle">Sección Almería - Residencial</div>
              <div class="subtitle">Reporte de Flujo de Caja y Gastos - ${new Date().toLocaleDateString('es-MX')}</div>
            </div>

            <div class="filters">
              <strong>Filtros aplicados:</strong><br>
              Período: ${filters.dateFrom ? new Date(filters.dateFrom).toLocaleDateString('es-ES') : 'Todo'} - ${filters.dateTo ? new Date(filters.dateTo).toLocaleDateString('es-ES') : 'Todo'}<br>
              ${filters.residentId ? `Residente: ${users.find(u => u.id === filters.residentId)?.fullName.toUpperCase()} | ` : ''}
              ${filters.paymentMethod ? `Forma de Pago: ${filters.paymentMethod.toUpperCase()} | ` : ''}
              ${filters.status ? `Estado: ${filters.status.toUpperCase()} | ` : ''}
              Total de transacciones: ${filteredList.length}
            </div>

            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-value collected">$${colVal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</div>
                <div class="stat-label">Ingresos Recaudados</div>
              </div>
              <div class="stat-card">
                <div class="stat-value expense">$${expVal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</div>
                <div class="stat-label">Gastos Egresados</div>
              </div>
              <div class="stat-card">
                <div class="stat-value reconciliation">$${concVal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</div>
                <div class="stat-label">En Conciliación</div>
              </div>
              <div class="stat-card">
                <div class="stat-value total" style="color: ${totalNet >= 0 ? '#047857' : '#b91c1c'}">$${totalNet.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</div>
                <div class="stat-label">Balance Neto en Caja</div>
              </div>
            </div>

            <div class="section">
              <div class="section-title">Resumen de Flujo de Caja por Período Mensual</div>
              ${rptSortedPeriods.map(([period, data]) => `
                <div class="month-bar-row">
                  <span><strong>${period}</strong></span>
                  <span>
                    Ingresos: +$${data.income.toLocaleString()} | 
                    Egresos: -$${data.expense.toLocaleString()}
                  </span>
                  <span style="color: ${data.total >= 0 ? '#047857' : '#b91c1c'}"><strong>Neto: $${data.total.toLocaleString()}</strong></span>
                </div>
              `).join('')}
            </div>

            <div class="section">
              <div class="section-title">Libro de Caja y Detalle Transaccional</div>
              <table class="table">
                <thead>
                  <tr>
                    <th>Concepto</th>
                    <th>Forma</th>
                    <th>Período</th>
                    <th>Clasificación / Residente</th>
                    <th>Monto ($)</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  ${filteredList.map(item => {
                    const isGasto = item.location === 'GASTO';
                    const lbl = formatEquipmentStatusLabel(item.status);
                    let badgeClass = 'badge-pagado';
                    if (lbl === 'PENDIENTE') badgeClass = 'badge-pendiente';
                    if (lbl === 'EN CONCILIACIÓN') badgeClass = 'badge-conciliacion';
                    if (lbl === 'RECHAZADO') badgeClass = 'badge-rechazado';
                    
                    return `
                      <tr>
                        <td><strong>${isGasto ? '🔻 [EGRESO] ' : ''}${item.name}</strong></td>
                        <td>${item.type}</td>
                        <td>${item.brand} ${item.model}</td>
                        <td>${isGasto ? 'GASTO ADMINISTRATIVO' : (item.assignedUser?.fullName || 'No asignado')}</td>
                        <td style="color: ${isGasto ? '#ef4444' : '#10b981'}"><strong>${isGasto ? '-' : ''}$${parseFloat(item.inventoryNumber || '0').toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong></td>
                        <td><span class="badge ${badgeClass}">${lbl}</span></td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>

            <div style="margin-top: 50px; text-align: center; color: #666; font-size: 12px;">
              Reporte financiero generado el ${new Date().toLocaleDateString('es-ES')} a las ${new Date().toLocaleTimeString('es-ES')}
            </div>
          </body>
          </html>
        `;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(htmlContent);
          printWindow.document.close();
          printWindow.focus();
          printWindow.print();
          setTimeout(() => printWindow.close(), 1000);
        }
      } else if (activeTab === 'projects') {
        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>Informe de Proyectos por Realizar</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
              .header { text-align: center; border-bottom: 2px solid #800020; padding-bottom: 20px; margin-bottom: 30px; }
              .logo { font-size: 24px; font-weight: bold; color: #800020; }
              .subtitle { color: #666; margin-top: 5px; }
              .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin: 30px 0; }
              .stat-card { border: 1px solid #ddd; padding: 15px; border-radius: 8px; text-align: center; }
              .stat-value { font-size: 1.5em; font-weight: bold; color: #800020; }
              .stat-label { color: #666; margin-top: 5px; font-size: 0.9em; }
              .section { margin: 30px 0; }
              .section-title { background: #f5f5f5; padding: 10px; font-weight: bold; border-left: 4px solid #800020; margin-bottom: 15px; }
              .table { width: 100%; border-collapse: collapse; margin-top: 15px; }
              .table th, .table td { padding: 10px; border: 1px solid #ddd; text-align: left; font-size: 0.9em; }
              .table th { background-color: #f9fafb; font-weight: bold; }
              .badge { display: inline-block; padding: 3px 8px; border-radius: 12px; font-size: 0.8em; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="logo">STANZA MALAGA</div>
              <div class="subtitle">Sección Almería - Residencial</div>
              <div class="subtitle">Reporte Analítico de Proyectos y Presupuestos - ${new Date().toLocaleDateString('es-MX')}</div>
            </div>

            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-value">${totalProjectsCount}</div>
                <div class="stat-label">Proyectos Registrados</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">$${totalBudgetRequired.toLocaleString('es-MX')}</div>
                <div class="stat-label">Presupuesto Total Requerido</div>
              </div>
              <div class="stat-card">
                <div class="stat-value" style="color: #10b981">$${budgetExecuted.toLocaleString('es-MX')}</div>
                <div class="stat-label">Presupuesto Ejecutado</div>
              </div>
              <div class="stat-card">
                <div class="stat-value" style="color: #f59e0b">$${budgetPending.toLocaleString('es-MX')}</div>
                <div class="stat-label">Presupuesto Pendiente</div>
              </div>
            </div>

            <div class="section">
              <div class="section-title">Listado Analítico de Obras y Proyectos</div>
              <table class="table">
                <thead>
                  <tr>
                    <th>Proyecto</th>
                    <th>Detalles / Notas</th>
                    <th>Presupuesto ($)</th>
                    <th>Prioridad</th>
                    <th>Estado</th>
                    <th>Documento Respaldo</th>
                  </tr>
                </thead>
                <tbody>
                  ${activities.map(a => {
                    const parsed = parseActivityDescription(a.description);
                    const map: Record<string, string> = { 'todo': 'POR HACER', 'in_progress': 'EN PROGRESO', 'review': 'EN REVISIÓN', 'done': 'COMPLETADO' };
                    const priorityMap: Record<string, string> = { 'low': 'BAJA', 'normal': 'NORMAL', 'high': 'ALTA', 'urgent': 'URGENTE' };
                    
                    return `
                      <tr>
                        <td><strong>${a.title}</strong></td>
                        <td>${parsed.notes || 'Sin detalles'}</td>
                        <td><strong>$${parsed.budget.toLocaleString('es-MX')}</strong></td>
                        <td>${priorityMap[a.priority] || a.priority.toUpperCase()}</td>
                        <td><strong>${map[a.status] || a.status.toUpperCase()}</strong></td>
                        <td>${parsed.documentUrl ? '✓ Adjunto Cargado' : 'Sin adjunto'}</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>

            <div style="margin-top: 50px; text-align: center; color: #666; font-size: 12px;">
              Reporte generado el ${new Date().toLocaleDateString('es-ES')} a las ${new Date().toLocaleTimeString('es-ES')}
            </div>
          </body>
          </html>
        `;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(htmlContent);
          printWindow.document.close();
          printWindow.focus();
          printWindow.print();
          setTimeout(() => printWindow.close(), 1000);
        }
      } else {
        const filteredTickets = filterTickets(tickets);
        
        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>Reporte General de Tickets</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
              .logo { font-size: 24px; font-weight: bold; color: #333; }
              .subtitle { color: #666; margin-top: 5px; }
              .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin: 30px 0; }
              .stat-card { border: 1px solid #ddd; padding: 15px; border-radius: 8px; text-align: center; }
              .stat-value { font-size: 2em; font-weight: bold; color: #007bff; }
              .stat-label { color: #666; margin-top: 5px; }
              .section { margin: 30px 0; }
              .section-title { background: #f5f5f5; padding: 10px; font-weight: bold; border-left: 4px solid #007bff; }
              .chart-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
              .filters { background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="logo">STANZA MALAGA</div>
              <div class="subtitle">Sección Almería - Residencial</div>
              <div class="subtitle">Reporte General de Reservaciones y Actividad - ${new Date().toLocaleDateString('es-MX')}</div>
            </div>

            <div class="filters">
              <strong>Filtros aplicados:</strong><br>
              Período: ${new Date(filters.dateFrom).toLocaleDateString('es-ES')} - ${new Date(filters.dateTo).toLocaleDateString('es-ES')}<br>
              ${filters.status ? `Estado: ${filters.status.toUpperCase()} | ` : ''}
              ${filters.priority ? `Cuota: ${getPriorityLabel(filters.priority).toUpperCase()} | ` : ''}
              Total de Reservaciones: ${filteredTickets.length}
            </div>

            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-value">${reportStats?.totalTickets || 0}</div>
                <div class="stat-label">Total Reservaciones</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${reportStats?.closedTickets || 0}</div>
                <div class="stat-label">Eventos Realizados</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${reportStats?.avgResolutionTime || 0}h</div>
                <div class="stat-label">Tiempo de Gestión</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${Math.round(((reportStats?.closedTickets || 0) / (reportStats?.totalTickets || 1)) * 100)}%</div>
                <div class="stat-label">Tasa de Cumplimiento</div>
              </div>
            </div>

            <div class="section">
              <div class="section-title">Reservaciones por Estado</div>
              ${Object.entries(reportStats?.ticketsByStatus || {}).map(([status, count]) => 
                `<div class="chart-item">
                  <span>${getStatusLabel(status)}</span>
                  <span><strong>${count}</strong></span>
                </div>`
              ).join('')}
            </div>

            <div class="section">
              <div class="section-title">Reservaciones por Cuota</div>
              ${Object.entries(reportStats?.ticketsByPriority || {}).map(([priority, count]) => 
                `<div class="chart-item">
                  <span>${getPriorityLabel(priority)}</span>
                  <span><strong>${count}</strong></span>
                </div>`
              ).join('')}
            </div>

            <div class="section">
              <div class="section-title">Reservaciones por Responsable</div>
              ${Object.entries(reportStats?.ticketsByManagement || {}).map(([admin, count]) =>
                `<div class="chart-item">
                  <span>${admin}</span>
                  <span><strong>${count}</strong></span>
                </div>`
              ).join('')}
            </div>

            <div class="section">
              <div class="section-title">Áreas con Mayor Actividad</div>
              ${(reportStats?.areaActivity || []).map(({ area, count }) =>
                `<div class="chart-item">
                  <span>${area}</span>
                  <span><strong>${count}</strong></span>
                </div>`
              ).join('')}
            </div>

            <div style="margin-top: 50px; text-align: center; color: #666; font-size: 12px;">
              Reporte generado el ${new Date().toLocaleDateString('es-ES')} a las ${new Date().toLocaleTimeString('es-ES')}
            </div>
          </body>
          </html>
        `;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(htmlContent);
          printWindow.document.close();
          printWindow.focus();
          printWindow.print();
          setTimeout(() => printWindow.close(), 1000);
        }
      }
    } catch (error) {
      console.error('Error generando reporte:', error);
      await showError('Error al generar el reporte');
    } finally {
      setGenerating(false);
    }
  };

  const handleExportFinancialExcel = () => {
    const filteredList = filterEquipment(equipment);
    const dataToExport = filteredList.map(item => {
      const isGasto = item.location === 'GASTO';
      return {
        'Tipo': isGasto ? 'EGRESO' : 'INGRESO',
        'Concepto de Transacción': item.name,
        'Forma de Pago': item.type,
        'Período': `${item.brand} ${item.model}`,
        'Propietario / Residente': isGasto ? 'GASTO ADMINISTRATIVO' : (item.assignedUser?.fullName || 'No asignado'),
        'Monto ($)': (isGasto ? -1 : 1) * parseFloat(item.inventoryNumber || '0'),
        'Estatus de Pago': formatEquipmentStatusLabel(item.status)
      };
    });
    exportToExcel(dataToExport, 'Libro_Caja_Residencial');
  };

  // Calculations for Financial Dashboard
  const filteredEquipment = filterEquipment(equipment);
  
  const totalCollectedIncomes = filteredEquipment
    .filter(e => e.location !== 'GASTO' && ['active', 'activo', 'operativo'].includes(e.status.toLowerCase()))
    .reduce((acc, e) => acc + parseFloat(e.inventoryNumber || '0'), 0);

  const totalExpenses = filteredEquipment
    .filter(e => e.location === 'GASTO' && ['active', 'activo', 'operativo'].includes(e.status.toLowerCase()))
    .reduce((acc, e) => acc + parseFloat(e.inventoryNumber || '0'), 0);

  const totalReconciliation = filteredEquipment
    .filter(e => e.status.toLowerCase() === 'en_almacen')
    .reduce((acc, e) => acc + parseFloat(e.inventoryNumber || '0'), 0);

  const netCashFlow = totalCollectedIncomes - totalExpenses;

  // Monthly breakdown map (Incomes vs Expenses)
  const monthlyDataMap: Record<string, { income: number; expense: number; total: number; brand: string; model: string }> = {};
  filteredEquipment.forEach(item => {
    const periodKey = `${item.brand} ${item.model}`;
    const amount = parseFloat(item.inventoryNumber || '0');
    const isGasto = item.location === 'GASTO';
    const status = item.status.toLowerCase();
    
    if (!monthlyDataMap[periodKey]) {
      monthlyDataMap[periodKey] = { income: 0, expense: 0, total: 0, brand: item.brand, model: item.model };
    }
    
    if (['active', 'activo', 'operativo'].includes(status)) {
      if (isGasto) {
        monthlyDataMap[periodKey].expense += amount;
      } else {
        monthlyDataMap[periodKey].income += amount;
      }
    }
    monthlyDataMap[periodKey].total = monthlyDataMap[periodKey].income - monthlyDataMap[periodKey].expense;
  });

  const monthOrder: Record<string, number> = {
    'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4, 'mayo': 5, 'junio': 6,
    'julio': 7, 'agosto': 8, 'septiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12
  };

  const sortedPeriods = Object.entries(monthlyDataMap).sort((a, b) => {
    const yearA = parseInt(a[1].model) || 0;
    const yearB = parseInt(b[1].model) || 0;
    if (yearA !== yearB) return yearA - yearB;
    
    const monthA = monthOrder[a[1].brand.toLowerCase()] || 0;
    const monthB = monthOrder[b[1].brand.toLowerCase()] || 0;
    return monthA - monthB;
  });

  const maxMonthValue = sortedPeriods.reduce((max, [_, val]) => {
    const valMax = Math.max(val.income, val.expense);
    return valMax > max ? valMax : max;
  }, 1);

  // Projects calculations
  const totalProjectsCount = activities.length;
  const totalBudgetRequired = activities.reduce((acc, a) => acc + parseActivityDescription(a.description).budget, 0);
  const budgetExecuted = activities
    .filter(a => a.status === 'done')
    .reduce((acc, a) => acc + parseActivityDescription(a.description).budget, 0);
  const budgetPending = totalBudgetRequired - budgetExecuted;

  const sortedUsers = [...users].sort((a, b) => a.fullName.localeCompare(b.fullName));
  const uniqueConcepts = Array.from(new Set(equipment.map(e => e.name))).sort();
  const technicians = users.filter(u => ['admin', 'presidente', 'vicepresidente', 'eventos'].includes(u.role));

  const filteredDeletedTickets = deletedTickets.filter(dt => 
    (dt.ticket_number?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (dt.title?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (dt.justification?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (dt.deletedBy?.fullName?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const columns = [
    { key: 'ticket_number', label: 'Folio', render: (row: any) => row.ticket_number },
    { key: 'title', label: 'Evento', render: (row: any) => row.title },
    { key: 'justification', label: 'Justificación', render: (row: any) => row.justification },
    { key: 'deletedBy', label: 'Eliminado Por', render: (row: any) => row.deletedBy?.fullName || 'N/A' },
    { key: 'deleted_at', label: 'Fecha Eliminación', render: (row: any) => new Date(row.deleted_at).toLocaleDateString() + ' ' + new Date(row.deleted_at).toLocaleTimeString() }
  ];

  const financialColumns = [
    { 
      key: 'name', 
      label: 'Concepto de Transacción', 
      render: (row: Equipment) => (
        <span style={{ fontWeight: 600, color: row.location === 'GASTO' ? '#ef4444' : '#111827' }}>
          {row.location === 'GASTO' ? '🔻 [EGRESO] ' : ''}{row.name}
        </span>
      )
    },
    { key: 'type', label: 'Forma' },
    { 
      key: 'brand', 
      label: 'Período', 
      render: (row: Equipment) => `${row.brand} ${row.model}` 
    },
    { 
      key: 'assignedUser', 
      label: 'Residente / Clasificación', 
      render: (row: Equipment) => row.location === 'GASTO' ? <span style={{ color: '#ef4444', fontWeight: 600 }}>EGRESO / GASTO</span> : (row.assignedUser?.fullName || 'No asignado') 
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
          : formatEquipmentStatusLabel(row.status);
        const badgeClass = formatStatusClass(row.status);
        
        if (isGasto) {
          if (lbl === 'PAGADO') {
            return <span className={styles.statusBadge} style={{ background: '#fee2e2', color: '#991b1b' }}>{lbl}</span>;
          } else {
            return <span className={styles.statusBadge} style={{ background: '#ffedd5', color: '#c2410c' }}>{lbl}</span>;
          }
        }
        return <span className={`${styles.statusBadge} ${badgeClass}`}>{lbl}</span>;
      }
    }
  ];

  const projectColumns = [
    {
      key: 'title',
      label: 'Proyecto / Obra',
      render: (row: Activity) => <span style={{ fontWeight: 600, color: '#111827' }}>{row.title}</span>
    },
    {
      key: 'notes',
      label: 'Detalles / Notas',
      render: (row: Activity) => {
        const parsed = parseActivityDescription(row.description);
        return parsed.notes || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Sin detalles</span>;
      }
    },
    {
      key: 'budget',
      label: 'Presupuesto ($)',
      render: (row: Activity) => {
        const parsed = parseActivityDescription(row.description);
        return parsed.budget > 0 
          ? <strong style={{ color: '#047857' }}>${parsed.budget.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
          : <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>-</span>;
      }
    },
    {
      key: 'status',
      label: 'Estado',
      render: (row: Activity) => {
        const map: Record<string, string> = { 'todo': 'POR HACER', 'in_progress': 'EN PROGRESO', 'review': 'EN REVISIÓN', 'done': 'COMPLETADO' };
        const color: Record<string, string> = { 'todo': '#6b7280', 'in_progress': '#3b82f6', 'review': '#f59e0b', 'done': '#10b981' };
        return (
          <span className={styles.statusBadge} style={{ backgroundColor: color[row.status] || '#ccc', color: 'white' }}>
            {map[row.status] || row.status.toUpperCase()}
          </span>
        );
      }
    },
    {
      key: 'document',
      label: 'Respaldo',
      render: (row: Activity) => {
        const parsed = parseActivityDescription(row.description);
        if (!parsed.documentUrl) return <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Sin archivo</span>;
        
        return (
          <a
            href={parsed.documentUrl.startsWith('http') ? parsed.documentUrl : `${(() => {
                const isNative = window.location.origin.includes('localhost') && !window.location.port;
                if (isNative || window.location.protocol.startsWith('capacitor')) {
                  return 'http://10.0.2.2:3000';
                }
                return window.location.origin;
            })()}${parsed.documentUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#800020', fontWeight: 600, textDecoration: 'none' }}
          >
            <Download size={14} />
            Ver Adjunto
          </a>
        );
      }
    }
  ];

  if (loading) {
    return (
      <Layout>
        <div className={styles.container}>
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <p>Cargando datos...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className={styles.container}>
        
        {/* Encabezado */}
        <div className={styles.header}>
          <div>
            <h1>Reportes y Estadísticas</h1>
            <p>
              {activeTab === 'financial' && 'Balance de caja neto, ingresos y egresos del residencial'}
              {activeTab === 'projects' && 'Planificación presupuestaria y cotizaciones de obras por realizar'}
              {activeTab === 'reservations' && 'Análisis de reservaciones, actividad y auditoría de áreas'}
            </p>
          </div>
          <div className={styles.headerActions}>
            <button 
              className="btn btn-outline"
              onClick={() => setShowFiltersModal(true)}
            >
              <Filter size={18} />
              Filtros
            </button>

            {activeTab === 'financial' && (
              <button 
                className="btn btn-outline"
                onClick={handleExportFinancialExcel}
                style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#107c41', borderColor: '#107c41' }}
              >
                <FileSpreadsheet size={18} />
                Excel
              </button>
            )}

            <button 
              className="btn btn-primary"
              onClick={generateFullReport}
              disabled={generating}
            >
              <Download size={18} />
              {generating ? 'Generando...' : 'Exportar PDF'}
            </button>
          </div>
        </div>

        {/* Tab Selector (Oculto para el tesorero) */}
        {user?.role !== 'tesorero' && (
          <div className={styles.tabContainer}>
            <button 
              className={`${styles.tabButton} ${activeTab === 'financial' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('financial')}
            >
              <TrendingUp size={18} />
              Caja y Gastos
            </button>
            <button 
              className={`${styles.tabButton} ${activeTab === 'projects' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('projects')}
            >
              <Briefcase size={18} />
              Proyectos y Presupuestos
            </button>
            <button 
              className={`${styles.tabButton} ${activeTab === 'reservations' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('reservations')}
            >
              <Calendar size={18} />
              Reservación de Áreas
            </button>
          </div>
        )}

        {/* TAB 1: Caja y Finanzas */}
        {activeTab === 'financial' && (
          <>
            {/* KPIs Financieros */}
            <div className={styles.statsSection}>
              <div className={styles.statsGrid}>
                
                <div className={`${styles.statCard} ${styles.financialCard}`}>
                  <div className={styles.statIcon} style={{ background: '#d1fae5', color: '#10b981' }}>
                    <DollarSign size={24} />
                  </div>
                  <div className={styles.statContent}>
                    <h3>${totalCollectedIncomes.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</h3>
                    <p>Ingresos Recaudados</p>
                  </div>
                </div>

                <div className={`${styles.statCard} ${styles.financialCard} ${styles.pending}`}>
                  <div className={styles.statIcon} style={{ background: '#fee2e2', color: '#ef4444' }}>
                    <Wallet size={24} />
                  </div>
                  <div className={styles.statContent}>
                    <h3>${totalExpenses.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</h3>
                    <p>Gastos Egresados</p>
                  </div>
                </div>

                <div className={`${styles.statCard} ${styles.financialCard} ${styles.reconciliation}`}>
                  <div className={styles.statIcon} style={{ background: '#dbeafe', color: '#3b82f6' }}>
                    <RefreshCw size={24} />
                  </div>
                  <div className={styles.statContent}>
                    <h3>${totalReconciliation.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</h3>
                    <p>En Conciliación</p>
                  </div>
                </div>

                <div className={styles.statCard} style={{ borderLeft: `4px solid ${netCashFlow >= 0 ? '#10b981' : '#ef4444'}` }}>
                  <div className={styles.statIcon} style={{ background: netCashFlow >= 0 ? '#d1fae5' : '#fee2e2', color: netCashFlow >= 0 ? '#047857' : '#b91c1c' }}>
                    <BarChart3 size={24} />
                  </div>
                  <div className={styles.statContent}>
                    <h3 style={{ color: netCashFlow >= 0 ? '#047857' : '#b91c1c' }}>
                      {netCashFlow >= 0 ? '+' : ''}${netCashFlow.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </h3>
                    <p>Balance Neto en Caja</p>
                  </div>
                </div>

              </div>
            </div>

            {/* Comparativo Mensual Incomes vs Expenses */}
            <div className={styles.chartCard} style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0 }}>Flujo de Caja Mensual (Ingresos vs Egresos)</h3>
                <div style={{ display: 'flex', gap: 16, fontSize: '0.85rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: '#10b981' }} /> Ingreso (Cuota)</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: '#ef4444' }} /> Egreso (Gasto)</span>
                </div>
              </div>
              <div className={styles.monthlyChart}>
                {sortedPeriods.length === 0 ? (
                  <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem 0' }}>No hay datos suficientes para graficar períodos.</p>
                ) : (
                  sortedPeriods.map(([period, data]) => {
                    const incomePct = (data.income / maxMonthValue) * 100;
                    const expensePct = (data.expense / maxMonthValue) * 100;
                    
                    return (
                      <div key={period} className={styles.monthRow} style={{ gridTemplateColumns: '120px 1fr 180px', marginBottom: '1.25rem' }}>
                        <span className={styles.monthName}>{period}</span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div className={styles.progressBarWrapper} style={{ height: '10px', flex: 1 }}>
                              <div 
                                className={styles.progressBarCollected} 
                                style={{ width: `${incomePct}%` }}
                              />
                            </div>
                            <span style={{ fontSize: '0.8rem', color: '#047857', fontWeight: 600, width: '60px', textAlign: 'right' }}>
                              +${data.income.toLocaleString()}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div className={styles.progressBarWrapper} style={{ height: '10px', flex: 1 }}>
                              <div 
                                className={styles.progressBarReconciliation} 
                                style={{ width: `${expensePct}%`, background: '#ef4444' }}
                              />
                            </div>
                            <span style={{ fontSize: '0.8rem', color: '#b91c1c', fontWeight: 600, width: '60px', textAlign: 'right' }}>
                              -${data.expense.toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: data.total >= 0 ? '#047857' : '#b91c1c', textAlign: 'right' }}>
                          Neto: {data.total >= 0 ? '+' : ''}${data.total.toLocaleString()}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Tabla Ledger de Caja */}
            <div className={styles.chartCard} style={{ padding: 0 }}>
              <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
                <h3 style={{ margin: 0 }}>Libro de Caja y Libro Mayor</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#6b7280' }}>
                  Listado unificado de ingresos (cuotas) y egresos (gastos administrativos)
                </p>
              </div>
              <div className={styles.tableWrapper} style={{ margin: 0, border: 'none', borderRadius: 0 }}>
                <Table
                  data={filteredEquipment}
                  columns={financialColumns}
                  loading={loading}
                  emptyMessage="No se encontraron registros financieros"
                  selectable={false}
                />
              </div>
            </div>
          </>
        )}

        {/* TAB 2: Proyectos por Realizar */}
        {activeTab === 'projects' && (
          <>
            {/* KPIs de Obras */}
            <div className={styles.statsSection}>
              <div className={styles.statsGrid}>
                
                <div className={styles.statCard}>
                  <div className={styles.statIcon} style={{ background: '#fdf2f8', color: '#db2777' }}>
                    <Briefcase size={24} />
                  </div>
                  <div className={styles.statContent}>
                    <h3>{totalProjectsCount}</h3>
                    <p>Proyectos Registrados</p>
                  </div>
                </div>

                <div className={styles.statCard}>
                  <div className={styles.statIcon} style={{ background: '#f3e8ff', color: '#7c3aed' }}>
                    <DollarSign size={24} />
                  </div>
                  <div className={styles.statContent}>
                    <h3>${totalBudgetRequired.toLocaleString('es-MX')}</h3>
                    <p>Presupuesto Total</p>
                  </div>
                </div>

                <div className={styles.statCard}>
                  <div className={styles.statIcon} style={{ background: '#d1fae5', color: '#10b981' }}>
                    <CheckCircle2 size={24} />
                  </div>
                  <div className={styles.statContent}>
                    <h3>${budgetExecuted.toLocaleString('es-MX')}</h3>
                    <p>Presupuesto Ejecutado</p>
                  </div>
                </div>

                <div className={styles.statCard}>
                  <div className={styles.statIcon} style={{ background: '#fef3c7', color: '#f59e0b' }}>
                    <Clock size={24} />
                  </div>
                  <div className={styles.statContent}>
                    <h3>${budgetPending.toLocaleString('es-MX')}</h3>
                    <p>Presupuesto Pendiente</p>
                  </div>
                </div>

              </div>
            </div>

            {/* Tabla de Proyectos y Presupuestos */}
            <div className={styles.chartCard} style={{ padding: 0 }}>
              <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
                <h3 style={{ margin: 0 }}>Desglose de Obras, Cotizaciones y Proyectos</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#6b7280' }}>
                  Auditoría de planeación urbana y presupuestos con documentos de respaldo adjuntos
                </p>
              </div>
              <div className={styles.tableWrapper} style={{ margin: 0, border: 'none', borderRadius: 0 }}>
                <Table
                  data={activities}
                  columns={projectColumns}
                  loading={loading}
                  emptyMessage="No hay proyectos registrados en la bitácora"
                  selectable={false}
                />
              </div>
            </div>
          </>
        )}

        {/* TAB 3: Reservación de Áreas */}
        {activeTab === 'reservations' && reportStats && (
          <>
            <div className={styles.statsSection}>
              <div className={styles.statsGrid}>
                
                <div className={styles.statCard}>
                  <div className={styles.statIcon}>
                    <FileText size={24} />
                  </div>
                  <div className={styles.statContent}>
                    <h3>{reportStats.totalTickets}</h3>
                    <p>Total Reservaciones</p>
                  </div>
                </div>

                <div className={styles.statCard}>
                  <div className={`${styles.statIcon} ${styles.closed}`}>
                    <CheckCircle2 size={24} style={{ color: '#22c55e' }} />
                  </div>
                  <div className={styles.statContent}>
                    <h3>{reportStats.closedTickets}</h3>
                    <p>Eventos Realizados</p>
                  </div>
                </div>

                <div className={styles.statCard}>
                  <div className={`${styles.statIcon} ${styles.time}`}>
                    <Clock size={24} style={{ color: '#3b82f6' }} />
                  </div>
                  <div className={styles.statContent}>
                    <h3>{reportStats.avgResolutionTime}h</h3>
                    <p>Promedio de Respuesta</p>
                  </div>
                </div>

                <div className={styles.statCard}>
                  <div className={`${styles.statIcon} ${styles.rate}`}>
                    <BarChart3 size={24} style={{ color: '#a855f7' }} />
                  </div>
                  <div className={styles.statContent}>
                    <h3>{Math.round((reportStats.closedTickets / (reportStats.totalTickets || 1)) * 100)}%</h3>
                    <p>Cumplimiento</p>
                  </div>
                </div>

              </div>
            </div>

            <div className={styles.chartsGrid}>
              <div className={styles.chartCard}>
                <h3>Reservaciones por Estado</h3>
                <div className={styles.chartContent}>
                  {Object.entries(reportStats.ticketsByStatus).map(([status, count]) => (
                    <div key={status} className={styles.chartRow}>
                      <span className={styles.chartLabel}>{getStatusLabel(status)}</span>
                      <div className={styles.chartBar}>
                        <div 
                          className={`${styles.chartFill} ${styles[status] || styles.nuevo}`} 
                          style={{ width: `${(count / reportStats.totalTickets) * 100}%` }}
                        />
                      </div>
                      <span className={styles.chartValue}>{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.chartCard}>
                <h3>Reservaciones por Cuota</h3>
                <div className={styles.chartContent}>
                  {Object.entries(reportStats.ticketsByPriority).map(([priority, count]) => (
                    <div key={priority} className={styles.chartRow}>
                      <span className={styles.chartLabel}>{getPriorityLabel(priority)}</span>
                      <div className={styles.chartBar}>
                        <div 
                          className={`${styles.chartFill} ${styles[priority] || styles.media}`} 
                          style={{ width: `${(count / reportStats.totalTickets) * 100}%` }}
                        />
                      </div>
                      <span className={styles.chartValue}>{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.header} style={{ marginTop: '2rem' }}>
              <div>
                <h1>Historial de Eliminación</h1>
                <p>Registro de reservaciones eliminadas y auditoría</p>
              </div>
            </div>

            <div style={{ background: 'white', padding: 16, borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                 <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                   <div style={{ position: 'relative', flex: 1 }}>
                       <Search size={20} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                       <input 
                          className="form-input"
                          type="text" 
                          placeholder="Buscar en historial..." 
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          style={{ width: '100%', paddingLeft: 40, height: '48px', fontSize: '1rem' }}
                       />
                   </div>
                 </div>
              </div>
            </div>

            <div className={styles.tableContainer}>
              <Table
                data={filteredDeletedTickets}
                columns={columns}
                loading={loading}
                emptyMessage="No hay reservaciones eliminadas"
                selectable={false}
              />
            </div>
          </>
        )}

      </div>

      {/* Modal de Filtros Dinámicos */}
      <Modal
        isOpen={showFiltersModal}
        onClose={() => setShowFiltersModal(false)}
        title="Filtrar Reporte"
      >
        <div className={styles.filtersForm}>
          
          <div className={styles.formGrid}>
            <div className="form-group">
              <label>Desde</label>
              <input 
                type="date" 
                className="form-input"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Hasta</label>
              <input 
                type="date" 
                className="form-input"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              />
            </div>
          </div>

          {activeTab === 'financial' ? (
            <>
              {/* Filtros Financieros */}
              <div className="form-group">
                <label>Residente / Propietario</label>
                <select 
                  className="form-input"
                  value={filters.residentId}
                  onChange={(e) => setFilters({ ...filters, residentId: e.target.value })}
                >
                  <option value="">TODOS LOS RESIDENTES</option>
                  {sortedUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.fullName.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              <div className={styles.formGrid}>
                <div className="form-group">
                  <label>Forma de Pago</label>
                  <select 
                    className="form-input"
                    value={filters.paymentMethod}
                    onChange={(e) => setFilters({ ...filters, paymentMethod: e.target.value })}
                  >
                    <option value="">TODAS LAS FORMAS</option>
                    <option value="Transferencia">TRANSFERENCIA</option>
                    <option value="Efectivo">EFECTIVO</option>
                    <option value="Tarjeta">TARJETA</option>
                    <option value="Depósito">DEPÓSITO</option>
                    <option value="Otro">OTRO</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Concepto de Pago</label>
                  <select 
                    className="form-input"
                    value={filters.conceptName}
                    onChange={(e) => setFilters({ ...filters, conceptName: e.target.value })}
                  >
                    <option value="">TODOS LOS CONCEPTOS</option>
                    {uniqueConcepts.map(c => (
                      <option key={c} value={c}>{c.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Estatus de Transacción</label>
                <select 
                  className="form-input"
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                >
                  <option value="">TODOS LOS ESTATUS</option>
                  <option value="pagado">PAGADO / LIQUIDADO</option>
                  <option value="pendiente">PENDIENTE</option>
                  <option value="conciliacion">EN CONCILIACIÓN / ACLARACIÓN</option>
                </select>
              </div>
            </>
          ) : activeTab === 'projects' ? (
            <p style={{ color: '#6b7280', fontSize: '0.85rem' }}>Los proyectos de la bitácora se filtran automáticamente por el rango de fechas de creación seleccionado arriba.</p>
          ) : (
            <>
              {/* Filtros Originales de Reservaciones */}
              <div className="form-group">
                <label>Responsable de Mesa Directiva</label>
                <select 
                  className="form-input"
                  value={filters.technicianId}
                  onChange={(e) => setFilters({ ...filters, technicianId: e.target.value })}
                >
                  <option value="">TODOS LOS RESPONSABLES</option>
                  {technicians.map(tech => (
                    <option key={tech.id} value={tech.id}>{tech.fullName.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              <div className={styles.formGrid}>
                <div className="form-group">
                  <label>Estado</label>
                  <select 
                    className="form-input"
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  >
                    <option value="">TODOS LOS ESTADOS</option>
                    <option value="solicitado">SOLICITADO</option>
                    <option value="confirmado">CONFIRMADO</option>
                    <option value="realizado">REALIZADO</option>
                    <option value="cancelado">CANCELADO</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Cuota</label>
                  <select 
                    className="form-input"
                    value={filters.priority}
                    onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                  >
                    <option value="">TODAS LAS CUOTAS</option>
                    <option value="sin_clasificar">SIN CUOTA</option>
                    <option value="normal">CUOTA DE $1,500</option>
                    <option value="importante">CUOTA ESPECIAL</option>
                  </select>
                </div>
              </div>
            </>
          )}

          <div className={styles.modalFooter}>
            <button className="btn btn-outline" onClick={() => {
              setFilters({
                dateFrom: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
                dateTo: new Date().toISOString().split('T')[0],
                technicianId: '',
                status: '',
                priority: '',
                equipmentId: '',
                residentId: '',
                paymentMethod: '',
                conceptName: ''
              });
            }}>
              Limpiar
            </button>
            <button className="btn btn-primary" onClick={() => setShowFiltersModal(false)}>
              Aplicar Filtros
            </button>
          </div>

        </div>
      </Modal>

    </Layout>
  );
};

export default ReportsPage;