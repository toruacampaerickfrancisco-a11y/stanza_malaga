import { Sequelize } from 'sequelize';

const sequelize = new Sequelize('respaldo-sistema-mantenimiento', 'postgres', 'Bienestar25', {
  host: 'localhost',
  dialect: 'postgres'
});

async function createTicketsTable() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database.');

    // Create ENUM types first
    await sequelize.query("DO $$ BEGIN CREATE TYPE \"enum_tickets_status\" AS ENUM('nuevo', 'en_proceso', 'cerrado', 'pendiente'); EXCEPTION WHEN duplicate_object THEN null; END $$;");
    await sequelize.query("DO $$ BEGIN CREATE TYPE \"enum_tickets_priority\" AS ENUM('sin_clasificar', 'baja', 'media', 'alta', 'critica'); EXCEPTION WHEN duplicate_object THEN null; END $$;");
    await sequelize.query("DO $$ BEGIN CREATE TYPE \"enum_tickets_service_type\" AS ENUM('preventivo', 'correctivo', 'instalacion'); EXCEPTION WHEN duplicate_object THEN null; END $$;");

    // Create tickets table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS tickets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_number VARCHAR(20) NOT NULL UNIQUE,
        title VARCHAR(200) NOT NULL,
        description TEXT NOT NULL,
        status "enum_tickets_status" NOT NULL DEFAULT 'nuevo',
        priority "enum_tickets_priority" NOT NULL DEFAULT 'sin_clasificar',
        service_type "enum_tickets_service_type" NOT NULL DEFAULT 'correctivo',
        reported_by_id UUID NOT NULL REFERENCES users(id),
        assigned_to_id UUID REFERENCES users(id),
        equipment_id UUID REFERENCES equipment(id),
        diagnosis TEXT,
        solution TEXT,
        parts TEXT,
        notes TEXT,
        assigned_at TIMESTAMP WITH TIME ZONE,
        started_at TIMESTAMP WITH TIME ZONE,
        resolved_at TIMESTAMP WITH TIME ZONE,
        estimated_hours DECIMAL(5,2),
        actual_hours DECIMAL(5,2),
        cost DECIMAL(10,2),
        attachments JSON DEFAULT '[]',
        tags JSON DEFAULT '[]',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    console.log('Tickets table created successfully.');
  } catch (error) {
    console.error('Error creating tickets table:', error);
  } finally {
    await sequelize.close();
  }
}

createTicketsTable();