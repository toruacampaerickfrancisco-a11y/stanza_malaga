import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

export const config = {
  // Configuración del servidor
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || '0.0.0.0',
    env: process.env.NODE_ENV || 'development'
  },

  // Configuración de la base de datos
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'mantenimiento_erp',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    // Por defecto en desarrollo usar SQLite para facilitar ejecución local
    dialect: process.env.DB_DIALECT || (process.env.NODE_ENV === 'development' ? 'sqlite' : 'postgres'),
    // Ruta de almacenamiento para SQLite (si aplica)
    storage: process.env.DB_STORAGE || './database.sqlite',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: true,
      underscored: true,
      underscoredAll: true
    }
  },

  // Configuración JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'secreto-super-seguro-para-desarrollo-2025',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    issuer: 'Sistema de Gestión Stanza Malaga',
    audience: 'Residencial Stanza Malaga Seccion Almeria'
  },

  // Configuración de CORS
  cors: {
    origin: '*', // Permitir todo en desarrollo para evitar problemas de conexión
    credentials: true,
    optionsSuccessStatus: 200
  },

  // Configuración de archivos
  upload: {
    maxFileSize: process.env.MAX_FILE_SIZE || '10mb',
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword'],
    uploadPath: process.env.UPLOAD_PATH || './uploads'
  },

  // Configuración de logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'combined'
  }
};

export default config;