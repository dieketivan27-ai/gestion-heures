const db = require('../config/database');
const bcrypt = require('bcrypt');
const { auditLog } = require('../middleware/audit');

/**
 * Récupère tous les utilisateurs avec leurs infos de base
 */
exports.getUsers = async (req, res) => {
  try {
    let query = `
      SELECT u.id, u.email, u.role, u.is_active, u.created_at, u.university_id,
             COALESCE(NULLIF(u.nom, ''), e.nom) as nom,
             COALESCE(NULLIF(u.prenom, ''), e.prenom) as prenom,
             COALESCE(NULLIF(u.telephone, ''), e.telephone) as telephone,
             e.id as enseignant_id,
             univ.nom as university_nom
      FROM users u
      LEFT JOIN enseignants e ON e.user_id = u.id
      LEFT JOIN universities univ ON u.university_id = univ.id
    `;
    const params = [];
    if (req.user.role !== 'super_admin' || req.user.university_id) {
      query += ' WHERE u.university_id = ?';
      params.push(req.user.university_id);
    }
    query += ' ORDER BY u.created_at DESC';
    const [rows] = await db.execute(query, params);
    res.json(rows);
  } catch (err) {
    console.error('getUsers error:', err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

/**
 * Crée un nouvel utilisateur (Admin, RH ou Enseignant)
 */
exports.createUser = async (req, res) => {
  const { nom, prenom, email, role, password, telephone } = req.body;
  const university_id = req.user.role === 'super_admin' ? req.body.university_id : req.user.university_id;
  
  if (!email || !role || !password || !nom || !prenom) {
    return res.status(400).json({ message: 'Données obligatoires manquantes' });
  }

  if (role === 'super_admin' && req.user.role !== 'super_admin') {
    return res.status(403).json({ message: 'Seul un super_admin peut créer un compte super_admin.' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    
    // Vérifier si l'email existe déjà
    const [existing] = await conn.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length) {
      await conn.rollback();
      return res.status(400).json({ message: 'Cet email est déjà utilisé' });
    }

    const hash = await bcrypt.hash(password, 10);
    const [userRes] = await conn.execute(
      'INSERT INTO users (nom, prenom, email, role, password, telephone, is_active, university_id) VALUES (?,?,?,?,?,?,TRUE,?)',
      [nom.toUpperCase().trim(), prenom.trim(), email.toLowerCase().trim(), role, hash, telephone || null, university_id]
    );
    const userId = userRes.insertId;

    await conn.commit();
    await auditLog(req.user.id, 'CREATE_USER', 'users', userId, { email, role }, req.ip);
    res.status(201).json({ id: userId, message: 'Utilisateur créé avec succès' });
  } catch (err) {
    await conn.rollback();
    console.error('createUser error:', err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  } finally {
    conn.release();
  }
};

/**
 * Met à jour un utilisateur
 */
exports.updateUser = async (req, res) => {
  const { nom, prenom, email, role, is_active, telephone } = req.body;
  const university_id = req.user.role === 'super_admin' ? req.body.university_id : req.user.university_id;
  const { id } = req.params;

  if (!email || !role || !nom || !prenom) {
    return res.status(400).json({ message: 'Données obligatoires manquantes' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    if (req.user.role !== 'super_admin') {
      const [check] = await conn.execute('SELECT university_id FROM users WHERE id = ?', [id]);
      if (!check.length || check[0].university_id !== req.user.university_id) {
        await conn.rollback();
        return res.status(403).json({ message: 'Accès interdit' });
      }
    }
    
    // Vérifier l'email
    const [existing] = await conn.execute('SELECT id FROM users WHERE email = ? AND id != ?', [email, id]);
    if (existing.length) {
      await conn.rollback();
      return res.status(400).json({ message: 'Cet email est déjà utilisé' });
    }

    // Mise à jour users
    await conn.execute(
      'UPDATE users SET nom=?, prenom=?, email=?, role=?, is_active=?, telephone=?, university_id=? WHERE id=?',
      [nom.toUpperCase().trim(), prenom.trim(), email.toLowerCase().trim(), role, is_active, telephone || null, university_id, id]
    );

    // Sync avec enseignants si existant
    await conn.execute(
      'UPDATE enseignants SET nom=?, prenom=?, email=?, telephone=?, university_id=? WHERE user_id=?',
      [nom.toUpperCase().trim(), prenom.trim(), email.toLowerCase().trim(), telephone || null, university_id, id]
    );

    await conn.commit();
    await auditLog(req.user.id, 'UPDATE_USER', 'users', id, { email, role, is_active }, req.ip);
    res.json({ message: 'Utilisateur mis à jour avec succès' });
  } catch (err) {
    await conn.rollback();
    console.error('updateUser error:', err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  } finally {
    conn.release();
  }
};

/**
 * Supprime un utilisateur (et son profil enseignant)
 */
exports.deleteUser = async (req, res) => {
  const { id } = req.params;

  if (parseInt(id) === req.user.id) {
    return res.status(400).json({ message: 'Action impossible : vous ne pouvez pas supprimer votre propre compte' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    if (req.user.role !== 'super_admin') {
      const [check] = await conn.execute('SELECT university_id FROM users WHERE id = ?', [id]);
      if (!check.length || check[0].university_id !== req.user.university_id) {
        await conn.rollback();
        return res.status(403).json({ message: 'Accès interdit' });
      }
    }

    // 1. Supprimer l'enseignant associé
    await conn.execute('DELETE FROM enseignants WHERE user_id = ?', [id]);
    
    // 2. Supprimer l'utilisateur
    const [resDel] = await conn.execute('DELETE FROM users WHERE id = ?', [id]);
    
    if (resDel.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Utilisateur introuvable' });
    }

    await conn.commit();
    await auditLog(req.user.id, 'DELETE_USER', 'users', id, {}, req.ip);
    res.json({ message: 'Utilisateur supprimé avec succès' });
  } catch (err) {
    await conn.rollback();
    console.error('deleteUser error:', err);
    res.status(500).json({ message: 'Erreur serveur (vérifiez les dépendances)', error: err.message });
  } finally {
    conn.release();
  }
};

/**
 * Active/Désactive un utilisateur rapidement
 */
exports.toggleStatus = async (req, res) => {
  const { id } = req.params;
  
  if (parseInt(id) === req.user.id) {
    return res.status(400).json({ message: 'Impossible de changer votre propre statut' });
  }

  try {
    if (req.user.role !== 'super_admin') {
      const [check] = await db.execute('SELECT university_id FROM users WHERE id = ?', [id]);
      if (!check.length || check[0].university_id !== req.user.university_id) {
        return res.status(403).json({ message: 'Accès interdit' });
      }
    }

    await db.execute('UPDATE users SET is_active = NOT is_active WHERE id = ?', [id]);
    await auditLog(req.user.id, 'TOGGLE_USER_STATUS', 'users', id, {}, req.ip);
    res.json({ message: 'Statut mis à jour' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};
