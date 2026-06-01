import config from './src/config/config.js';
console.log('DB Config:', {
  user: config.database.username,
  pass: config.database.password,
  db: config.database.database
});
