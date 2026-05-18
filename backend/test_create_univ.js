const axios = require('axios');
const db = require('./src/config/database');

async function run() {
  try {
    console.log('Logging in as Super Admin...');
    const loginRes = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'superadmin@gestion.univ',
      password: 'Admin@1234'
    });
    const token = loginRes.data.token;
    console.log('Login successful.');

    console.log('Creating a new university...');
    const createRes = await axios.post('http://localhost:3000/api/universities', {
      nom: 'Université de Test Validation',
      sigle: 'UTV'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('University created:', createRes.data);

    console.log('Checking database for seeded users...');
    const [users] = await db.execute('SELECT id, email, role, university_id FROM users WHERE university_id = ?', [createRes.data.id]);
    console.log('Seeded Users:', users);

    console.log('Checking database for seeded enseignants...');
    const [enseignants] = await db.execute('SELECT id, nom, prenom, email, matricule, university_id FROM enseignants WHERE university_id = ?', [createRes.data.id]);
    console.log('Seeded Enseignants:', enseignants);

  } catch (err) {
    console.error('Error:', err.response ? err.response.data : err.message);
  } finally {
    process.exit(0);
  }
}
run();
