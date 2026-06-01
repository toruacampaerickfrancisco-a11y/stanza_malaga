import Insumo from '../models/Insumo.js';
import { Ticket, InventoryMovement } from '../models/index.js';
import { Op } from 'sequelize';

const insumoController = {
  async getAllInsumos(ctx) {
    try {
      const insumos = await Insumo.findAll();
      
      // Enrich with last movement quantities
      const enrichedInsumos = await Promise.all(insumos.map(async (insumo) => {
        const data = insumo.toJSON();
        
        // Get last entry (positive quantity)
        const lastEntry = await InventoryMovement.findOne({
            where: { 
                insumo_id: insumo.id,
                quantity: { [Op.gt]: 0 }
            },
            order: [['createdAt', 'DESC']]
        });

        // Get last exit (negative quantity)
        const lastExit = await InventoryMovement.findOne({
            where: { 
                insumo_id: insumo.id,
                quantity: { [Op.lt]: 0 }
            },
            order: [['createdAt', 'DESC']]
        });

        data.last_entry_quantity = lastEntry ? lastEntry.quantity : null;
        data.last_exit_quantity = lastExit ? Math.abs(lastExit.quantity) : null;
        
        return data;
      }));

      ctx.body = { success: true, data: enrichedInsumos };
    } catch (error) {
      console.error('Error getting insumos:', error);
      ctx.status = 500;
      ctx.body = { success: false, message: 'Error al obtener insumos' };
    }
  },
  async createInsumo(ctx) {
    try {
      const { nombre, descripcion, cantidad, unidad, ubicacion } = ctx.request.body;
      if (!nombre || cantidad === undefined) {
        ctx.status = 400;
        ctx.body = { success: false, message: 'Nombre y cantidad son obligatorios' };
        return;
      }
      const insumo = await Insumo.create({ 
        nombre, 
        descripcion, 
        cantidad, 
        unidad, 
        ubicacion,
        last_entry: new Date() // Primera entrada
      });

      // Log initial inventory
      if (cantidad > 0) {
        await InventoryMovement.create({
          insumo_id: insumo.id,
          user_id: ctx.state.user ? ctx.state.user.id : null,
          quantity: cantidad,
          type: 'INITIAL',
          description: 'Inventario Inicial'
        });
      }

      ctx.status = 201;
      ctx.body = { success: true, data: insumo };
    } catch (error) {
      ctx.status = 500;
      ctx.body = { success: false, message: 'Error al crear insumo' };
    }
  },

  async updateInsumo(ctx) {
    try {
      const { id } = ctx.params;
      const { nombre, descripcion, cantidad, unidad, ubicacion } = ctx.request.body;
      const insumo = await Insumo.findByPk(id);
      if (!insumo) {
        ctx.status = 404;
        ctx.body = { success: false, message: 'Insumo no encontrado' };
        return;
      }

      const updates = { nombre, descripcion, cantidad, unidad, ubicacion };
      
      // Detectar cambios de inventario manuales
      if (cantidad !== undefined && cantidad !== insumo.cantidad) {
        const diff = cantidad - insumo.cantidad;
        if (diff > 0) {
          updates.last_entry = new Date();
        } else {
          updates.last_exit = new Date();
        }

        // Log manual movement
        await InventoryMovement.create({
          insumo_id: insumo.id,
          user_id: ctx.state.user ? ctx.state.user.id : null,
          quantity: diff,
          type: 'MANUAL',
          description: diff > 0 ? 'Ajuste Manual (Entrada)' : 'Ajuste Manual (Salida)'
        });
      }

      await insumo.update(updates);
      ctx.body = { success: true, data: insumo };
    } catch (error) {
      ctx.status = 500;
      ctx.body = { success: false, message: 'Error al actualizar insumo' };
    }
  },

  async getHistory(ctx) {
    try {
      const { id } = ctx.params;
      const insumo = await Insumo.findByPk(id);
      
      if (!insumo) {
        ctx.status = 404;
        ctx.body = { success: false, message: 'Insumo no encontrado' };
        return;
      }

      // 1. Obtener movimientos registrados en la nueva tabla
      const movements = await InventoryMovement.findAll({
        where: { insumo_id: id },
        order: [['createdAt', 'DESC']]
      });

      // Fetch ticket details for movements that reference a ticket
      const ticketIdsToFetch = movements
        .filter(m => m.type === 'TICKET' && m.reference_id)
        .map(m => m.reference_id);
      
      let ticketMap = {};
      if (ticketIdsToFetch.length > 0) {
        const ticketsForMovements = await Ticket.findAll({
            where: { id: ticketIdsToFetch },
            attributes: ['id', 'ticket_number']
        });
        ticketsForMovements.forEach(t => {
            ticketMap[t.id] = t.ticket_number;
        });
      }

      // 2. Obtener historial antiguo basado en tickets (Legacy)
      // Solo buscamos tickets que NO estén ya referenciados en movements para evitar duplicados
      const referencedTicketIds = movements
        .filter(m => m.type === 'TICKET' && m.reference_id)
        .map(m => m.reference_id);

      const tickets = await Ticket.findAll({
        where: {
          parts: {
            [Op.like]: `%${insumo.nombre}%`
          },
          id: { [Op.notIn]: referencedTicketIds } // Excluir ya registrados
        },
        attributes: ['id', 'ticket_number', 'title', 'createdAt', 'parts'],
        order: [['createdAt', 'DESC']]
      });

      // Procesar tickets legacy
      const legacyHistory = tickets.map(t => {
        let quantityUsed = 0;
        try {
          const parts = JSON.parse(t.parts || '[]');
          const insumoNombre = insumo.nombre.trim().toLowerCase();
          const part = parts.find(p => p.nombre && p.nombre.trim().toLowerCase() === insumoNombre);
          
          if (part) {
            quantityUsed = Number(part.cantidad || 0);
          }
        } catch (e) {
          console.error('Error parsing ticket parts:', e);
        }
        return {
          id: `legacy-${t.id}`,
          date: t.createdAt,
          ticketNumber: t.ticket_number,
          ticketTitle: t.title,
          quantity: -quantityUsed, // Uso es negativo
          type: 'TICKET',
          description: 'Uso en Ticket (Legacy)'
        };
      }).filter(h => h.quantity !== 0);

      // Procesar movimientos nuevos
      const movementHistory = movements.map(m => {
        let displayTicketNumber = '-';
        if (m.type === 'TICKET' && m.reference_id) {
            displayTicketNumber = ticketMap[m.reference_id] || `Ref: ${m.reference_id}`;
        }

        return {
          id: m.id,
          date: m.createdAt,
          ticketNumber: displayTicketNumber,
          ticketTitle: m.description,
          quantity: m.quantity,
          type: m.type,
          description: m.description
        };
      });

      // Combinar y ordenar
      const fullHistory = [...movementHistory, ...legacyHistory].sort((a, b) => new Date(b.date) - new Date(a.date));

      ctx.body = { success: true, data: fullHistory };
    } catch (error) {
      console.error('Error getting insumo history:', error);
      ctx.status = 500;
      ctx.body = { success: false, message: 'Error al obtener historial' };
    }
  },

  async deleteInsumo(ctx) {
    try {
      const { id } = ctx.params;
      const insumo = await Insumo.findByPk(id);
      if (!insumo) {
        ctx.status = 404;
        ctx.body = { success: false, message: 'Insumo no encontrado' };
        return;
      }
      await insumo.destroy();
      ctx.body = { success: true, message: 'Insumo eliminado correctamente' };
    } catch (error) {
      ctx.status = 500;
      ctx.body = { success: false, message: 'Error al eliminar insumo' };
    }
  }
};

export default insumoController;
