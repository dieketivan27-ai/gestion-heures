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

    // Migration 4: Multi-tenancy
    console.log('  🔄 Migration: Passage à l\'architecture Multi-Tenant...');

    // 1. Table universities
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS universities (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nom VARCHAR(150) NOT NULL UNIQUE,
        sigle VARCHAR(20) UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // 2. Université de démonstration par défaut
    await conn.execute(`
      INSERT IGNORE INTO universities (id, nom, sigle) 
      VALUES (1, 'Université de Démonstration', 'UDEMO')
    `);

    // 3. Modifier la colonne role de la table users
    await conn.execute(`
      ALTER TABLE users MODIFY COLUMN role ENUM('super_admin', 'admin', 'rh', 'enseignant') NOT NULL DEFAULT 'enseignant'
    `);

    // 4. Ajouter university_id aux tables concernées
    const tablesToMigrate = [
      { name: 'users', cascade: 'SET NULL' },
      { name: 'departements', cascade: 'CASCADE' },
      { name: 'annees_academiques', cascade: 'CASCADE' },
      { name: 'enseignants', cascade: 'CASCADE' },
      { name: 'filieres', cascade: 'CASCADE' },
      { name: 'matieres', cascade: 'CASCADE' },
      { name: 'heures_effectuees', cascade: 'CASCADE' },
      { name: 'attributions_matieres', cascade: 'CASCADE' },
      { name: 'parametres', cascade: 'CASCADE' },
      { name: 'audit_logs', cascade: 'SET NULL' }
    ];

    for (const t of tablesToMigrate) {
      const [colCheck] = await conn.execute(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = 'university_id'
      `, [t.name]);

      if (colCheck.length === 0) {
        // Ajouter la colonne
        await conn.execute(`ALTER TABLE \`${t.name}\` ADD COLUMN university_id INT NULL`);
        console.log(`    ✅ Colonne university_id ajoutée à ${t.name}`);

        // Rattacher les anciennes données à l'université par défaut (id=1)
        if (t.name === 'users') {
          await conn.execute(`UPDATE users SET university_id = 1 WHERE role != 'super_admin'`);
        } else {
          await conn.execute(`UPDATE \`${t.name}\` SET university_id = 1`);
        }

        // Ajouter la clé étrangère
        try {
          await conn.execute(`
            ALTER TABLE \`${t.name}\` 
            ADD CONSTRAINT fk_${t.name}_university 
            FOREIGN KEY (university_id) REFERENCES universities(id) 
            ON DELETE ${t.cascade}
          `);
          console.log(`    ✅ Clé étrangère configurée sur ${t.name}`);
        } catch (fkErr) {
          console.warn(`    ⚠️ Clé étrangère sur ${t.name}: ${fkErr.message}`);
        }
      }
    }

    // 5. Ajuster la clé unique de parametres
    try {
      const [paramKeyCheck] = await conn.execute(`
        SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'parametres' AND INDEX_NAME = 'cle'
      `);
      if (paramKeyCheck.length > 0) {
        await conn.execute(`ALTER TABLE parametres DROP INDEX cle`);
        await conn.execute(`ALTER TABLE parametres ADD UNIQUE KEY uq_parametres_univ_cle (university_id, cle)`);
        console.log('    ✅ Index unique composite (university_id, cle) configuré pour parametres');
      }
    } catch (errKey) {
      console.warn('    ⚠️ Index parametres:', errKey.message);
    }

    // 6. Insérer l'utilisateur Super Administrateur par défaut (mot de passe 'Admin@1234')
    await conn.execute(`
      INSERT IGNORE INTO users (email, password, role, nom, prenom, is_active, must_change_password)
      VALUES (
        'superadmin@gestion.univ', 
        '$2b$10$cjcmdc.amM.tPZ3MgVZt7O19HcmCOw6r/T8ZbeQc914TenbJk5S82', 
        'super_admin', 
        'SYSTEM', 
        'SuperAdmin', 
        1, 
        0
      )
    `);
    console.log('    ✅ Super Administrateur par défaut inséré (superadmin@gestion.univ / Admin@1234)');

    // 7. Ajuster la clé unique de matricule sur enseignants
    try {
      const [ensKeyCheck] = await conn.execute(`
        SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'enseignants' AND INDEX_NAME = 'matricule'
      `);
      if (ensKeyCheck.length > 0) {
        await conn.execute(`ALTER TABLE enseignants DROP INDEX matricule`);
        await conn.execute(`ALTER TABLE enseignants ADD UNIQUE KEY uq_enseignants_univ_matricule (university_id, matricule)`);
        console.log('    ✅ Index unique composite (university_id, matricule) configuré pour enseignants');
      }
    } catch (errKey) {
      console.warn('    ⚠️ Index enseignants matricule:', errKey.message);
    }

    // 8. Nettoyer les utilisateurs orphelins liés à des imports échoués
    try {
      const [cleanRes] = await conn.execute(`
        DELETE FROM users 
        WHERE email LIKE '%@import.excel' 
          AND id NOT IN (SELECT user_id FROM enseignants WHERE user_id IS NOT NULL)
      `);
      if (cleanRes.affectedRows > 0) {
        console.log(`    ✅ Nettoyage : ${cleanRes.affectedRows} utilisateurs orphelins d'importation supprimés.`);
      }
    } catch (cleanErr) {
      console.warn('    ⚠️ Nettoyage des utilisateurs orphelins:', cleanErr.message);
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
