const db = require('../config/database');
const { auditLog } = require('../middleware/audit');

const getEquivalence = async (type) => {
  const keys = { CM: 'equivalence_cm_td', TD: null, TP: 'equivalence_cm_tp' };
  if (!keys[type]) return 1;
  const [rows] = await db.execute('SELECT valeur FROM parametres WHERE cle = ?', [keys[type]]);
  return rows.length ? parseFloat(rows[0].valeur) : 1;
};

const recalculateComplementaryStatus = async (enseignant_id, annee_id) => {
  // Si annee_id n'est pas fourni, on le fait pour toutes les années où l'enseignant a des heures
  if (!annee_id) {
    const [annees] = await db.execute('SELECT DISTINCT annee_academique_id FROM heures_effectuees WHERE enseignant_id=?', [enseignant_id]);
    for (const a of annees) {
      await recalculateComplementaryStatus(enseignant_id, a.annee_academique_id);
    }
    return;
  }
  // Récupérer le seuil
  const [ens] = await db.execute('SELECT heures_contractuelles FROM enseignants WHERE id=?', [enseignant_id]);
  const seuil = ens.length ? ens[0].heures_contractuelles : 192;

  // Récupérer toutes les heures de l'enseignant pour cette année, par date
  const [heures] = await db.execute(
    'SELECT id, duree_equivalente FROM heures_effectuees WHERE enseignant_id=? AND annee_academique_id=? ORDER BY date_cours ASC, id ASC',
    [enseignant_id, annee_id]
  );

  let cumul = 0;
  for (const h of heures) {
    const dureeEquiv = parseFloat(h.duree_equivalente || 0);
    const isComp = (cumul + dureeEquiv) > seuil;
    await db.execute('UPDATE heures_effectuees SET is_complementaire=? WHERE id=?', [isComp ? 1 : 0, h.id]);
    cumul += dureeEquiv;
  }
};

exports.recalculateComplementaryStatus = recalculateComplementaryStatus;

