import { sequelize } from '../src/config/database.js';

async function alterEnums() {
  console.log('Iniciando alteración de tipos ENUM en PostgreSQL...');
  
  const typeValues = ['Transferencia', 'Efectivo', 'Tarjeta', 'Depósito', 'Otro'];
  const statusValues = ['en_reparacion', 'en_almacen', 'baja'];
  
  // Alterar enum_equipment_type
  for (const val of typeValues) {
    try {
      console.log(`Intentando agregar valor '${val}' a 'enum_equipment_type'...`);
      await sequelize.query(`ALTER TYPE "enum_equipment_type" ADD VALUE '${val}';`);
      console.log(`✅ Valor '${val}' agregado exitosamente.`);
    } catch (err) {
      if (err.message.includes('already exists') || err.message.includes('ya existe')) {
        console.log(`ℹ️ El valor '${val}' ya existe en 'enum_equipment_type'.`);
      } else {
        console.error(`❌ Error al agregar '${val}' a 'enum_equipment_type':`, err.message);
      }
    }
  }

  // Alterar enum_equipment_status
  for (const val of statusValues) {
    try {
      console.log(`Intentando agregar valor '${val}' a 'enum_equipment_status'...`);
      await sequelize.query(`ALTER TYPE "enum_equipment_status" ADD VALUE '${val}';`);
      console.log(`✅ Valor '${val}' agregado exitosamente.`);
    } catch (err) {
      if (err.message.includes('already exists') || err.message.includes('ya existe')) {
        console.log(`ℹ️ El valor '${val}' ya existe en 'enum_equipment_status'.`);
      } else {
        console.error(`❌ Error al agregar '${val}' a 'enum_equipment_status':`, err.message);
      }
    }
  }

  console.log('Proceso de alteración de ENUMs finalizado.');
  process.exit(0);
}

alterEnums().catch(err => {
  console.error('Error fatal al ejecutar la migración de ENUMs:', err);
  process.exit(1);
});
