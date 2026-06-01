import { Activity, ActivityParticipant, ActivityComment, User, Ticket } from '../models/index.js';
import { Op } from 'sequelize';

export const listActivities = async (ctx) => {
  try {
    const { status, priority, visibility, from_date, to_date } = ctx.query;
    const userRole = ctx.state.user.rol;
    const userId = ctx.state.user.id;

    const where = {};

    // Filtros básicos
    if (status) where.status = status;
    if (priority) where.priority = priority;
    
    // Filtro de visibilidad
    if (visibility) {
      where.visibility = visibility;
    } else {
        // Lógica de visibilidad por rol
        // Admin y técnicos ven 'team' y 'public'.
        // 'private' solo si son el creador or participante
        
        where[Op.or] = [
            { visibility: { [Op.in]: ['team', 'public'] } },
            { 
               [Op.and]: [
                   { visibility: 'private' },
                   { created_by: userId } 
               ] 
            }
        ];
    }
    
    // Filtro fechas
    if (from_date || to_date) {
        where.createdAt = {};
        if (from_date) where.createdAt[Op.gte] = new Date(from_date);
        if (to_date) where.createdAt[Op.lte] = new Date(to_date);
    }

    const activities = await Activity.findAll({
      where,
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'nombre_completo', 'usuario', 'rol']
        },
        {
          model: ActivityParticipant,
          as: 'participants',
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'nombre_completo', 'usuario']
          }]
        },
        {
          model: Ticket,
          as: 'ticket',
          attributes: ['id', 'ticket_number', 'title']
        },
        {
            model: ActivityComment,
            as: 'comments',
            limit: 5, // Solo traer los últimos 5 para la vista de lista/tablero
            order: [['createdAt', 'DESC']],
            include: [{
                model: User,
                as: 'author',
                attributes: ['id', 'nombre_completo']
            }]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    ctx.body = {
      success: true,
      data: activities
    };
  } catch (error) {
    console.error('Error al listar actividades:', error);
    ctx.status = 500;
    ctx.body = { success: false, message: 'Error al obtener actividades' };
  }
};

export const createActivity = async (ctx) => {
  try {
    const { title, description, status, priority, start_date, due_date, visibility, participants, ticket_id } = ctx.request.body;
    const userId = ctx.state.user.id;

    const activity = await Activity.create({
      title,
      description,
      status: status || 'todo',
      priority: priority || 'normal',
      start_date,
      due_date,
      visibility: visibility || 'team',
      created_by: userId,
      ticket_id: ticket_id || null
    });

    // Añadir participantes si existen
    if (participants && Array.isArray(participants)) {
      const participantData = participants.map(p => ({
        activity_id: activity.id,
        user_id: p.user_id,
        role: p.role || 'collaborator'
      }));
      // Añadir al creador como owner si no está en la lista
      if (!participants.find(p => p.user_id === userId)) {
        participantData.push({ activity_id: activity.id, user_id: userId, role: 'owner' });
      }
      
      await ActivityParticipant.bulkCreate(participantData);
    } else {
      // Por defecto el creador es participante owner
      await ActivityParticipant.create({
        activity_id: activity.id,
        user_id: userId,
        role: 'owner'
      });
    }

    // Recargar con relaciones
    const fullActivity = await Activity.findByPk(activity.id, {
        include: [
            { model: User, as: 'creator', attributes: ['id', 'nombre_completo'] },
            { model: ActivityParticipant, as: 'participants', include: [{ model: User, as: 'user', attributes: ['id', 'nombre_completo'] }] }
        ]
    });

    ctx.body = {
      success: true,
      data: fullActivity,
      message: 'Actividad creada correctamente'
    };
  } catch (error) {
    console.error('Error al crear actividad:', error);
    ctx.status = 500;
    ctx.body = { success: false, message: 'Error al crear la actividad' };
  }
};

export const updateActivity = async (ctx) => {
    try {
        const { id } = ctx.params;
        const updateData = ctx.request.body;
        
        const activity = await Activity.findByPk(id);
        if (!activity) {
            ctx.status = 404;
            ctx.body = { success: false, message: 'Actividad no encontrada' };
            return;
        }

        await activity.update(updateData);

        ctx.body = {
            success: true,
            data: activity,
            message: 'Actividad actualizada'
        };

    } catch (error) {
        console.error('Error al actualizar actividad:', error);
        ctx.status = 500;
        ctx.body = { success: false, message: 'Error interno' };
    }
};

export const deleteActivity = async (ctx) => {
    try {
        const { id } = ctx.params;
        const activity = await Activity.findByPk(id);
        
        if (!activity) {
            ctx.status = 404;
            ctx.body = { success: false, message: 'Actividad no encontrada' };
            return;
        }

        await activity.destroy();
        ctx.body = { success: true, message: 'Actividad eliminada' };

    } catch (error) {
        console.error('Error al eliminar actividad:', error);
        ctx.status = 500;
        ctx.body = { success: false, message: 'Error interno' };
    }
};

export const addComment = async (ctx) => {
    try {
        const { id } = ctx.params; // activityId
        const { content } = ctx.request.body;
        const userId = ctx.state.user.id;

        const comment = await ActivityComment.create({
            activity_id: id,
            user_id: userId,
            content
        });
        
        const fullComment = await ActivityComment.findByPk(comment.id, {
            include: [{ model: User, as: 'author', attributes: ['id', 'nombre_completo', 'usuario'] }]
        });

        ctx.body = { success: true, data: fullComment };

    } catch (error) {
        console.error('Error comentando:', error);
        ctx.status = 500;
        ctx.body = { success: false, message: 'Error al agregar comentario' };
    }
};
