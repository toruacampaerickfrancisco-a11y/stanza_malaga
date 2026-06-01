import { Sequelize, DataTypes } from 'sequelize';

async function checkSqlite() {
  const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './database.sqlite',
    logging: false
  });

  try {
    const [results] = await sequelize.query("SELECT name FROM sqlite_master WHERE type='table';");
    console.log('Tablas en SQLite:', results.map(r => r.name));
    
    if (results.some(r => r.name === 'Users' || r.name === 'users')) {
      const tableName = results.find(r => r.name === 'Users' || r.name === 'users').name;
      const [users] = await sequelize.query(`SELECT count(*) as count FROM ${tableName}`);
      console.log(`Usuarios en SQLite (${tableName}):`, users[0].count);
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkSqlite();
