import { Equipment } from '../../src/models/index.js';

const VALID_TYPES = ['desktop', 'laptop', 'printer', 'server', 'monitor', 'other'];
const VALID_STATUSES = ['available', 'assigned', 'maintenance', 'retired'];

async function checkEnumValues() {
  console.log('🔎 Buscando valores inválidos en la tabla de Equipos...');
  
  let invalidCount = 0;
  try {
    const equipments = await Equipment.findAll();
    
    for (const equipment of equipments) {
      const { id, type, status, serial_number } = equipment;
      const isTypeValid = VALID_TYPES.includes(type);
      const isStatusValid = VALID_STATUSES.includes(status);
      
      if (!isTypeValid || !isStatusValid) {
        invalidCount++;
        console.log(`
🚨 Equipo con ID ${id} (S/N: ${serial_number}) tiene valores inválidos:`);
        if (!isTypeValid) {
          console.log(`   - Tipo inválido: "${type}"`);
        }
        if (!isStatusValid) {
          console.log(`   - Estado inválido: "${status}"`);
        }
      }
    }
    
    if (invalidCount === 0) {
      console.log('✅ No se encontraron valores inválidos en la tabla de Equipos.');
    } else {
      console.log(`
📉 Se encontraron ${invalidCount} equipos con valores inválidos.`);
    }
    
  } catch (error) {
    console.error('❌ Error al verificar los equipos:', error);
  }
}

checkEnumValues()
  .then(() => {
    console.log(`
🏁 Verificación completada.`);
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error fatal durante la ejecución del script:', err);
    process.exit(1);
  });
