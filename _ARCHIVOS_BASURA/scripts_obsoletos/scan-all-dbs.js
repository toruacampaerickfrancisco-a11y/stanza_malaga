import { Sequelize } from 'sequelize';

async function checkAllDbs() {
  // Connect to postgres default db to list other dbs
  const sequelize = new Sequelize('postgres', 'postgres', 'Erick1093', {
    host: 'localhost',
    dialect: 'postgres',
    logging: false
  });

  try {
    await sequelize.authenticate();
    console.log('📡 Conectado a Postgres root.');

    const [dbs] = await sequelize.query('SELECT datname FROM pg_database WHERE datistemplate = false;');
    const dbNames = dbs.map(d => d.datname);
    console.log('📂 Bases de datos encontradas:', dbNames);

    for (const dbName of dbNames) {
      if (dbName === 'postgres') continue;
      
      console.log(`\n🔍 Revisando BD: ${dbName}...`);
      const dbSeq = new Sequelize(dbName, 'postgres', 'Erick1093', {
        host: 'localhost',
        dialect: 'postgres',
        logging: false
      });

      try {
        // Check if users table exists
        const [tables] = await dbSeq.query(`SELECT to_regclass('public.users') as exists;`);
        if (!tables[0].exists) {
            console.log(`   ⚠️  Tabla 'users' no existe.`);
            await dbSeq.close();
            continue;
        }

        // Check for erick campa
        const [users] = await dbSeq.query(`SELECT id, usuario, rol FROM users WHERE usuario = 'erick campa'`);
        if (users.length === 0) {
            console.log(`   ⚠️  Usuario 'erick campa' NO encontrado.`);
        } else {
            const user = users[0];
            console.log(`   👤 Usuario encontrado: ${user.usuario} (ID: ${user.id})`);
            
            // Check permissions
            const [perms] = await dbSeq.query(`SELECT count(*) as count FROM user_permissions WHERE user_id = '${user.id}'`);
            console.log(`   🔢 Permisos asignados: ${perms[0].count}`);
            
            if (parseInt(perms[0].count) > 0) {
                console.log(`   ✅ ESTA BD TIENE LOS PERMISOS.`);
            } else {
                console.log(`   ❌ ESTA BD TIENE AL USUARIO PERO SIN PERMISOS.`);
            }
        }
        await dbSeq.close();

      } catch (err) {
        console.log(`   ❌ Error accediendo a ${dbName}: ${err.message}`);
      }
    }

  } catch (e) {
    console.error('Error general:', e);
  } finally {
    await sequelize.close();
  }
}

checkAllDbs();