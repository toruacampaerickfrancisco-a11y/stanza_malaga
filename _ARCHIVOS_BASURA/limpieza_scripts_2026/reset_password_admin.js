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
    console.log('Connected to DB.');
    
    // Define minimal user model matching the table
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
      console.log('❌ User admin NOT found!');
      
      // Attempt to find ANY use
      const anyUser = await User.findOne();
      if(anyUser) console.log('Found another user though:', anyUser.usuario);
      else console.log('No users found in table.');

    } else {
      console.log('✅ User admin found. ID:', admin.id);
      
      const newPass = await bcrypt.hash('admin123', 10);
      admin.contrasena = newPass;
      admin.activo = true;
      await admin.save();
      console.log('✅ Password successfully reset to "admin123".');
    }

  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await sequelize.close();
  }
}

run();
