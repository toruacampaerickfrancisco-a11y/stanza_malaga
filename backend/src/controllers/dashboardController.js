import { Ticket, Equipment, User } from '../models/index.js';
import { Op } from 'sequelize';

const dashboardController = {
  async getStats(ctx) {
    try {
      const user = ctx.state.user || {};
      const role = ((user.rol || user.role) || '').toString().toLowerCase().trim();
      const isRestricted = ['usuario', 'user', 'inventario', 'residente'].includes(role);

      // Aplicar RBAC: Los residentes solo ven sus propios registros en el resumen
      const where = isRestricted ? { reported_by_id: user.id } : {};

      // Tickets stats
      const totalTickets = await Ticket.count({ where });
      const openTickets = await Ticket.count({ where: { ...where, status: 'solicitado' } });
      const pendingTickets = await Ticket.count({ where: { ...where, status: 'confirmado' } });
      // Usar solo los valores válidos del enum en la base de datos (español)
      const inProgressTickets = await Ticket.count({ where: { ...where, status: 'realizado' } });
      const closedTickets = await Ticket.count({ where: { ...where, status: 'cancelado' } });

      // Equipment stats
      const totalEquipment = await Equipment.count();
      const operationalEquipment = await Equipment.count({ where: { status: 'operativo' } }); // Assuming 'operativo' maps to operational
      const equipmentInRepair = await Equipment.count({ where: { status: 'maintenance' } });

      // User stats
      const totalUsers = await User.count();
      const activeUsers = await User.count({ where: { activo: true } });

      // Recent Tickets (intentar y en fallo devolver lista vacía)
      let formattedRecentTickets = [];
      try {
        const recentTickets = await Ticket.findAll({
          where,
          limit: 3,
          order: [['createdAt', 'DESC']],
          include: [
            { model: User, as: 'reportedBy', attributes: ['nombre_completo'] }
          ]
        });

        formattedRecentTickets = recentTickets.map(t => ({
          id: t.id,
          ticketNumber: t.ticket_number || `TKT-${t.id.toString().padStart(5, '0')}`,
          title: t.title,
          status: t.status,
          priority: t.priority,
          createdAt: t.createdAt,
          reportedBy: t.reportedBy ? t.reportedBy.nombre_completo : 'Usuario'
        }));
      } catch (err) {
        console.error('Error fetching recent tickets for dashboard:', err);
        formattedRecentTickets = [];
      }

      console.log('Enviando tickets recientes al dashboard:', formattedRecentTickets.length);

      ctx.body = {
        success: true,
        data: {
          totalTickets,
          openTickets,
          pendingTickets,
          inProgressTickets,
          closedTickets,
          totalEquipment,
          operationalEquipment,
          equipmentInRepair,
          totalUsers,
          activeUsers,
          recentTickets: formattedRecentTickets
        }
      };
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      ctx.status = 500;
      // Intentar extraer detalles del error de Sequelize
      const details = {};
      try {
        details.message = error.message;
        details.original = error.original && (error.original.message || error.original.detail || String(error.original));
        details.parent = error.parent && (error.parent.message || error.parent.detail || String(error.parent));
        details.sql = error.sql || error.sqlQuery || null;
      } catch (e) {}

      // No exponer detalles internos en la respuesta en ningún caso aquí
      ctx.body = {
        success: false,
        message: 'Error al obtener estadísticas del dashboard'
      };
    }
  }
};

export default dashboardController;
