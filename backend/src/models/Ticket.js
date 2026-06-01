import { DataTypes, Model, Op } from 'sequelize';
import { sequelize } from '../config/database.js';

class Ticket extends Model {
  // Método para generar número de reserva automático
  static async generateTicketNumber() {
    const year = new Date().getFullYear();
    const lastTicket = await Ticket.findOne({
      where: {
        ticket_number: {
          [Op.like]: `RES/%/${year}`
        }
      },
      order: [['ticket_number', 'DESC']]
    });

    let nextSequence = 1;
    if (lastTicket) {
      const parts = lastTicket.ticket_number.split('/');
      if (parts.length === 3) {
        const lastSequence = parseInt(parts[1], 10);
        if (!isNaN(lastSequence)) {
          nextSequence = lastSequence + 1;
        }
      }
    }
    
    const nextNumber = nextSequence.toString().padStart(4, '0');
    return `RES/${nextNumber}/${year}`;
  }

  // Método para calcular tiempo de resolución
  getResolutionTime() {
    if (!this.resolved_at || !this.created_at) return null;
    const diffTime = new Date(this.resolved_at) - new Date(this.created_at);
    return Math.ceil(diffTime / (1000 * 60 * 60)); // en horas
  }

  // Método para verificar si está vencido (más de 24h sin confirmar)
  isOverdue() {
    if (this.status !== 'solicitado') return false;
    const diffTime = new Date() - new Date(this.created_at);
    const hours = diffTime / (1000 * 60 * 60);
    return hours > 24;
  }

  // Método para serializar datos públicos
  toPublicJSON() {
    return {
      id: this.id,
      ticketNumber: this.ticket_number,
      title: this.title,
      description: this.description,
      status: this.status,
      priority: this.priority,
      serviceType: this.service_type,
      reportedById: this.reported_by_id,
      assignedToId: this.assigned_to_id,
      equipmentId: this.equipment_id,
      diagnosis: this.diagnosis,
      solution: this.solution,
      parts: this.parts, // El getter se encarga de parsear
      assignedAt: this.assigned_at,
      startedAt: this.started_at,
      resolvedAt: this.resolved_at,
      estimatedHours: this.estimated_hours,
      actualHours: this.actual_hours,
      cost: this.cost,
      attachments: this.attachments, // El getter se encarga de parsear
      tags: this.tags, // El getter se encarga de parsear
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      reportedBy: this.reportedBy && typeof this.reportedBy.toPublicJSON === 'function' ? this.reportedBy.toPublicJSON() : this.reportedBy,
      assignedTo: this.assignedTo && typeof this.assignedTo.toPublicJSON === 'function' ? this.assignedTo.toPublicJSON() : this.assignedTo,
      equipment: this.equipment,
      resolutionTime: this.getResolutionTime(),
      isOverdue: this.isOverdue(),
      notes: this.notes,
      eventDate: this.event_date,
      eventTime: this.event_time,
      eventDuration: this.event_duration
    };
  }

  // Asociaciones estáticas
  static associate(models) {
    // Un ticket pertenece a un usuario que lo reportó
    Ticket.belongsTo(models.User, {
      foreignKey: 'reported_by_id',
      as: 'reportedBy'
    });

    // Un ticket puede estar asignado a un técnico
    Ticket.belongsTo(models.User, {
      foreignKey: 'assigned_to_id',
      as: 'assignedTo',
      allowNull: true
    });

    // Un ticket puede estar relacionado con un equipo
    Ticket.belongsTo(models.Equipment, {
      foreignKey: 'equipment_id',
      as: 'equipment',
      allowNull: true
    });

    // Un ticket puede tener muchos comentarios
    Ticket.hasMany(models.TicketComment, {
      foreignKey: 'ticket_id',
      as: 'comments'
    });
  }
}

// Definir el modelo
Ticket.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  ticket_number: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [5, 200]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [3, 2000]
    }
  },
  status: {
    type: DataTypes.ENUM('solicitado', 'confirmado', 'realizado', 'cancelado'),
    allowNull: false,
    defaultValue: 'solicitado'
  },
  priority: {
    type: DataTypes.ENUM('sin_clasificar', 'normal', 'importante', 'urgente', 'vip'),
    allowNull: false,
    defaultValue: 'sin_clasificar'
  },
  service_type: {
    type: DataTypes.ENUM('social', 'corporativo', 'educativo'),
    allowNull: false,
    defaultValue: 'social'
  },
  reported_by_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  assigned_to_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  equipment_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'equipment',
      key: 'id'
    }
  },
  diagnosis: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  solution: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  parts: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: '[]',
    get() {
      const value = this.getDataValue('parts');
      if (!value) return [];
      try {
        return JSON.parse(value);
      } catch (e) {
        return [];
      }
    },
    set(value) {
      if (Array.isArray(value)) {
        this.setDataValue('parts', JSON.stringify(value));
      } else if (typeof value === 'string') {
        this.setDataValue('parts', value);
      } else {
        this.setDataValue('parts', '[]');
      }
    }
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  assigned_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  started_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  resolved_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  estimated_hours: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 168 // máximo una semana
    }
  },
  actual_hours: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    validate: {
      min: 0
    }
  },
  cost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: {
      min: 0
    }
  },
  attachments: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: '[]',
    get() {
      const value = this.getDataValue('attachments');
      if (!value) return [];
      try {
        return JSON.parse(value);
      } catch (e) {
        return [];
      }
    },
    set(value) {
      if (Array.isArray(value)) {
        this.setDataValue('attachments', JSON.stringify(value));
      } else if (typeof value === 'string') {
        this.setDataValue('attachments', value);
      } else {
        this.setDataValue('attachments', '[]');
      }
    }
  },
  tags: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: '[]',
    get() {
      const value = this.getDataValue('tags');
      if (!value) return [];
      try {
        return JSON.parse(value);
      } catch (e) {
        return [];
      }
    },
    set(value) {
      if (Array.isArray(value)) {
        this.setDataValue('tags', JSON.stringify(value));
      } else if (typeof value === 'string') {
        this.setDataValue('tags', value);
      } else {
        this.setDataValue('tags', '[]');
      }
    }
  },
  event_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  event_time: {
    type: DataTypes.STRING(5),
    allowNull: true
  },
  event_duration: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 5
  }
}, {
  sequelize,
  modelName: 'Ticket',
  tableName: 'tickets',
  hooks: {
    // Hook para generar número de ticket
    beforeCreate: async (ticket) => {
      if (!ticket.ticket_number) {
        ticket.ticket_number = await Ticket.generateTicketNumber();
      }
    },
    // Hook para actualizar fechas según status
    beforeUpdate: async (ticket) => {
      if (ticket.changed('assigned_to_id') && ticket.assigned_to_id) {
        ticket.assigned_at = new Date();
      }
      if (ticket.changed('status')) {
        if (ticket.status === 'confirmado' && !ticket.started_at) {
          ticket.started_at = new Date();
        }
        if (ticket.status === 'realizado' && !ticket.resolved_at) {
          ticket.resolved_at = new Date();
        }
      }
    }
  },
  indexes: [
    {
      unique: true,
      fields: ['ticket_number']
    },
    {
      fields: ['status']
    },
    {
      fields: ['priority']
    },
    {
      fields: ['service_type']
    },
    {
      fields: ['reported_by_id']
    },
    {
      fields: ['assigned_to_id']
    },
    {
      fields: ['equipment_id']
    },
    {
      fields: ['created_at']
    }
  ]
});

export default Ticket;