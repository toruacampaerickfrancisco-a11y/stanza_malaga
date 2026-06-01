import { Sequelize } from 'sequelize';

// Configuración directa para coincidir con config/config.json (PostgreSQL)
const sequelize = new Sequelize('respaldo-sistema-mantenimiento', 'postgres', 'Erick1093', {
  host: 'localhost',
  dialect: 'postgres',
  logging: console.log
});

async function syncMigrations() {
  try {
    await sequelize.authenticate();
    console.log('Connected to PostgreSQL (sistema-mantenimiento).');

    // Create SequelizeMeta table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "SequelizeMeta" (
        "name" VARCHAR(255) NOT NULL,
        PRIMARY KEY ("name")
      );
    `);
    console.log('SequelizeMeta table created.');

    // Insert migrations
    const migrations = [
      '20251113000100-create-users.cjs',
      '20251113000200-create-equipment.cjs',
      '20251114000100-add-requirement-to-equipment.cjs'
    ];

    for (const migration of migrations) {
      try {
        await sequelize.query(`INSERT INTO "SequelizeMeta" (name) VALUES ('${migration}')`);
        console.log(`Inserted ${migration}`);
      } catch (e) {
        // Check for unique constraint error (Postgres code 23505)
        if (e.original && e.original.code === '23505') {
             console.log(`${migration} already exists.`);
        } else if (e.name === 'SequelizeUniqueConstraintError') {
          console.log(`${migration} already exists.`);
        } else {
          console.error(`Error inserting ${migration}:`, e);
        }
      }
    }

  } catch (e) {
    console.error(e);
  } finally {
    await sequelize.close();
  }
}

syncMigrations();
