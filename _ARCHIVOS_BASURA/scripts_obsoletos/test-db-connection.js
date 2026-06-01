import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

console.log('Probando conexión con valores de .env:');
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD);

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: false
  }
);

async function test() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión exitosa con erp_user.');
    const [results] = await sequelize.query('SELECT current_user, current_database()');
    console.log('Info:', results[0]);
  } catch (error) {
    console.error('❌ Error con erp_user:', error.message);
    
    console.log('\nProbando con postgres / Bienestar25...');
    const sequelize2 = new Sequelize(
      process.env.DB_NAME,
      'postgres',
      'Bienestar25',
      {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: 'postgres',
        logging: false
      }
    );
    
    try {
      await sequelize2.authenticate();
      console.log('✅ Conexión exitosa con postgres / Bienestar25.');
      const [results] = await sequelize2.query('SELECT current_user, current_database()');
      console.log('Info:', results[0]);
    } catch (error2) {
      console.error('❌ Error con postgres:', error2.message);
    }
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

test();
