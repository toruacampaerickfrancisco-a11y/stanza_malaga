import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

class Equipment extends Model {
  // Método para serializar datos públicos con nombres esperados por el frontend
  toPublicJSON() {
    const {
      id,
      name,
      type,
      brand,
      model,
      serial_number,
      inventory_number,
      processor,
      ram,
      hard_drive,
      operating_system,
      description,
      status,
      location,
      notes,
      requirement,
      assigned_user_id,
      purchase_date,
      warranty_expiration,
      created_at,
      updated_at,
      assignedUser,
      ...rest
    } = this.dataValues;

    return {
      id,
      name,
      type,
      brand,
      model,
      serialNumber: serial_number,
      inventoryNumber: inventory_number,
      processor,
      ram,
      hardDrive: hard_drive,
      operatingSystem: operating_system,
      description,
      status,
      location,
      notes,
      requirement,
      assignedUserId: assigned_user_id,
      purchaseDate: purchase_date,
      warrantyExpiration: warranty_expiration,
      createdAt: created_at,
      updatedAt: updated_at,
      assignedUser: assignedUser ? (typeof assignedUser.toPublicJSON === 'function' ? assignedUser.toPublicJSON() : assignedUser) : null,
      ...rest
    };
  }

  static associate(models) {
    Equipment.belongsTo(models.User, {
      foreignKey: 'assigned_user_id',
      as: 'assignedUser',
      allowNull: true
    });
    Equipment.hasMany(models.Ticket, {
      foreignKey: 'equipment_id',
      as: 'tickets'
    });
  }
}

Equipment.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('desktop', 'laptop', 'printer', 'server', 'monitor', 'tv', 'phone', 'telefono', 'tablet', 'computadora', 'impresora', 'celular', 'otro', 'other', 'Transferencia', 'Efectivo', 'Tarjeta', 'Depósito', 'Otro'),
    allowNull: false
  },
  brand: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  model: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  serial_number: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  inventory_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  processor: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  ram: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  hard_drive: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  operating_system: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('available', 'assigned', 'maintenance', 'retired', 'operativo', 'en_reparacion', 'en_almacen', 'baja'),
    allowNull: false
  },
  location: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  purchase_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  warranty_expiration: {
    type: DataTypes.DATE,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  requirement: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  assigned_user_id: {
    type: DataTypes.UUID,
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'Equipment',
  tableName: 'equipment',
  timestamps: true,
  underscored: true
});

export default Equipment;