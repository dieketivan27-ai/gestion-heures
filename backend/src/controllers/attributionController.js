const db = require('../config/database');
const { auditLog } = require('../middleware/audit');

/**
 * Récupère les attributions de l'enseignant connecté
 */
exports.getMyAttributions = async (req, res) => {
  if (req.user.role !== 'enseignant') {
    return res.status(403).json({ message: 'Seuls les enseignants peuvent consulter leurs propres attributions.' });
  }

  const enseignantId = req.user.enseignant_id;
  if (!enseignantId) {
    return res.status(400).json({ message: 'Profil enseignant non trouvé pour cet utilisateur.' });
  }

  try {
    const [rows] = await db.execute(`
      SELECT 
        a.id, a.statut, a.heures_total, a.semestre, a.observation, a.date_attribution, a.date_reponse,
        m.intitule as matiere_nom, m.code as matiere_code, 
        aa.libelle as annee_libelle
      FROM attributions_matieres a
      INNER JOIN matieres m ON a.matiere_id = m.id
      INNER JOIN annees_academiques aa ON a.annee_academique_id = aa.id
      WHERE a.enseignant_id = ?
      ORDER BY a.date_attribution DESC
    `, [enseignantId]);

    res.json(rows);
  } catch (err) {
    console.error('Error in getMyAttributions:', err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

/**
 * Répondre à une attribution (Accepter/Refuser)
 */
exports.respondToAttribution = async (req, res) => {
  const { id } = req.params;
  const { statut, observation } = req.body; // statut: 'ACCEPTEE' ou 'REFUSEE'
  const enseignantId = req.user.enseignant_id;

  if (!['ACCEPTEE', 'REFUSEE'].includes(statut)) {
    return res.status(400).json({ message: 'Statut invalide.' });
  }

  if (statut === 'REFUSEE' && (!observation || observation.trim() === '')) {
    return res.status(400).json({ message: 'Un motif est obligatoire pour un refus.' });
  }

  try {
    // Vérifier que l'attribution appartient bien à l'enseignant
    const [attr] = await db.execute('SELECT * FROM attributions_matieres WHERE id = ? AND enseignant_id = ?', [id, enseignantId]);
    
    if (attr.length === 0) {
      return res.status(404).json({ message: 'Attribution introuvable ou non autorisée.' });
    }

    if (attr[0].statut !== 'EN_ATTENTE') {
      return res.status(400).json({ message: 'Cette attribution a déjà été traitée.' });
    }

    await db.execute(
      'UPDATE attributions_matieres SET statut = ?, observation = ?, date_reponse = CURRENT_TIMESTAMP WHERE id = ?',
      [statut, observation || null, id]
    );

    await auditLog(req.user.id, 'UPDATE_STATUS', 'attributions_matieres', id, { statut, observation }, req.ip);

    res.json({ message: `Attribution ${statut.toLowerCase()} avec succès.` });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

/**
 * Récupérer toutes les attributions (Admin/RH)
 */
exports.getAllAttributions = async (req, res) => {
  const { annee_id, enseignant_id, statut, semestre } = req.query;
  
  let query = `
    SELECT a.*, e.nom as enseignant_nom, e.prenom as enseignant_prenom, 
           m.intitule as matiere_nom, m.code as matiere_code,
           aa.libelle as annee_libelle
    FROM attributions_matieres a
    JOIN enseignants e ON a.enseignant_id = e.id
    JOIN matieres m ON a.matiere_id = m.id
    JOIN annees_academiques aa ON a.annee_academique_id = aa.id
    WHERE 1=1
  `;
  const params = [];

  if (req.user.role !== 'super_admin' || req.user.university_id) {
    query += ' AND a.university_id = ?';
    params.push(req.user.university_id);
  }

  if (annee_id) { query += ' AND a.annee_academique_id = ?'; params.push(annee_id); }
  if (enseignant_id) { query += ' AND a.enseignant_id = ?'; params.push(enseignant_id); }
  if (statut) { query += ' AND a.statut = ?'; params.push(statut); }
  if (semestre) { query += ' AND a.semestre = ?'; params.push(semestre); }

  query += ' ORDER BY a.date_attribution DESC';

  try {
    const [rows] = await db.execute(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

/**
 * Créer une nouvelle attribution (Admin/RH)
 */
exports.createAttribution = async (req, res) => {
  let { enseignant_id, matiere_id, annee_academique_id, semestre, heures_total } = req.body;
  const university_id = req.user.role === 'super_admin' ? req.body.university_id : req.user.university_id;

  try {
    // Auto-résoudre l'année active de cette université si non fournie
    if (!annee_academique_id) {
      const [[activeYear]] = await db.execute('SELECT id FROM annees_academiques WHERE is_active = 1 AND university_id = ? LIMIT 1', [university_id]);
      if (!activeYear) return res.status(400).json({ message: "Aucune année académique active pour cette université." });
      annee_academique_id = activeYear.id;
    }

    const [result] = await db.execute(
      `INSERT INTO attributions_matieres (enseignant_id, matiere_id, annee_academique_id, semestre, heures_total, statut, university_id)
       VALUES (?, ?, ?, ?, ?, 'EN_ATTENTE', ?)
       ON DUPLICATE KEY UPDATE semestre = VALUES(semestre), heures_total = VALUES(heures_total), statut = 'EN_ATTENTE'`,
      [enseignant_id, matiere_id, annee_academique_id, semestre || 'S1', heures_total || 0, university_id]
    );

    await auditLog(req.user.id, 'CREATE', 'attributions_matieres', result.insertId, req.body, req.ip);

    res.status(201).json({ id: result.insertId, message: "Attribution créée et envoyée à l'enseignant." });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};
