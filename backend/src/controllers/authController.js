const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { auditLog } = require('../middleware/audit');
const crypto = require('crypto');
const emailService = require('../config/emailService');

exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: 'Email et mot de passe requis' });

  try {
    const [rows] = await db.execute(
      `SELECT u.id, u.email, u.password, u.role, u.is_active, u.nom, u.prenom, u.telephone, u.avatar_url, u.must_change_password,
              e.id as enseignant_id
       FROM users u
       LEFT JOIN enseignants e ON e.user_id = u.id
       WHERE u.email = ? AND u.is_active = 1`,
      [email]
    );
    if (!rows.length)
      return res.status(401).json({ message: 'Identifiants incorrects' });

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid)
      return res.status(401).json({ message: 'Identifiants incorrects' });

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        enseignant_id: user.enseignant_id,
        must_change_password: user.must_change_password
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    await auditLog(user.id, 'LOGIN', 'users', user.id, { email }, req.ip);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        nom: user.nom || '',
        prenom: user.prenom || '',
        telephone: user.telephone || '',
        avatar_url: user.avatar_url,
        enseignant_id: user.enseignant_id,
        must_change_password: !!user.must_change_password
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ message: 'Le nouveau mot de passe doit contenir au moins 6 caractères' });
  }

  try {
    const [rows] = await db.execute('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!rows.length) return res.status(404).json({ message: 'Utilisateur introuvable' });
    const valid = await bcrypt.compare(oldPassword, rows[0].password);
    if (!valid) return res.status(400).json({ message: 'Ancien mot de passe incorrect' });
    const hash = await bcrypt.hash(newPassword, 10);
    await db.execute('UPDATE users SET password = ?, must_change_password = FALSE WHERE id = ?', [hash, req.user.id]);
    res.json({ message: 'Mot de passe modifié avec succès' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.changeFirstPassword = async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 6 caractères' });
  }

  try {
    const hash = await bcrypt.hash(newPassword, 10);
    await db.execute(
      'UPDATE users SET password = ?, must_change_password = FALSE WHERE id = ?',
      [hash, req.user.id]
    );
    res.json({ message: 'Mot de passe initialisé avec succès' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.me = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT u.id, u.email, u.role, u.avatar_url, u.nom, u.prenom, u.telephone, 
              e.id as enseignant_id, e.grade, e.statut, e.departement_id
       FROM users u 
       LEFT JOIN enseignants e ON e.user_id = u.id 
       WHERE u.id = ?`,
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Utilisateur introuvable' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email requis' });

  try {
    const [users] = await db.execute('SELECT * FROM users WHERE email = ? AND is_active = 1', [email]);
    if (!users.length) return res.status(404).json({ message: 'Aucun compte associé à cet email' });

    const user = users[0];
    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 6);

    await db.execute(
      'UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?',
      [token, expiry, user.id]
    );

    // Get enseignant name if available
    const [ens] = await db.execute('SELECT nom, prenom FROM enseignants WHERE user_id = ?', [user.id]);
    const name = ens.length ? `${ens[0].prenom} ${ens[0].nom}` : 'Utilisateur';

    const sent = await emailService.sendResetPasswordEmail(email, token, name);

    if (sent) {
      console.log(`✅ Email de réinitialisation envoyé à ${email}`);
      await auditLog(user.id, 'FORGOT_PASSWORD_REQUEST', 'users', user.id, { email }, req.ip);
      res.json({ message: 'Lien de réinitialisation envoyé par email' });
    } else {
      console.error(`❌ Échec de l'envoi de l'email de réinitialisation à ${email}`);
      res.status(500).json({ message: "Erreur lors de l'envoi de l'email" });
    }
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return res.status(400).json({ message: 'Token et nouveau mot de passe requis' });

  try {
    const [users] = await db.execute(
      'SELECT * FROM users WHERE reset_token = ? AND reset_token_expiry > NOW() AND is_active = 1',
      [token]
    );

    if (!users.length) return res.status(400).json({ message: 'Lien invalide ou expiré' });

    const user = users[0];
    const hash = await bcrypt.hash(newPassword, 10);

    await db.execute(
      'UPDATE users SET password = ?, reset_token = NULL, reset_token_expiry = NULL, must_change_password = 0 WHERE id = ?',
      [hash, user.id]
    );

    await auditLog(user.id, 'PASSWORD_RESET_SUCCESS', 'users', user.id, {}, req.ip);
    res.json({ message: 'Votre mot de passe a été réinitialisé avec succès' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.updateProfile = async (req, res) => {
  console.log('--- BACKEND: updateProfile hit ---');
  console.log('Body:', req.body);
  console.log('User ID:', req.user.id);
  
  const { nom, prenom, email, telephone } = req.body;
  const userId = req.user.id;

  if (!nom || !prenom || !email) {
    return res.status(400).json({ message: 'Nom, prénom et email sont requis' });
  }

  try {
    // 1. Check if email is already taken by another user
    const [existing] = await db.execute('SELECT id FROM users WHERE email = ? AND id != ?', [email, userId]);
    if (existing.length) return res.status(400).json({ message: 'Cet email est déjà utilisé' });

    // 2. Update users table (master record)
    await db.execute(
      'UPDATE users SET email = ?, nom = ?, prenom = ?, telephone = ? WHERE id = ?',
      [email, nom.toUpperCase().trim(), prenom.trim(), telephone || null, userId]
    );

    // 3. Synchronize with enseignants table if linked
    const [ens] = await db.execute('SELECT id FROM enseignants WHERE user_id = ?', [userId]);
    if (ens.length) {
      await db.execute(
        'UPDATE enseignants SET nom = ?, prenom = ?, email = ?, telephone = ? WHERE user_id = ?',
        [nom.toUpperCase().trim(), prenom.trim(), email, telephone || null, userId]
      );
    }

    await auditLog(userId, 'UPDATE_PROFILE', 'users', userId, { email, nom, prenom }, req.ip);

    res.json({
      message: 'Profil mis à jour avec succès',
      user: { nom: nom.toUpperCase().trim(), prenom: prenom.trim(), email, telephone }
    });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.updateAvatar = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Aucun fichier envoyé' });

  const userId = req.user.id;
  const avatarUrl = `/uploads/avatars/${req.file.filename}`;
  const path = require('path');
  const fs = require('fs');

  try {
    // Delete old avatar file if it exists
    const [rows] = await db.execute('SELECT avatar_url FROM users WHERE id = ?', [userId]);
    if (rows.length && rows[0].avatar_url) {
      const oldPath = path.resolve(__dirname, '../uploads', rows[0].avatar_url.replace('/uploads/', ''));
      if (fs.existsSync(oldPath)) {
        try { fs.unlinkSync(oldPath); } catch(e) { /* ignore */ }
      }
    }

    await db.execute('UPDATE users SET avatar_url = ? WHERE id = ?', [avatarUrl, userId]);
    await auditLog(userId, 'UPDATE_AVATAR', 'users', userId, { avatarUrl }, req.ip);
    res.json({ message: 'Photo de profil mise à jour', avatarUrl });
  } catch (err) {
    // Clean up uploaded file on DB error
    const fs = require('fs');
    try { fs.unlinkSync(req.file.path); } catch(e) {}
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.deleteAvatar = async (req, res) => {
  const userId = req.user.id;

  try {
    await db.execute('UPDATE users SET avatar_url = NULL WHERE id = ?', [userId]);
    await auditLog(userId, 'DELETE_AVATAR', 'users', userId, {}, req.ip);
    res.json({ message: 'Photo de profil supprimée' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};
