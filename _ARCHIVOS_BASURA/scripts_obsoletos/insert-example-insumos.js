// Script para insertar insumos de ejemplo en la tabla 'insumos'
import { Sequelize } from 'sequelize';

const sequelize = new Sequelize({
  dialect: 'postgres',
  host: 'localhost',
  port: 5432,
  database: 'respaldo-sistema-mantenimiento',
  username: 'postgres',
  password: 'Erick1093', // Contraseña actualizada según usuario
  logging: false,
});

const Insumo = sequelize.define('insumos', {
  nombre: Sequelize.STRING,
  descripcion: Sequelize.STRING,
  cantidad: Sequelize.INTEGER,
  unidad: Sequelize.STRING,
  ubicacion: Sequelize.STRING,
  created_at: Sequelize.DATE,
  updated_at: Sequelize.DATE,
}, {
  tableName: 'insumos',
  timestamps: false,
});

async function insertExamples() {
  await sequelize.authenticate();
  await Insumo.bulkCreate([
    {
      nombre: 'Guantes de seguridad',
      descripcion: 'Guantes resistentes para trabajos eléctricos',
      cantidad: 50,
      unidad: 'pares',
      ubicacion: 'Almacén A',
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      nombre: 'Cinta aislante',
      descripcion: 'Cinta para aislamiento eléctrico',
      cantidad: 200,
      unidad: 'rollos',
      ubicacion: 'Almacén B',
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      nombre: 'Destornillador',
      descripcion: 'Herramienta manual',
      cantidad: 30,
      unidad: 'unidades',
      ubicacion: 'Taller',
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      nombre: 'Multímetro',
      descripcion: 'Instrumento de medición eléctrica',
      cantidad: 10,
      unidad: 'unidades',
      ubicacion: 'Laboratorio',
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      nombre: 'Cable de cobre',
      descripcion: 'Cable para instalaciones eléctricas',
      cantidad: 100,
      unidad: 'metros',
      ubicacion: 'Almacén C',
      created_at: new Date(),
      updated_at: new Date(),
    },
  ]);
  console.log('Insumos de ejemplo insertados correctamente.');
  await sequelize.close();
}

insertExamples().catch(e => {
  console.error('Error al insertar insumos de ejemplo:', e);
  process.exit(1);
});