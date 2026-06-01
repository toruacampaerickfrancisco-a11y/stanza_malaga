import { User, sequelize } from './src/models/index.js';

async function checkUser() {
  try {
    await sequelize.authenticate();
    const id = '340d5019-21af-4dff-befc-e440a717c293';
    const user = await User.findByPk(id);
    if (user) {
      console.log(`User found: ${user.usuario}`);
    } else {
      console.log(`User NOT found: ${id}`);
    }
  } catch (error) {
    console.error(error);
  } finally {
    await sequelize.close();
  }
}

checkUser();
