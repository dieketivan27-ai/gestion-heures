const db = require('../config/database');
const { auditLog } = require('../middleware/audit');

exports.getUniversities = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT u.*, 
             (SELECT COUNT(*) FROM enseignants e WHERE e.university_id = u.id) as nb_enseignants,
             (SELECT COUNT(*) FROM users us WHERE us.university_id = u.id) as nb_utilisateurs
      FROM universities u
      ORDER BY u.nom
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.createUniversity = async (req, res) => {
  const { nom, sigle } = req.body;
  if (!nom) return res.status(400).json({ message: 'Le nom de l\'université est requis' });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Check if exists
    const [existing] = await conn.execute('SELECT id FROM universities WHERE nom = ? OR (sigle IS NOT NULL AND sigle = ?)', [nom.trim(), sigle?.toUpperCase().trim() || null]);
    if (existing.length) {
      await conn.rollback();
      return res.status(400).json({ message: 'Une université avec ce nom ou sigle existe déjà' });
    }

    const [r] = await conn.execute('INSERT INTO universities (nom, sigle) VALUES (?, ?)', [nom.trim(), sigle?.toUpperCase().trim() || null]);
    const universityId = r.insertId;

    // Seed default parameters for this university
    await conn.execute(`
      INSERT INTO parametres (cle, valeur, description, university_id) VALUES
      ('equivalence_cm_td', '1.5', '1h CM = X heures TD équivalent', ?),
      ('equivalence_cm_tp', '2', '1h CM = X heures TP équivalent', ?),
      ('seuil_heures_complementaires_permanent', '192', 'Seuil heures complémentaires pour permanents', ?),
      ('seuil_heures_complementaires_vacataire', '0', 'Seuil heures complémentaires pour vacataires', ?)
    `, [universityId, universityId, universityId, universityId]);

    // Helper for scoped emails
    const makeScopedEmail = (originalEmail, sigleText, suffixId) => {
      const parts = originalEmail.split('@');
      if (parts.length !== 2) return originalEmail;
      const username = parts[0];
      const domain = parts[1];
      const slug = (sigleText || `univ${suffixId}`).toLowerCase().replace(/[^a-z0-9]/g, '');
      return `${username}.${slug}@${domain}`;
    };

    const sigleSlug = (sigle?.toUpperCase().trim() || `U${universityId}`).replace(/[^A-Z0-9]/g, '');

    // 1. Clone default departments of university 1
    const [defaultDepts] = await conn.execute('SELECT id, nom, code FROM departements WHERE university_id = 1 OR university_id IS NULL');
    const deptMap = {}; // { oldDeptId: newDeptId }
    for (const dept of defaultDepts) {
      const newCode = `${dept.code}-${sigleSlug}`.substring(0, 20);
      const [deptRes] = await conn.execute(
        'INSERT INTO departements (nom, code, university_id) VALUES (?, ?, ?)',
        [dept.nom, newCode, universityId]
      );
      deptMap[dept.id] = deptRes.insertId;
    }

    // 2. Clone default users of university 1
    const [defaultUsers] = await conn.execute(
      'SELECT id, email, password, role, nom, prenom, telephone, avatar_url, is_active, must_change_password FROM users WHERE (university_id = 1 OR university_id IS NULL) AND role IN (\'admin\', \'rh\', \'enseignant\')'
    );
    const userMap = {}; // { oldUserId: newUserId }
    for (const usr of defaultUsers) {
      const newEmail = makeScopedEmail(usr.email, sigleSlug, universityId);
      const [usrRes] = await conn.execute(
        `INSERT INTO users (email, password, role, nom, prenom, telephone, avatar_url, is_active, must_change_password, university_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newEmail,
          usr.password,
          usr.role,
          usr.nom,
          usr.prenom,
          usr.telephone,
          usr.avatar_url,
          usr.is_active,
          usr.must_change_password,
          universityId
        ]
      );
      userMap[usr.id] = usrRes.insertId;
    }

    // 3. Clone default enseignants of university 1
    const [defaultTeachers] = await conn.execute(
      'SELECT id, user_id, matricule, nom, prenom, email, telephone, grade, statut, departement_id, taux_horaire_cm, taux_horaire_td, taux_horaire_tp, heures_contractuelles FROM enseignants WHERE university_id = 1 OR university_id IS NULL'
    );
    for (const t of defaultTeachers) {
      const newEmail = makeScopedEmail(t.email, sigleSlug, universityId);
      const newUserId = t.user_id ? userMap[t.user_id] : null;
      const newDeptId = t.departement_id ? deptMap[t.departement_id] : null;
      const newMatricule = t.matricule ? `${t.matricule}-${sigleSlug}`.substring(0, 50) : null;

      await conn.execute(
        `INSERT INTO enseignants (user_id, matricule, nom, prenom, email, telephone, grade, statut, departement_id, taux_horaire_cm, taux_horaire_td, taux_horaire_tp, heures_contractuelles, university_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newUserId,
          newMatricule,
          t.nom,
          t.prenom,
          newEmail,
          t.telephone,
          t.grade,
          t.statut,
          newDeptId,
          t.taux_horaire_cm,
          t.taux_horaire_td,
          t.taux_horaire_tp,
          t.heures_contractuelles,
          universityId
        ]
      );
    }

    await conn.commit();
    await auditLog(req.user.id, 'CREATE_UNIVERSITY', 'universities', universityId, { nom, sigle }, req.ip);
    res.status(201).json({ id: universityId, message: 'Université créée avec succès' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  } finally {
    conn.release();
  }
};

exports.updateUniversity = async (req, res) => {
  const { nom, sigle } = req.body;
  const { id } = req.params;
  if (!nom) return res.status(400).json({ message: 'Le nom de l\'université est requis' });

  try {
    // Check duplicate
    const [existing] = await db.execute(
      'SELECT id FROM universities WHERE (nom = ? OR (sigle IS NOT NULL AND sigle = ?)) AND id != ?',
      [nom.trim(), sigle?.toUpperCase().trim() || null, id]
    );
    if (existing.length) return res.status(400).json({ message: 'Une autre université possède déjà ce nom ou sigle' });

    await db.execute('UPDATE universities SET nom = ?, sigle = ? WHERE id = ?', [nom.trim(), sigle?.toUpperCase().trim() || null, id]);
    await auditLog(req.user.id, 'UPDATE_UNIVERSITY', 'universities', id, { nom, sigle }, req.ip);
    res.json({ message: 'Université mise à jour' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.deleteUniversity = async (req, res) => {
  const { id } = req.params;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    if (parseInt(id) === 1) {
      await conn.rollback();
      return res.status(400).json({ message: 'Impossible de supprimer l\'université de démonstration par défaut.' });
    }

    // Explicitly delete users belonging to this university
    await conn.execute('DELETE FROM users WHERE university_id = ?', [id]);
    
    // Deleting university will cascade-delete other tables due to foreign key ON DELETE CASCADE
    const [r] = await conn.execute('DELETE FROM universities WHERE id = ?', [id]);
    if (r.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Université introuvable' });
    }

    await conn.commit();
    await auditLog(req.user.id, 'DELETE_UNIVERSITY', 'universities', id, {}, req.ip);
    res.json({ message: 'Université supprimée avec succès' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  } finally {
    conn.release();
  }
};
