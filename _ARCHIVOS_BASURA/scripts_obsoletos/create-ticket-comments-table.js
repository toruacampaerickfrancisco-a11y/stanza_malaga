import { Sequelize } from 'sequelize';
import config from './src/config/config.js';

const sequelize = new Sequelize(
  config.database.database,
  config.database.username,
  config.database.password,
  {
    host: config.database.host,
    port: config.database.port,
    dialect: 'postgres',
    logging: console.log
  }
);

async function createTicketCommentsTable() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a la BD.');

    console.log('🔧 Verificando tabla ticket_comments...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS ticket_comments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
        created_by_id UUID NOT NULL REFERENCES users(id),
        comment TEXT NOT NULL,
        is_internal BOOLEAN DEFAULT false,
        attachments JSON DEFAULT '[]',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    console.log('✅ Tabla ticket_comments creada correctamente.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
  }
}

createTicketCommentsTable();
