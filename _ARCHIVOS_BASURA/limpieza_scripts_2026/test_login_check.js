import { Sequelize, DataTypes } from 'sequelize';
import bcrypt from 'bcryptjs';

const sequelize = new Sequelize('sistema-mantenimientoDB', 'postgres', 'Bienestar2025+', {
  host: 'localhost',
  dialect: 'postgres',
  logging: false
});

async function run() {
  try {
    await sequelize.authenticate();
    
    const User = sequelize.define('users', {
      id: { type: DataTypes.UUID, primaryKey: true },
      usuario: { type: DataTypes.STRING },
      contrasena: { type: DataTypes.STRING },
      activo: { type: DataTypes.BOOLEAN }
    }, {
      tableName: 'users',
      timestamps: false
    });

    const admin = await User.findOne({ where: { usuario: 'admin' } });
    
    if (!admin) {
      console.log('User not found');
      return;
    }

    console.log('Stored Hash:', admin.contrasena);
    
    const isValid = await bcrypt.compare('admin123', admin.contrasena);
    console.log('Password "admin123" matches:', isValid);

    // Try verifying with a simpler hash just in case of weirdness
    const testHash = await bcrypt.hash('test', 10);
    const testMatch = await bcrypt.compare('test', testHash);
    console.log('Self-test bcrypt:', testMatch);

  } catch (err) {
    console.error(err);
  } finally {
    await sequelize.close();
  }
}

run();
