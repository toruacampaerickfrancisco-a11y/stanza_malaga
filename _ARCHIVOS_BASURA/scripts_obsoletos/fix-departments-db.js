import { Sequelize, QueryTypes } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'respaldo-sistema-mantenimiento',
  'postgres',
  'Bienestar25',
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'postgres',
    logging: false
  }
);

async function fixDepartmentsDb() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a la base de datos.');

    // 1. Crear tabla de departamentos si no existe
    console.log('Creating departments table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        display_name VARCHAR(200) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('✅ Tabla departments verificada/creada.');

    // 2. Agregar columna department_id a la tabla users si no existe
    console.log('Checking for department_id column in users table...');
    const columns = await sequelize.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'department_id'",
      { type: QueryTypes.SELECT }
    );

    if (columns.length === 0) {
      console.log('Adding department_id column to users table...');
      await sequelize.query(`
        ALTER TABLE users 
        ADD COLUMN department_id UUID REFERENCES departments(id) ON DELETE SET NULL;
      `);
      console.log('✅ Columna department_id agregada a la tabla users.');
    } else {
      console.log('ℹ️ La columna department_id ya existe en la tabla users.');
    }

    // 3. Insertar algunos departamentos por defecto si la tabla está vacía
    const deptCount = await sequelize.query("SELECT COUNT(*) FROM departments", { type: QueryTypes.SELECT });
    if (parseInt(deptCount[0].count) === 0) {
      console.log('Inserting default departments...');
      const defaultDepts = ['Sistemas', 'Recursos Humanos', 'Administración', 'Contabilidad', 'Dirección General'];
      for (const dept of defaultDepts) {
        await sequelize.query(`INSERT INTO departments (display_name) VALUES ('${dept}')`);
      }
      console.log('✅ Departamentos por defecto insertados.');
    }

    console.log('🚀 Proceso finalizado con éxito.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al actualizar la base de datos:', error);
    process.exit(1);
  }
}

fixDepartmentsDb();
