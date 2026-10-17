const db = require('../config/database');

/**
 * Exécute les migrations nécessaires au démarrage du serveur.
 * Chaque migration est idempotente (safe to run multiple times).
 * Toutes les requêtes sont en syntaxe PostgreSQL.
 */
async function runMigrations() {
  const conn = await db.getConnection();
  try {
    console.log('🔄 Vérification des migrations...');

    // ──────────────────────────────────────────────────────────────
    // Migration 1: Colonne semestre dans la table matieres
    // ──────────────────────────────────────────────────────────────
    const [semCol] = await conn.execute(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_schema = current_schema() AND table_name = 'matieres' AND column_name = 'semestre'
    `);
    if (semCol.length === 0) {
      await conn.execute(`
        ALTER TABLE matieres ADD COLUMN semestre VARCHAR(3) DEFAULT 'S1'
          CHECK (semestre IN ('S1','S2','S3','S4'))
      `);
      console.log('  ✅ Migration: colonne semestre ajoutée à matieres');
    }

    // ──────────────────────────────────────────────────────────────
    // Migration 2: Table attributions_matieres
    // ──────────────────────────────────────────────────────────────
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS attributions_matieres (
        id                  SERIAL PRIMARY KEY,
        enseignant_id       INTEGER NOT NULL REFERENCES enseignants(id) ON DELETE CASCADE,
        matiere_id          INTEGER NOT NULL REFERENCES matieres(id) ON DELETE CASCADE,
        annee_academique_id INTEGER NOT NULL REFERENCES annees_academiques(id) ON DELETE CASCADE,
        semestre            VARCHAR(3) NOT NULL DEFAULT 'S1'
                              CHECK (semestre IN ('S1','S2','S3','S4')),
        heures_total        DECIMAL(10,2) DEFAULT 0,
        statut              VARCHAR(20) DEFAULT 'EN_ATTENTE'
                              CHECK (statut IN ('EN_ATTENTE','ACCEPTEE','REFUSEE')),
        observation         TEXT,
        university_id       INTEGER REFERENCES universities(id) ON DELETE CASCADE,
        date_attribution    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        date_reponse        TIMESTAMP
      )
    `);
    console.log('  ✅ Migration: table attributions_matieres OK');

    // ──────────────────────────────────────────────────────────────
    // Migration 3: Importer depuis enseignants_matieres si vide
    // ──────────────────────────────────────────────────────────────
    const [emExists] = await conn.execute(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = current_schema() AND table_name = 'enseignants_matieres'
    `);
    if (emExists.length > 0) {
      const [cntRes] = await conn.execute('SELECT COUNT(*) as cnt FROM attributions_matieres');
      if (Number(cntRes[0]?.cnt || 0) === 0) {
        await conn.execute(`
          INSERT INTO attributions_matieres (enseignant_id, matiere_id, annee_academique_id, semestre, statut, heures_total)
          SELECT em.enseignant_id, em.matiere_id, 
                 COALESCE(m.annee_academique_id, (SELECT id FROM annees_academiques ORDER BY is_active DESC LIMIT 1)),
                 'S1', 'ACCEPTEE',
                 (COALESCE(m.volume_horaire_prevu_cm,0) + COALESCE(m.volume_horaire_prevu_td,0) + COALESCE(m.volume_horaire_prevu_tp,0))
          FROM enseignants_matieres em
          JOIN matieres m ON em.matiere_id = m.id
          ON CONFLICT DO NOTHING
        `);
        console.log('  ✅ Migration: données importées depuis enseignants_matieres');
      }
    }

    // ──────────────────────────────────────────────────────────────
    // Migration 4: Multi-tenancy — table universities
    // ──────────────────────────────────────────────────────────────
    console.log('  🔄 Migration: Architecture Multi-Tenant...');

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS universities (
        id         SERIAL PRIMARY KEY,
        nom        VARCHAR(150) NOT NULL UNIQUE,
        sigle      VARCHAR(20) UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await conn.execute(`
      INSERT INTO universities (id, nom, sigle) VALUES (1, 'Université de Démonstration', 'UDEMO')
      ON CONFLICT DO NOTHING
    `);
    await conn.execute(`SELECT setval('universities_id_seq', GREATEST((SELECT COALESCE(MAX(id),1) FROM universities), 1))`);

    // Modifier le rôle dans users (ajouter super_admin si absent)
    // En PostgreSQL on ne peut pas modifier une contrainte CHECK existante facilement,
    // on la supprime et la recrée
    try {
      await conn.execute(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name='users' AND column_name='role'
              AND table_schema = current_schema()
          ) THEN
            ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'enseignant';
          END IF;
        END$$
      `);
    } catch (e) { /* déjà existant */ }

    // Ajouter university_id aux tables concernées
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
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = $1 AND column_name = 'university_id'
      `, [t.name]);

      if (colCheck.length === 0) {
        await conn.execute(`ALTER TABLE ${t.name} ADD COLUMN university_id INTEGER`);
        console.log(`    ✅ Colonne university_id ajoutée à ${t.name}`);

        if (t.name === 'users') {
          await conn.execute(`UPDATE users SET university_id = 1 WHERE role != 'super_admin'`);
        } else {
          await conn.execute(`UPDATE ${t.name} SET university_id = 1`);
        }

        try {
          await conn.execute(`
            ALTER TABLE ${t.name}
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

    // Ajuster la clé unique de parametres (cle + university_id)
    try {
      const [paramKeyCheck] = await conn.execute(`
        SELECT indexname FROM pg_indexes
        WHERE tablename = 'parametres' AND indexname = 'parametres_cle_key'
      `);
      if (paramKeyCheck.length > 0) {
        await conn.execute(`ALTER TABLE parametres DROP CONSTRAINT parametres_cle_key`);
        await conn.execute(`
          CREATE UNIQUE INDEX IF NOT EXISTS uq_parametres_univ_cle ON parametres(university_id, cle)
        `);
        console.log('    ✅ Index unique composite (university_id, cle) configuré pour parametres');
      }
    } catch (errKey) {
      console.warn('    ⚠️ Index parametres:', errKey.message);
    }

    // Ajuster la clé unique de matricule sur enseignants
    try {
      const [ensKeyCheck] = await conn.execute(`
        SELECT indexname FROM pg_indexes
        WHERE tablename = 'enseignants' AND indexname = 'enseignants_matricule_key'
      `);
      if (ensKeyCheck.length > 0) {
        await conn.execute(`ALTER TABLE enseignants DROP CONSTRAINT enseignants_matricule_key`);
        await conn.execute(`
          CREATE UNIQUE INDEX IF NOT EXISTS uq_enseignants_univ_matricule ON enseignants(university_id, matricule)
        `);
        console.log('    ✅ Index unique composite (university_id, matricule) configuré pour enseignants');
      }
    } catch (errKey) {
      console.warn('    ⚠️ Index enseignants matricule:', errKey.message);
    }

    // Insérer le Super Administrateur par défaut (Admin@1234)
    await conn.execute(`
      INSERT INTO users (email, password, role, nom, prenom, is_active, must_change_password)
      VALUES (
        'superadmin@gestion.univ', 
        '$2b$10$cjcmdc.amM.tPZ3MgVZt7O19HcmCOw6r/T8ZbeQc914TenbJk5S82', 
        'super_admin', 
        'SYSTEM', 
        'SuperAdmin', 
        TRUE, 
        FALSE
      )
      ON CONFLICT (email) DO NOTHING
    `);
    console.log('    ✅ Super Administrateur par défaut inséré (superadmin@gestion.univ / Admin@1234)');

    // Nettoyer les utilisateurs orphelins d'imports
    try {
      const [cleanRes] = await conn.execute(`
        DELETE FROM users 
        WHERE email LIKE '%@import.excel'
          AND id NOT IN (SELECT user_id FROM enseignants WHERE user_id IS NOT NULL)
        RETURNING id
      `);
      if (cleanRes.length > 0) {
        console.log(`    ✅ Nettoyage : ${cleanRes.length} utilisateurs orphelins supprimés.`);
      }
    } catch (cleanErr) {
      console.warn('    ⚠️ Nettoyage des utilisateurs orphelins:', cleanErr.message);
    }

    // Migration: Trigger updated_at si non existants
    try {
      await conn.execute(`
        CREATE OR REPLACE FUNCTION set_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql
      `);
      for (const tbl of ['users', 'enseignants', 'heures_effectuees', 'parametres']) {
        await conn.execute(`
          DO $$
          BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = '${tbl}_updated_at') THEN
              CREATE TRIGGER ${tbl}_updated_at
                BEFORE UPDATE ON ${tbl}
                FOR EACH ROW EXECUTE FUNCTION set_updated_at();
            END IF;
          END$$
        `);
      }
    } catch (tErr) {
      console.warn('    ⚠️ Triggers updated_at:', tErr.message);
    }

    // Colonne updated_at sur tables qui pourraient ne pas l'avoir
    for (const tbl of ['users', 'enseignants', 'heures_effectuees', 'parametres']) {
      const [hasUpdatedAt] = await conn.execute(`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = $1 AND column_name = 'updated_at'
      `, [tbl]);
      if (hasUpdatedAt.length === 0) {
        await conn.execute(`ALTER TABLE ${tbl} ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
        console.log(`    ✅ Colonne updated_at ajoutée à ${tbl}`);
      }
    }

    console.log('✅ Toutes les migrations sont à jour.');
  } catch (err) {
    console.error('❌ Erreur lors des migrations:', err.message);
    // On ne bloque pas le démarrage
  } finally {
    conn.release();
  }
}

module.exports = { runMigrations };
