import { Sequelize } from 'sequelize';

async function checkDb(dbName, user, password) {
  const sequelize = new Sequelize(dbName, user, password, {
    host: 'localhost',
    dialect: 'postgres',
    logging: false
  });

  try {
    await sequelize.authenticate();
    console.log(`\n📡 Conectado a BD: ${dbName}`);
    
    const [results] = await sequelize.query(`
      SELECT count(*) as count 
      FROM user_permissions up
      JOIN users u ON up.user_id = u.id
      WHERE u.usuario = 'erick campa'
    `);
    
    console.log(`   🔢 Permisos para 'erick campa': ${results[0].count}`);
    
    if (parseInt(results[0].count) > 0) {
        console.log(`   ✅ ESTA es la base de datos corregida.`);
    } else {
        console.log(`   ❌ Esta base de datos NO tiene los permisos.`);
    }

  } catch (e) {
    console.log(`\n⚠️ No se pudo conectar a ${dbName}: ${e.message}`);
  } finally {
    await sequelize.close();
  }
}

async function runDebug() {
    console.log("🔍 Buscando dónde quedaron los permisos...");
    // Revisar la base de datos "respaldo" (la que configuramos)
    await checkDb('respaldo-sistema-mantenimiento', 'postgres', 'Erick1093');
    
    // Revisar la base de datos antigua (la que podría estar usando el servidor viejo)
    await checkDb('sistema-mantenimiento', 'sistema_user', 'Erick1993');
}

runDebug();