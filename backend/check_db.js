require('dotenv').config();
const db = require('./src/config/database');

async function run() {
  try {
    const [rows] = await db.execute('SELECT id, email, role, nom, prenom, is_active FROM users');
    console.log('--- USERS IN DATABASE ---');
    console.log(rows);
    console.log('-------------------------');
  } catch (err) {
    console.error('Error querying database:', err.message);
  } finally {
    process.exit(0);
  }
}

run();
