const db = require('../config/database');

const auditLog = async (userId, action, table, recordId, details, ip) => {
  try {
    let universityId = null;
    if (userId) {
      const [u] = await db.execute('SELECT university_id FROM users WHERE id = ?', [userId]);
      if (u.length) universityId = u[0].university_id;
    }
    await db.execute(
      'INSERT INTO audit_logs (user_id, action, table_concernee, enregistrement_id, details, ip_address, university_id) VALUES (?,?,?,?,?,?,?)',
      [userId, action, table, recordId, JSON.stringify(details), ip, universityId]
    );
  } catch (e) {
    console.error('Audit log error:', e.message);
  }
};

module.exports = { auditLog };
