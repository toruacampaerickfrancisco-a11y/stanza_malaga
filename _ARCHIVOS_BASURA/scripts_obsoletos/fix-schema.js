import { sequelize } from './src/config/database.js';

async function fixSchema() {
  try {
    console.log('🔄 Reparando tabla tickets...');
    
    // Agregar columna service_type si no existe
    await sequelize.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'service_type') THEN 
          ALTER TABLE tickets ADD COLUMN service_type VARCHAR(50) DEFAULT 'correctivo'; 
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'attachments') THEN 
          ALTER TABLE tickets ADD COLUMN attachments JSONB DEFAULT '[]'; 
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'tags') THEN 
          ALTER TABLE tickets ADD COLUMN tags JSONB DEFAULT '[]'; 
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'diagnosis') THEN 
          ALTER TABLE tickets ADD COLUMN diagnosis TEXT; 
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'solution') THEN 
          ALTER TABLE tickets ADD COLUMN solution TEXT; 
        END IF;
         IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'cost') THEN 
          ALTER TABLE tickets ADD COLUMN cost DECIMAL(10, 2); 
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'assigned_at') THEN 
          ALTER TABLE tickets ADD COLUMN assigned_at TIMESTAMP WITH TIME ZONE; 
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'started_at') THEN 
          ALTER TABLE tickets ADD COLUMN started_at TIMESTAMP WITH TIME ZONE; 
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'estimated_hours') THEN 
          ALTER TABLE tickets ADD COLUMN estimated_hours INTEGER; 
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'actual_hours') THEN 
          ALTER TABLE tickets ADD COLUMN actual_hours INTEGER; 
        END IF;
      END $$;
    `);

    const [results] = await sequelize.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'tickets'");
    console.log('Columnas actuales en tickets:', results.map(r => r.column_name).join(', '));

    console.log('✅ Esquema de tickets reparado.');
  } catch (error) {
    console.error('❌ Error al reparar esquema:', error);
  } finally {
    await sequelize.close();
  }
}

fixSchema();
