const db = require('../config/database');

/**
 * Exécute les migrations nécessaires au démarrage du serveur.
 * Chaque migration est idempotente (safe to run multiple times).
 */
async function runMigrations() {
  const conn = await db.getConnection();
  try {
    console.log('🔄 Vérification des migrations...');

    // Migration 1: Colonne semestre dans la table matieres
    const [semCol] = await conn.execute(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'matieres' AND COLUMN_NAME = 'semestre'
    `);
    if (semCol.length === 0) {
      await conn.execute(`ALTER TABLE matieres ADD COLUMN semestre ENUM('S1','S2','S3','S4') DEFAULT 'S1' AFTER niveau`);
      console.log('  ✅ Migration: colonne semestre ajoutée à matieres');
    }

    // Migration 2: Table attributions_matieres
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS attributions_matieres (
        id INT AUTO_INCREMENT PRIMARY KEY,
        enseignant_id INT NOT NULL,
        matiere_id INT NOT NULL,
        annee_academique_id INT NOT NULL,
        semestre ENUM('S1', 'S2', 'S3', 'S4') NOT NULL DEFAULT 'S1',
        heures_total DECIMAL(10,2) DEFAULT 0,
        statut ENUM('EN_ATTENTE', 'ACCEPTEE', 'REFUSEE') DEFAULT 'EN_ATTENTE',
        observation TEXT,
        date_attribution TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        date_reponse TIMESTAMP NULL,
        FOREIGN KEY (enseignant_id) REFERENCES enseignants(id) ON DELETE CASCADE,
        FOREIGN KEY (matiere_id) REFERENCES matieres(id) ON DELETE CASCADE,
        FOREIGN KEY (annee_academique_id) REFERENCES annees_academiques(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  ✅ Migration: table attributions_matieres OK');

    // Migration 3: Importer les données de enseignants_matieres si la table existe et que attributions_matieres est vide
    const [emExists] = await conn.execute(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'enseignants_matieres'
    `);
    if (emExists.length > 0) {
      const [[{ cnt }]] = await conn.execute('SELECT COUNT(*) as cnt FROM attributions_matieres');
      if (cnt === 0) {
        await conn.execute(`
          INSERT IGNORE INTO attributions_matieres (enseignant_id, matiere_id, annee_academique_id, semestre, statut, heures_total)
          SELECT em.enseignant_id, em.matiere_id, 
                 COALESCE(m.annee_academique_id, (SELECT id FROM annees_academiques ORDER BY is_active DESC LIMIT 1)),
                 'S1', 'ACCEPTEE',
                 (COALESCE(m.volume_horaire_prevu_cm,0) + COALESCE(m.volume_horaire_prevu_td,0) + COALESCE(m.volume_horaire_prevu_tp,0))
          FROM enseignants_matieres em
          JOIN matieres m ON em.matiere_id = m.id
        `);
        console.log('  ✅ Migration: données importées depuis enseignants_matieres');
      }
    }

    console.log('✅ Toutes les migrations sont à jour.');
  } catch (err) {
    console.error('❌ Erreur lors des migrations:', err.message);
    // On ne bloque pas le démarrage, juste on log l'erreur
  } finally {
    conn.release();
  }
}

module.exports = { runMigrations };
