import { Sequelize } from 'sequelize';
import config from './src/config/config.js';
import User from './src/models/User.js';
import userController from './src/controllers/userController.js';

// Configurar conexión directa para el script
const sequelize = new Sequelize(
  config.database.database,
  config.database.username,
  config.database.password,
  {
    host: config.database.host,
    port: config.database.port,
    dialect: 'postgres',
    logging: false
  }
);

async function migrate() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a la BD.');

    // Leer usuarios legacy
    console.log('🔍 Leyendo tabla `usuarios`...');
    const [legacyUsers] = await sequelize.query('SELECT * FROM usuarios');
    console.log(`📊 Encontrados ${legacyUsers.length} usuarios legacy.`);

    let count = 0;
    let errors = 0;

    for (const u of legacyUsers) {
      try {
        // Mapeo de datos
        // Generar un nombre de usuario único si es necesario
        let username = u.email.split('@')[0];
        
        // Limpieza básica
        let passwordToUse = u.password_hash;
        if (!passwordToUse || passwordToUse.length < 6) {
            passwordToUse = 'Temporal123';
        }

        const userData = {
          numero_empleado: u.id ? u.id.toString() : `EMP-${Date.now()}`, 
          usuario: username,
          correo: u.email,
          contrasena: passwordToUse, // El hook beforeCreate lo hasheará
          nombre_completo: u.name,
          dependencia: u.dependencia,
          departamento: u.department,
          rol: u.role ? u.role.toLowerCase() : 'user',
          cargo: u.position,
          area: u.area,
          creado_por: u.created_by ? u.created_by.toString() : null,
          activo: u.active == 1
        };

        // Verificar duplicados
        const existing = await User.findOne({
            where: {
                [Sequelize.Op.or]: [
                    { correo: userData.correo },
                    { numero_empleado: userData.numero_empleado }
                ]
            }
        });

            if (!existing) {
            const createdUser = await User.create(userData);
            // Asignar permisos por defecto usando controller
            try {
              await userController.assignDefaultPermissions(createdUser, createdUser.rol, createdUser.id);
            } catch (permError) {
              console.error('Error asignando permisos a usuario migrado:', createdUser.usuario, permError.message || permError);
            }
            console.log(`✨ Migrado: ${userData.usuario} (${userData.correo})`);
            count++;
        } else {
            console.log(`⏭️  Saltado (ya existe): ${userData.usuario}`);
        }

      } catch (err) {
        console.error(`❌ Error migrando usuario ${u.name}:`, err.message);
        errors++;
      }
    }

    console.log(`\n🏁 Migración completada.`);
    console.log(`✅ Migrados: ${count}`);
    console.log(`❌ Errores: ${errors}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fatal en la migración:', error);
    process.exit(1);
  }
}

migrate();
