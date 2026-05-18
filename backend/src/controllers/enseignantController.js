const db = require('../config/database');
const bcrypt = require('bcrypt');
const { auditLog } = require('../middleware/audit');

exports.getAll = async (req, res) => {
  const { annee_id } = req.query;
  try {
    let anneeId = annee_id;
    let joinOnAnnee = '';
    let queryParams = [];
    
    if (anneeId && anneeId !== 'ALL') {
      joinOnAnnee = ' AND h.annee_academique_id = ? ';
      queryParams.push(anneeId);
    }
    
    let whereParts = [];
    if (req.user.role === 'enseignant') {
      whereParts.push('e.id = ?');
      queryParams.push(req.user.enseignant_id);
    }
    if (req.user.role !== 'super_admin' || req.user.university_id) {
      whereParts.push('e.university_id = ?');
      queryParams.push(req.user.university_id);
    }
    let whereClause = whereParts.length ? ' WHERE ' + whereParts.join(' AND ') : '';

    const [rows] = await db.execute(`
      SELECT e.*, u.avatar_url, d.nom as departement_nom,
        COALESCE(SUM(CASE WHEN h.type_heure='CM' THEN h.duree ELSE 0 END),0) as total_cm,
        COALESCE(SUM(CASE WHEN h.type_heure='TD' THEN h.duree ELSE 0 END),0) as total_td,
        COALESCE(SUM(CASE WHEN h.type_heure='TP' THEN h.duree ELSE 0 END),0) as total_tp,
        COALESCE(SUM(h.duree),0) as total_heures
      FROM enseignants e
      LEFT JOIN users u ON e.user_id = u.id
      LEFT JOIN departements d ON e.departement_id = d.id
      LEFT JOIN heures_effectuees h ON h.enseignant_id = e.id ${joinOnAnnee} AND h.valide = 1
      ${whereClause}
      GROUP BY e.id ORDER BY e.nom, e.prenom
    `, queryParams);

    // Récupérer les matières pour tous ces enseignants
    if (rows.length > 0) {
      const ids = rows.map(r => r.id);
      const [matRows] = await db.execute(`
        SELECT em.enseignant_id, m.id, m.intitule
        FROM enseignants_matieres em
        JOIN matieres m ON em.matiere_id = m.id
        WHERE em.enseignant_id IN (${ids.map(() => '?').join(',')})
      `, ids);

      // Associer les matières aux enseignants
      rows.forEach(r => {
        r.matieres = matRows.filter(m => m.enseignant_id === r.id);
      });
    }

    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.getById = async (req, res) => {
  // Authorization check: enseignants can only access their own profile
  if (req.user.role === 'enseignant' && parseInt(req.user.enseignant_id) !== parseInt(req.params.id)) {
    return res.status(403).json({ message: 'Accès interdit - Vous ne pouvez consulter que votre propre profil.' });
  }

  try {
    if (req.user.role !== 'super_admin' || req.user.university_id) {
      const [check] = await db.execute('SELECT university_id FROM enseignants WHERE id = ?', [req.params.id]);
      if (!check.length || check[0].university_id !== req.user.university_id) {
        return res.status(403).json({ message: 'Accès interdit - Enseignant hors de votre établissement.' });
      }
    }

    const [rows] = await db.execute(
      `SELECT e.*, u.avatar_url, d.nom as departement_nom FROM enseignants e
       LEFT JOIN users u ON e.user_id = u.id
       LEFT JOIN departements d ON e.departement_id = d.id WHERE e.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Enseignant introuvable' });

    const enseignant = rows[0];

    // Récupérer les matières
    const [matRows] = await db.execute(`
      SELECT m.id, m.intitule
      FROM enseignants_matieres em
      JOIN matieres m ON em.matiere_id = m.id
      WHERE em.enseignant_id = ?
    `, [req.params.id]);

    enseignant.matieres = matRows;

    res.json(enseignant);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

const { sendWelcomeEmail } = require('../config/emailService');
const { recalculateComplementaryStatus } = require('./heureController');

exports.create = async (req, res) => {
  const { nom, prenom, email, telephone, grade, statut, departement_id,
          taux_horaire_cm, taux_horaire_td, taux_horaire_tp, heures_contractuelles,
          matricule, matieres } = req.body;
          
  const university_id = req.user.role === 'super_admin' ? req.body.university_id : req.user.university_id;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    
    // Génération d'un mot de passe temporaire robuste
    const tempPassword = 'Temp' + Math.floor(1000 + Math.random() * 9000);
    const hash = await bcrypt.hash(tempPassword, 10);
    
    // Création du compte utilisateur avec obligation de changement de MDP
    const [userRes] = await conn.execute(
      'INSERT INTO users (email, password, role, nom, prenom, must_change_password, university_id) VALUES (?,?,?,?,?,TRUE,?)',
      [email, hash, 'enseignant', nom, prenom, university_id]
    );
    const user_id = userRes.insertId;
    
    // Création de l'enseignant
    const [result] = await conn.execute(
      `INSERT INTO enseignants (user_id, matricule, nom, prenom, email, telephone, grade, statut,
        departement_id, taux_horaire_cm, taux_horaire_td, taux_horaire_tp, heures_contractuelles, university_id)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [user_id, matricule || null, nom, prenom, email, telephone || null, grade, statut,
       departement_id || null, taux_horaire_cm || 0, taux_horaire_td || 0,
       taux_horaire_tp || 0, (heures_contractuelles !== undefined) ? heures_contractuelles : (statut === 'Vacataire' ? 0 : 192), university_id]
    );
    
    const enseignant_id = result.insertId;

    // Ajout des matières avec semestre dans attributions_matieres
    if (matieres && Array.isArray(matieres) && matieres.length > 0) {
      // Récupérer l'année académique active de cette université
      const [[activeYear]] = await conn.execute('SELECT id FROM annees_academiques WHERE is_active = 1 AND university_id = ? LIMIT 1', [university_id]);
      const anneeId = activeYear ? activeYear.id : null;

      // Insérer aussi dans l'ancienne table pour compatibilité
      const oldValues = matieres.map(m => [enseignant_id, typeof m === 'object' ? m.id : m]);
      if (oldValues.length > 0) {
        await conn.query('INSERT IGNORE INTO enseignants_matieres (enseignant_id, matiere_id) VALUES ?', [oldValues]);
      }

      // Insérer dans attributions_matieres (nouvelle table)
      if (anneeId) {
        for (const mat of matieres) {
          const matiereId = typeof mat === 'object' ? mat.id : mat;
          const semestre = typeof mat === 'object' ? (mat.semestre || 'S1') : 'S1';
          await conn.execute(
            `INSERT INTO attributions_matieres (enseignant_id, matiere_id, annee_academique_id, semestre, statut, university_id)
             VALUES (?, ?, ?, ?, 'EN_ATTENTE', ?)
             ON DUPLICATE KEY UPDATE semestre = VALUES(semestre)`,
            [enseignant_id, matiereId, anneeId, semestre, university_id]
          );
        }
      }
    }

    await conn.commit();
    await auditLog(req.user.id, 'CREATE', 'enseignants', enseignant_id, req.body, req.ip);
    
    // Tentative d'envoi de l'email
    const emailSent = await sendWelcomeEmail(email, tempPassword, nom, prenom);
    
    res.status(201).json({ 
      id: enseignant_id, 
      message: emailSent ? 'Enseignant créé et email envoyé' : 'Enseignant créé (échec envoi email)',
      tempPassword: emailSent ? null : tempPassword,
      emailSent
    });
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(400).json({ message: 'Email ou matricule déjà utilisé' });
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  } finally {
    conn.release();
  }
};

exports.update = async (req, res) => {
  const { nom, prenom, email, telephone, grade, statut, departement_id,
          taux_horaire_cm, taux_horaire_td, taux_horaire_tp, heures_contractuelles, matricule, matieres } = req.body;
          
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Récupérer l'enseignant et valider son appartenance
    const [enseignants] = await conn.execute('SELECT user_id, university_id FROM enseignants WHERE id = ?', [req.params.id]);
    if (!enseignants.length) {
      await conn.rollback();
      return res.status(404).json({ message: 'Enseignant introuvable' });
    }
    const { user_id: userId, university_id } = enseignants[0];

    if (req.user.role !== 'super_admin' && university_id !== req.user.university_id) {
      await conn.rollback();
      return res.status(403).json({ message: 'Accès interdit' });
    }

    // Mettre à jour l'enseignant
    await conn.execute(
      `UPDATE enseignants SET nom=?, prenom=?, email=?, telephone=?, grade=?, statut=?,
        departement_id=?, taux_horaire_cm=?, taux_horaire_td=?, taux_horaire_tp=?,
        heures_contractuelles=?, matricule=? WHERE id=?`,
      [nom, prenom, email, telephone || null, grade, statut, departement_id || null,
       taux_horaire_cm || 0, taux_horaire_td || 0, taux_horaire_tp || 0,
       heures_contractuelles || 192, matricule || null, req.params.id]
    );

    // Sync les matières — on ne supprime que les EN_ATTENTE
    if (matieres && Array.isArray(matieres)) {
      // Récupérer l'année académique active de cette université
      const [[activeYear]] = await conn.execute('SELECT id FROM annees_academiques WHERE is_active = 1 AND university_id = ? LIMIT 1', [university_id]);
      const anneeId = activeYear ? activeYear.id : null;

      // Sync ancienne table pour compatibilité
      await conn.execute('DELETE FROM enseignants_matieres WHERE enseignant_id = ?', [req.params.id]);
      if (matieres.length > 0) {
        const oldValues = matieres.map(m => [req.params.id, typeof m === 'object' ? m.id : m]);
        await conn.query('INSERT IGNORE INTO enseignants_matieres (enseignant_id, matiere_id) VALUES ?', [oldValues]);
      }

      // Sync table attributions_matieres (seulement les EN_ATTENTE)
      if (anneeId) {
        await conn.execute(
          `DELETE FROM attributions_matieres WHERE enseignant_id = ? AND annee_academique_id = ? AND statut = 'EN_ATTENTE'`,
          [req.params.id, anneeId]
        );
        for (const mat of matieres) {
          const matiereId = typeof mat === 'object' ? mat.id : mat;
          const semestre = typeof mat === 'object' ? (mat.semestre || 'S1') : 'S1';
          await conn.execute(
            `INSERT INTO attributions_matieres (enseignant_id, matiere_id, annee_academique_id, semestre, statut, university_id)
             VALUES (?, ?, ?, ?, 'EN_ATTENTE', ?)
             ON DUPLICATE KEY UPDATE semestre = VALUES(semestre)`,
            [req.params.id, matiereId, anneeId, semestre, university_id]
          );
        }
      }
    }

    if (userId) {
      await conn.execute('UPDATE users SET email = ?, nom = ?, prenom = ? WHERE id = ?', [email, nom, prenom, userId]);
    }

    // Recalculer le statut complémentaire si les heures contractuelles ont changé
    await recalculateComplementaryStatus(req.params.id, null);

    await conn.commit();
    await auditLog(req.user.id, 'UPDATE', 'enseignants', req.params.id, req.body, req.ip);
    res.json({ message: 'Enseignant mis à jour' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  } finally {
    conn.release();
  }
};

exports.delete = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Récupérer le user_id associé avant de supprimer l'enseignant
    const [enseignants] = await conn.execute('SELECT user_id, university_id FROM enseignants WHERE id = ?', [req.params.id]);
    if (!enseignants.length) {
      await conn.rollback();
      return res.status(404).json({ message: 'Enseignant introuvable' });
    }
    const { user_id: userId, university_id } = enseignants[0];

    if (req.user.role !== 'super_admin' && university_id !== req.user.university_id) {
      await conn.rollback();
      return res.status(403).json({ message: 'Accès interdit' });
    }

    // Supprimer l'enseignant
    await conn.execute('DELETE FROM enseignants WHERE id = ?', [req.params.id]);

    // Supprimer l'utilisateur associé
    if (userId) {
      await conn.execute('DELETE FROM users WHERE id = ?', [userId]);
    }

    await conn.commit();
    await auditLog(req.user.id, 'DELETE', 'enseignants', req.params.id, {}, req.ip);
    res.json({ message: 'Enseignant et compte utilisateur supprimés' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  } finally {
    conn.release();
  }
};

exports.getHeures = async (req, res) => {
  const { annee_id } = req.query;

  // Authorization check: enseignants can only access their own hours
  if (req.user.role === 'enseignant' && parseInt(req.user.enseignant_id) !== parseInt(req.params.id)) {
    return res.status(403).json({ message: 'Accès interdit - Vous ne pouvez consulter que vos propres informations.' });
  }

  try {
    if (req.user.role !== 'super_admin') {
      const [check] = await db.execute('SELECT university_id FROM enseignants WHERE id = ?', [req.params.id]);
      if (!check.length || check[0].university_id !== req.user.university_id) {
        return res.status(403).json({ message: 'Accès interdit' });
      }
    }

    let query = `SELECT h.*, m.intitule as matiere_nom, aa.libelle as annee_libelle
                 FROM heures_effectuees h
                 LEFT JOIN matieres m ON h.matiere_id = m.id
                 LEFT JOIN annees_academiques aa ON h.annee_academique_id = aa.id
                 WHERE h.enseignant_id = ?`;
    const params = [req.params.id];
    if (annee_id && annee_id !== 'ALL') { query += ' AND h.annee_academique_id = ?'; params.push(annee_id); }
    query += ' ORDER BY h.date_cours DESC';
    const [rows] = await db.execute(query, params);

    const [enseignant] = await db.execute(
      `SELECT e.*, u.avatar_url, d.nom AS departement_nom
       FROM enseignants e
       LEFT JOIN users u ON e.user_id = u.id
       LEFT JOIN departements d ON e.departement_id = d.id
       WHERE e.id = ?`,
      [req.params.id]
    );

    // Calcul précis des stats au prorata
    const seuil = Number(enseignant[0].heures_contractuelles || 0);
    const heuresChronologiques = [...rows].reverse();
    
    let cumulEquiv = 0;
    let cmNormal = 0, tdNormal = 0, tpNormal = 0;
    let cmComp = 0, tdComp = 0, tpComp = 0;
    let totalHeures = 0;

    for (const h of heuresChronologiques) {
      const dEquiv = Number(h.duree_equivalente || 0);
      const dReelle = Number(h.duree || 0);
      
      let partCompEquiv = 0;
      if (cumulEquiv >= seuil) {
        partCompEquiv = dEquiv;
      } else if (cumulEquiv + dEquiv > seuil) {
        partCompEquiv = dEquiv - (seuil - cumulEquiv);
      }

      const ratioComp = dEquiv > 0 ? (partCompEquiv / dEquiv) : 0;
      const dComp = dReelle * ratioComp;

      if (h.type_heure === 'CM') { cmComp += dComp; cmNormal += (dReelle - dComp); }
      else if (h.type_heure === 'TD') { tdComp += dComp; tdNormal += (dReelle - dComp); }
      else if (h.type_heure === 'TP') { tpComp += dComp; tpNormal += (dReelle - dComp); }

      totalHeures += dReelle;
      cumulEquiv += dEquiv;
    }

    const statsPropres = {
      total_cm: cmNormal + cmComp,
      total_td: tdNormal + tdComp,
      total_tp: tpNormal + tpComp,
      total_heures: totalHeures,
      heures_complementaires: cmComp + tdComp + tpComp
    };

    res.json({ heures: rows, stats: statsPropres, enseignant: enseignant[0] });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};
