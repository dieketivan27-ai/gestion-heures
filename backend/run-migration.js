const db = require('./src/config/database');

async function createTable() {
  const conn = await db.getConnection();
  try {
    console.log('Creating table enseignants_matieres...');
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS enseignants_matieres (
          enseignant_id INT NOT NULL,
          matiere_id INT NOT NULL,
          PRIMARY KEY (enseignant_id, matiere_id),
          FOREIGN KEY (enseignant_id) REFERENCES enseignants(id) ON DELETE CASCADE,
          FOREIGN KEY (matiere_id) REFERENCES matieres(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('Table created successfully.');
  } catch (err) {
    console.error('Error creating table:', err);
  } finally {
    conn.release();
    process.exit(0);
  }
}

createTable();
