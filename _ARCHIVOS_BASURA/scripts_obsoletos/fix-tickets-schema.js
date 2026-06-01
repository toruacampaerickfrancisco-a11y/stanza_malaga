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

async function fixTicketsSchema() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a la BD.');

    const queryInterface = sequelize.getQueryInterface();
    const tableInfo = await queryInterface.describeTable('tickets');

    // 1. Rename id to ticket_number if it's text and looks like a ticket number
    if (tableInfo.id && tableInfo.id.type !== 'UUID') {
      console.log('🔧 Renombrando id a ticket_number...');
      await sequelize.query('ALTER TABLE tickets RENAME COLUMN id TO ticket_number;');
    }

    // 2. Add new UUID ID column
    // Re-check table info after rename
    const updatedTableInfo = await queryInterface.describeTable('tickets');
    if (!updatedTableInfo.id) {
      console.log('🔧 Agregando columna ID (UUID)...');
      await sequelize.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
      await sequelize.query('ALTER TABLE tickets ADD COLUMN id UUID DEFAULT gen_random_uuid() PRIMARY KEY;');
    }

    // 3. Add and populate reported_by_id
    if (!updatedTableInfo.reported_by_id) {
      console.log('🔧 Agregando reported_by_id...');
      await sequelize.query('ALTER TABLE tickets ADD COLUMN reported_by_id UUID REFERENCES users(id);');
      
      console.log('🔧 Migrando reported_by_id desde userId (numero_empleado)...');
      // Assuming userId column exists and contains numero_empleado
      // We need to check if userId column exists, it might be case sensitive "userId"
      try {
        await sequelize.query(`
          UPDATE tickets 
          SET reported_by_id = users.id 
          FROM users 
          WHERE tickets."userId" = users.numero_empleado;
        `);
      } catch (e) {
        console.log('⚠️ Error actualizando reported_by_id (quizás la columna userId no existe o se llama diferente):', e.message);
      }
    }

    // 4. Add and populate equipment_id
    if (!updatedTableInfo.equipment_id) {
      console.log('🔧 Agregando equipment_id...');
      await sequelize.query('ALTER TABLE tickets ADD COLUMN equipment_id UUID REFERENCES equipment(id);');
      
      console.log('🔧 Migrando equipment_id desde equipmentId (serial_number)...');
      try {
        await sequelize.query(`
          UPDATE tickets 
          SET equipment_id = equipment.id 
          FROM equipment 
          WHERE tickets."equipmentId" = equipment.serial_number;
        `);
      } catch (e) {
        console.log('⚠️ Error actualizando equipment_id:', e.message);
      }
    }

    // 5. Add other missing columns
    const missingColumns = [
      { name: 'title', type: 'VARCHAR(200)', default: "'Ticket de Mantenimiento'" },
      { name: 'description', type: 'TEXT' },
      { name: 'priority', type: 'VARCHAR(20)', default: "'medium'" },
      { name: 'assigned_to_id', type: 'UUID REFERENCES users(id)' },
      { name: 'created_at', type: 'TIMESTAMP WITH TIME ZONE', default: 'NOW()' },
      { name: 'updated_at', type: 'TIMESTAMP WITH TIME ZONE', default: 'NOW()' },
      { name: 'resolved_at', type: 'TIMESTAMP WITH TIME ZONE' },
      { name: 'closed_at', type: 'TIMESTAMP WITH TIME ZONE' }
    ];

    for (const col of missingColumns) {
      // Check if column exists (using lowercase check because describeTable returns lowercase keys)
      if (!updatedTableInfo[col.name]) {
        console.log(`🔧 Agregando columna ${col.name}...`);
        let query = `ALTER TABLE tickets ADD COLUMN ${col.name} ${col.type}`;
        if (col.default) query += ` DEFAULT ${col.default}`;
        await sequelize.query(query + ';');
      }
    }

    // 6. Migrate data to new columns
    console.log('🔧 Migrando datos a nuevas columnas...');
    
    // observations -> description
    await sequelize.query('UPDATE tickets SET description = observations WHERE description IS NULL;');
    
    // serviceType -> title (optional, append to title)
    await sequelize.query(`UPDATE tickets SET title = "serviceType" || ' - ' || title WHERE "serviceType" IS NOT NULL AND title = 'Ticket de Mantenimiento';`);

    // 7. Fix Status values
    console.log('🔧 Normalizando estados...');
    await sequelize.query("UPDATE tickets SET status = 'in_progress' WHERE status = 'en_proceso';");
    await sequelize.query("UPDATE tickets SET status = 'closed' WHERE status = 'cerrado';");
    // Default status if null
    await sequelize.query("UPDATE tickets SET status = 'nuevo' WHERE status IS NULL;");

    console.log('✅ Esquema de tickets actualizado correctamente.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
  }
}

fixTicketsSchema();
