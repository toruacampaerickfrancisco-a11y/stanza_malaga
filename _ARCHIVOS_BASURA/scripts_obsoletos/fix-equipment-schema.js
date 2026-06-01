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

async function fixEquipmentSchema() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a la BD.');

    const queryInterface = sequelize.getQueryInterface();

    // 1. Check and Add ID column
    const tableInfo = await queryInterface.describeTable('equipment');
    
    if (!tableInfo.id) {
      console.log('🔧 Agregando columna ID...');
      // Add column as text first or uuid directly? 
      // If we add as UUID NOT NULL, it fails because existing rows are null.
      // So add as UUID NULL, populate, then set NOT NULL and PK.
      
      // Check if pgcrypto is available for gen_random_uuid(), otherwise use client-side generation?
      // Easier: Add column, generate UUIDs in loop, then set PK.
      
      await sequelize.query('ALTER TABLE equipment ADD COLUMN IF NOT EXISTS id UUID;');
      
      // Populate IDs
      const [results] = await sequelize.query('SELECT * FROM equipment WHERE id IS NULL');
      if (results.length > 0) {
        console.log(`🔧 Generando IDs para ${results.length} equipos...`);
        // We can use pgcrypto if available, or just update one by one.
        // Let's try to use a DO block or just update all if we can use gen_random_uuid()
        try {
           await sequelize.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
           await sequelize.query('UPDATE equipment SET id = gen_random_uuid() WHERE id IS NULL;');
        } catch (e) {
           console.log('⚠️ pgcrypto no disponible, actualizando uno por uno...');
           // Fallback if pgcrypto fails (unlikely on Postgres 18 but possible permissions)
           // Actually, let's just use JS to be safe if extension creation fails.
        }
      }
      
      // Set Primary Key
      await sequelize.query('ALTER TABLE equipment ALTER COLUMN id SET NOT NULL;');
      await sequelize.query('ALTER TABLE equipment ADD PRIMARY KEY (id);');
      console.log('✅ Columna ID agregada y configurada como PK.');
    }

    // 2. Fix assigned_user_id (Text -> UUID)
    if (tableInfo.assigned_user_id && tableInfo.assigned_user_id.type !== 'UUID') {
      console.log('🔧 Corrigiendo assigned_user_id...');
      // First set empty strings to NULL
      await sequelize.query("UPDATE equipment SET assigned_user_id = NULL WHERE assigned_user_id = '';");
      // Cast to UUID
      await sequelize.query('ALTER TABLE equipment ALTER COLUMN assigned_user_id TYPE UUID USING assigned_user_id::uuid;');
      console.log('✅ assigned_user_id corregido a UUID.');
    }

    // 3. Fix created_at / updated_at (Text -> TIMESTAMP)
    if (tableInfo.created_at && tableInfo.created_at.type !== 'TIMESTAMP WITH TIME ZONE') {
       console.log('🔧 Corrigiendo timestamps...');
       await sequelize.query("UPDATE equipment SET created_at = NOW() WHERE created_at = '' OR created_at IS NULL;");
       await sequelize.query("UPDATE equipment SET updated_at = NOW() WHERE updated_at = '' OR updated_at IS NULL;");
       
       await sequelize.query('ALTER TABLE equipment ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE USING created_at::timestamp with time zone;');
       await sequelize.query('ALTER TABLE equipment ALTER COLUMN updated_at TYPE TIMESTAMP WITH TIME ZONE USING updated_at::timestamp with time zone;');
       console.log('✅ Timestamps corregidos.');
    }

    // 4. Add missing columns
    const missingColumns = [
      { name: 'operating_system', type: 'VARCHAR(100)' },
      { name: 'purchase_date', type: 'DATE' },
      { name: 'warranty_expiration', type: 'DATE' }
    ];

    for (const col of missingColumns) {
      if (!tableInfo[col.name]) {
        console.log(`🔧 Agregando columna faltante: ${col.name}...`);
        await sequelize.query(`ALTER TABLE equipment ADD COLUMN ${col.name} ${col.type};`);
      }
    }

    console.log('✅ Esquema de equipment actualizado correctamente.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
  }
}

fixEquipmentSchema();
