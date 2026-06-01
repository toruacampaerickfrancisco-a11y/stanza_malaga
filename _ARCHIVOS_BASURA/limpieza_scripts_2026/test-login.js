/* Test login script
 * Usage: node scripts/test-login.js [username] [password] [baseUrl]
 * Example: node scripts/test-login.js admin@bienestar.sonora.gob.mx Bienestar2025 http://localhost:3000
 */

const username = process.argv[2] || 'admin@bienestar.sonora.gob.mx';
const password = process.argv[3] || 'Bienestar2025';
const baseUrl = process.argv[4] || 'http://localhost:3000';

(async () => {
  try {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const text = await res.text();
    console.log('Status:', res.status);
    console.log('Body:', text);
  } catch (e) {
    console.error('Error connecting to server:', e.message);
    process.exit(1);
  }
})();