exports.getAll = async (req, res) => {
  const { annee_id, enseignant_id, type_heure, valide } = req.query;
  try {
    let where = ['1=1'];
    const params = [];
    
    if (req.user.role === 'enseignant') {
      where.push('h.enseignant_id = ?');
      params.push(req.user.enseignant_id);
    } else if (enseignant_id) {
      where.push('h.enseignant_id = ?');
      params.push(enseignant_id);
    }

    if (annee_id && annee_id !== 'ALL') { where.push('h.annee_academique_id = ?'); params.push(annee_id); }
    if (type_heure) { where.push('h.type_heure = ?'); params.push(type_heure); }
    if (valide !== undefined && valide !== '') { where.push('h.valide = ?'); params.push(valide === 'true' ? 1 : 0); }

    const [rows] = await db.execute(
      `SELECT h.*, e.nom, e.prenom, m.intitule as matiere_nom,
              aa.libelle as annee_libelle, u.email as valide_par_email
       FROM heures_effectuees h
       LEFT JOIN enseignants e ON h.enseignant_id = e.id
       LEFT JOIN matieres m ON h.matiere_id = m.id
       LEFT JOIN annees_academiques aa ON h.annee_academique_id = aa.id
       LEFT JOIN users u ON h.valide_par = u.id
       WHERE ${where.join(' AND ')} ORDER BY h.date_cours DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT h.*, e.nom, e.prenom, m.intitule as matiere_nom,
              aa.libelle as annee_libelle, u.email as valide_par_email
       FROM heures_effectuees h
       LEFT JOIN enseignants e ON h.enseignant_id = e.id
       LEFT JOIN matieres m ON h.matiere_id = m.id
       LEFT JOIN annees_academiques aa ON h.annee_academique_id = aa.id
       LEFT JOIN users u ON h.valide_par = u.id
       WHERE h.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Heure introuvable' });
    
    // Protection IDOR : un enseignant ne peut voir que ses propres heures
    if (req.user.role === 'enseignant' && parseInt(rows[0].enseignant_id) !== parseInt(req.user.enseignant_id)) {
      return res.status(403).json({ message: 'Accès interdit - Vous ne pouvez consulter que vos propres heures.' });
    }

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.create = async (req, res) => {
  const { enseignant_id, matiere_id, annee_academique_id, date_cours,
          type_heure, duree, salle, observations } = req.body;
  try {
    let duree_equivalente = parseFloat(duree);
    if (type_heure === 'TD') {
      const [p] = await db.execute("SELECT valeur FROM parametres WHERE cle='equivalence_cm_td'");
      duree_equivalente = p.length ? (duree / parseFloat(p[0].valeur)).toFixed(2) : duree;
    } else if (type_heure === 'TP') {
      const [p] = await db.execute("SELECT valeur FROM parametres WHERE cle='equivalence_cm_tp'");
      duree_equivalente = p.length ? (duree / parseFloat(p[0].valeur)).toFixed(2) : duree;
    }

    const [result] = await db.execute(
      `INSERT INTO heures_effectuees (enseignant_id, matiere_id, annee_academique_id, date_cours,
        type_heure, duree, duree_equivalente, salle, observations)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [enseignant_id, matiere_id || null, annee_academique_id, date_cours,
       type_heure, duree, duree_equivalente, salle || null, observations || null]
    );
    
    await recalculateComplementaryStatus(enseignant_id, annee_academique_id);
    
    await auditLog(req.user.id, 'CREATE', 'heures_effectuees', result.insertId, req.body, req.ip);
    res.status(201).json({ id: result.insertId, message: 'Heures enregistrées' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.update = async (req, res) => {
  const { date_cours, type_heure, duree, salle, observations, matiere_id } = req.body;
  try {
    let duree_equivalente = parseFloat(duree);
    if (type_heure === 'TD') {
      const [p] = await db.execute("SELECT valeur FROM parametres WHERE cle='equivalence_cm_td'");
      duree_equivalente = p.length ? (duree / parseFloat(p[0].valeur)).toFixed(2) : duree;
    } else if (type_heure === 'TP') {
      const [p] = await db.execute("SELECT valeur FROM parametres WHERE cle='equivalence_cm_tp'");
      duree_equivalente = p.length ? (duree / parseFloat(p[0].valeur)).toFixed(2) : duree;
    }

    const [old] = await db.execute('SELECT enseignant_id, annee_academique_id FROM heures_effectuees WHERE id=?', [req.params.id]);
    if (!old.length) return res.status(404).json({ message: 'Heure introuvable' });

    await db.execute(
      `UPDATE heures_effectuees SET date_cours=?, type_heure=?, duree=?, duree_equivalente=?,
        salle=?, observations=?, matiere_id=? WHERE id=?`,
      [date_cours, type_heure, duree, duree_equivalente, salle || null, observations || null,
       matiere_id || null, req.params.id]
    );
    
    await recalculateComplementaryStatus(old[0].enseignant_id, old[0].annee_academique_id);
    
    await auditLog(req.user.id, 'UPDATE', 'heures_effectuees', req.params.id, req.body, req.ip);
    res.json({ message: 'Heures mises à jour' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const [old] = await db.execute('SELECT enseignant_id, annee_academique_id FROM heures_effectuees WHERE id=?', [req.params.id]);
    if (old.length) {
      await db.execute('DELETE FROM heures_effectuees WHERE id=?', [req.params.id]);
      await recalculateComplementaryStatus(old[0].enseignant_id, old[0].annee_academique_id);
      await auditLog(req.user.id, 'DELETE', 'heures_effectuees', req.params.id, {}, req.ip);
    }
    res.json({ message: 'Heure supprimée' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.valider = async (req, res) => {
  try {
    await db.execute(
      'UPDATE heures_effectuees SET valide=1, valide_par=?, valide_le=NOW() WHERE id=?',
      [req.user.id, req.params.id]
    );
    res.json({ message: 'Heure validée avec succès' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.getPendingCount = async (req, res) => {
  try {
    let query = 'SELECT COUNT(*) as count FROM heures_effectuees WHERE valide = 0';
    const params = [];
    
    if (req.user.role === 'enseignant') {
      query += ' AND enseignant_id = ?';
      params.push(req.user.enseignant_id);
    }
    
    const [rows] = await db.execute(query, params);
    res.json({ count: rows[0].count });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};
