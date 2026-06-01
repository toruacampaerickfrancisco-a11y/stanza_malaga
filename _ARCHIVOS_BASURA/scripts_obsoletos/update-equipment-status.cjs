const { Equipment } = require('./src/models/index.js');

async function updateEquipmentStatus() {
  try {
    console.log('Actualizando el estado de todos los equipos de "available" a "operativo"...');

    // Actualizar todos los equipos con status 'available' a 'operativo'
    const [affectedRows] = await Equipment.update(
      { status: 'operativo' },
      {
        where: {
          status: 'available'
        }
      }
    );

    console.log(`✅ Se actualizaron ${affectedRows} equipos de "available" a "operativo"`);

    // Verificar el resultado
    const operativoCount = await Equipment.count({
      where: { status: 'operativo' }
    });

    const availableCount = await Equipment.count({
      where: { status: 'available' }
    });

    console.log(`📊 Estado actual:`);
    console.log(`   - Equipos operativos: ${operativoCount}`);
    console.log(`   - Equipos disponibles: ${availableCount}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error al actualizar equipos:', error);
    process.exit(1);
  }
}

updateEquipmentStatus();