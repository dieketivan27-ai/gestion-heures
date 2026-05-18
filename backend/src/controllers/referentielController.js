const db = require('../config/database');

// ---- DEPARTEMENTS ----
exports.getDepartements = async (req, res) => {
  try {
    let query = 'SELECT * FROM departements';
    const params = [];
    if (req.user.role !== 'super_admin' || req.user.university_id) {
      query += ' WHERE university_id = ?';
      params.push(req.user.university_id);
    }
    query += ' ORDER BY nom';
    const [rows] = await db.execute(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.createDepartement = async (req, res) => {
  const { nom, code } = req.body;
  const university_id = req.user.role === 'super_admin' ? req.body.university_id : req.user.university_id;
  try {
    const [r] = await db.execute('INSERT INTO departements (nom,code,university_id) VALUES (?,?,?)', [nom, code, university_id]);
    res.status(201).json({ id: r.insertId });
  } catch (err) { res.status(400).json({ message: 'Erreur lors de la création', error: err.message }); }
};

exports.updateDepartement = async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      const [check] = await db.execute('SELECT id FROM departements WHERE id=? AND university_id=?', [req.params.id, req.user.university_id]);
      if (!check.length) return res.status(403).json({ message: 'Accès interdit' });
    }
    await db.execute('UPDATE departements SET nom=?,code=? WHERE id=?', [req.body.nom, req.body.code, req.params.id]);
    res.json({ message: 'Mis à jour' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.deleteDepartement = async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      const [check] = await db.execute('SELECT id FROM departements WHERE id=? AND university_id=?', [req.params.id, req.user.university_id]);
      if (!check.length) return res.status(403).json({ message: 'Accès interdit' });
    }
    await db.execute('DELETE FROM departements WHERE id=?', [req.params.id]);
    res.json({ message: 'Supprimé' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// ---- FILIERES ----
exports.getFilieres = async (req, res) => {
  try {
    let query = 'SELECT f.*, d.nom as departement_nom FROM filieres f LEFT JOIN departements d ON f.departement_id=d.id';
    const params = [];
    if (req.user.role !== 'super_admin' || req.user.university_id) {
      query += ' WHERE f.university_id = ?';
      params.push(req.user.university_id);
    }
    query += ' ORDER BY f.nom';
    const [rows] = await db.execute(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.createFiliere = async (req, res) => {
  const { nom, code, departement_id } = req.body;
  const university_id = req.user.role === 'super_admin' ? req.body.university_id : req.user.university_id;
  try {
    const [r] = await db.execute('INSERT INTO filieres (nom,code,departement_id,university_id) VALUES (?,?,?,?)', [nom, code, departement_id || null, university_id]);
    res.status(201).json({ id: r.insertId });
  } catch (err) { res.status(400).json({ message: 'Erreur lors de la création', error: err.message }); }
};

exports.updateFiliere = async (req, res) => {
  const { nom, code, departement_id } = req.body;
  try {
    if (req.user.role !== 'super_admin') {
      const [check] = await db.execute('SELECT id FROM filieres WHERE id=? AND university_id=?', [req.params.id, req.user.university_id]);
      if (!check.length) return res.status(403).json({ message: 'Accès interdit' });
    }
    await db.execute('UPDATE filieres SET nom=?,code=?,departement_id=? WHERE id=?', [nom, code, departement_id || null, req.params.id]);
    res.json({ message: 'Mis à jour' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.deleteFiliere = async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      const [check] = await db.execute('SELECT id FROM filieres WHERE id=? AND university_id=?', [req.params.id, req.user.university_id]);
      if (!check.length) return res.status(403).json({ message: 'Accès interdit' });
    }
    await db.execute('DELETE FROM filieres WHERE id=?', [req.params.id]);
    res.json({ message: 'Supprimé' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// ---- MATIERES ----
exports.getMatieres = async (req, res) => {
  const { annee_id } = req.query;
  let q = `SELECT m.*, f.nom as filiere_nom, aa.libelle as annee_libelle 
           FROM matieres m LEFT JOIN filieres f ON m.filiere_id=f.id
           LEFT JOIN annees_academiques aa ON m.annee_academique_id=aa.id
           WHERE 1=1`;
  const params = [];
  if (req.user.role !== 'super_admin' || req.user.university_id) {
    q += ' AND m.university_id = ?';
    params.push(req.user.university_id);
  }
  if (annee_id && annee_id !== 'ALL') { q += ' AND m.annee_academique_id=?'; params.push(annee_id); }
  try {
    const [rows] = await db.execute(q, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.createMatiere = async (req, res) => {
  const { intitule, code, filiere_id, niveau, semestre, volume_horaire_prevu_cm, volume_horaire_prevu_td, volume_horaire_prevu_tp, annee_academique_id } = req.body;
  const university_id = req.user.role === 'super_admin' ? req.body.university_id : req.user.university_id;
  try {
    const [r] = await db.execute(
      'INSERT INTO matieres (intitule,code,filiere_id,niveau,semestre,volume_horaire_prevu_cm,volume_horaire_prevu_td,volume_horaire_prevu_tp,annee_academique_id,university_id) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [intitule, code || null, filiere_id || null, niveau, semestre || 'S1', volume_horaire_prevu_cm || 0, volume_horaire_prevu_td || 0, volume_horaire_prevu_tp || 0, annee_academique_id || null, university_id]
    );
    res.status(201).json({ id: r.insertId });
  } catch (err) { res.status(400).json({ message: 'Erreur lors de la création', error: err.message }); }
};

exports.updateMatiere = async (req, res) => {
  const { intitule, code, filiere_id, niveau, semestre, volume_horaire_prevu_cm, volume_horaire_prevu_td, volume_horaire_prevu_tp, annee_academique_id } = req.body;
  try {
    if (req.user.role !== 'super_admin') {
      const [check] = await db.execute('SELECT id FROM matieres WHERE id=? AND university_id=?', [req.params.id, req.user.university_id]);
      if (!check.length) return res.status(403).json({ message: 'Accès interdit' });
    }
    await db.execute(
      'UPDATE matieres SET intitule=?,code=?,filiere_id=?,niveau=?,semestre=?,volume_horaire_prevu_cm=?,volume_horaire_prevu_td=?,volume_horaire_prevu_tp=?,annee_academique_id=? WHERE id=?',
      [intitule, code || null, filiere_id || null, niveau, semestre || 'S1', volume_horaire_prevu_cm || 0, volume_horaire_prevu_td || 0, volume_horaire_prevu_tp || 0, annee_academique_id || null, req.params.id]
    );
    res.json({ message: 'Mis à jour' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.deleteMatiere = async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      const [check] = await db.execute('SELECT id FROM matieres WHERE id=? AND university_id=?', [req.params.id, req.user.university_id]);
      if (!check.length) return res.status(403).json({ message: 'Accès interdit' });
    }
    await db.execute('DELETE FROM matieres WHERE id=?', [req.params.id]);
    res.json({ message: 'Supprimé' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// ---- ANNEES ACADEMIQUES ----
exports.getAnnees = async (req, res) => {
  try {
    let q = 'SELECT * FROM annees_academiques';
    const params = [];
    if (req.user.role !== 'super_admin' || req.user.university_id) {
      q += ' WHERE university_id = ?';
      params.push(req.user.university_id);
    }
    q += ' ORDER BY date_debut DESC';
    const [rows] = await db.execute(q, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.createAnnee = async (req, res) => {
  const { libelle, date_debut, date_fin, is_active } = req.body;
  const university_id = req.user.role === 'super_admin' ? req.body.university_id : req.user.university_id;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    if (is_active) await conn.execute('UPDATE annees_academiques SET is_active=0 WHERE university_id = ?', [university_id]);
    const [r] = await conn.execute('INSERT INTO annees_academiques (libelle,date_debut,date_fin,is_active,university_id) VALUES (?,?,?,?,?)', [libelle, date_debut, date_fin, is_active ? 1 : 0, university_id]);
    await conn.commit();
    res.status(201).json({ id: r.insertId });
  } catch (err) { await conn.rollback(); res.status(400).json({ message: 'Erreur lors de la création', error: err.message }); }
  finally { conn.release(); }
};

exports.activateAnnee = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    
    // Get university of this academic year
    const [annee] = await conn.execute('SELECT university_id FROM annees_academiques WHERE id=?', [req.params.id]);
    if (!annee.length) {
      await conn.rollback();
      return res.status(404).json({ message: 'Année introuvable' });
    }
    const university_id = annee[0].university_id;

    if (req.user.role !== 'super_admin' && university_id !== req.user.university_id) {
      await conn.rollback();
      return res.status(403).json({ message: 'Accès interdit' });
    }

    // Désactiver toutes les années de cette université
    await conn.execute('UPDATE annees_academiques SET is_active=0 WHERE university_id=?', [university_id]);
    // Activer l'année spécifiée
    await conn.execute('UPDATE annees_academiques SET is_active=1 WHERE id=?', [req.params.id]);
    await conn.commit();
    res.json({ message: 'Année académique activée' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  } finally {
    conn.release();
  }
};

exports.deleteAnnee = async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      const [check] = await db.execute('SELECT id, university_id FROM annees_academiques WHERE id=?', [req.params.id]);
      if (!check.length) return res.status(404).json({ message: 'Année introuvable' });
      if (check[0].university_id !== req.user.university_id) return res.status(403).json({ message: 'Accès interdit' });
    }

    // 1. Vérifer si c'est l'année active
    const [annee] = await db.execute('SELECT is_active FROM annees_academiques WHERE id = ?', [req.params.id]);
    if (!annee.length) return res.status(404).json({ message: 'Année introuvable' });
    if (annee[0].is_active) return res.status(400).json({ message: 'Impossible de supprimer l\'année académique active' });

    // 2. Vérifier les dépendances
    const [heures] = await db.execute('SELECT id FROM heures_effectuees WHERE annee_academique_id = ? LIMIT 1', [req.params.id]);
    if (heures.length) return res.status(400).json({ message: 'Impossible de supprimer : des heures sont rattachées à cette année' });

    const [matieres] = await db.execute('SELECT id FROM matieres WHERE annee_academique_id = ? LIMIT 1', [req.params.id]);
    if (matieres.length) return res.status(400).json({ message: 'Impossible de supprimer : des matières sont rattachées à cette année' });

    // 3. Supprimer
    await db.execute('DELETE FROM annees_academiques WHERE id = ?', [req.params.id]);
    res.json({ message: 'Année académique supprimée' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// ---- PARAMETRES ----
exports.getParametres = async (req, res) => {
  try {
    let q = 'SELECT * FROM parametres';
    const params = [];
    if (req.user.role !== 'super_admin' || req.user.university_id) {
      q += ' WHERE university_id = ?';
      params.push(req.user.university_id);
    }
    const [rows] = await db.execute(q, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.updateParametre = async (req, res) => {
  try {
    let query = 'UPDATE parametres SET valeur=? WHERE cle=?';
    const params = [req.body.valeur, req.params.cle];
    if (req.user.role !== 'super_admin' || req.user.university_id) {
      query += ' AND university_id=?';
      params.push(req.user.university_id);
    }
    await db.execute(query, params);
    res.json({ message: 'Paramètre mis à jour' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// ---- AUDIT LOGS ----
exports.getLogs = async (req, res) => {
  try {
    let query = `SELECT l.*, u.email FROM audit_logs l LEFT JOIN users u ON l.user_id=u.id`;
    const params = [];
    if (req.user.role !== 'super_admin' || req.user.university_id) {
      query += ' WHERE l.university_id = ?';
      params.push(req.user.university_id);
    }
    query += ' ORDER BY l.created_at DESC LIMIT 200';
    const [rows] = await db.execute(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};
