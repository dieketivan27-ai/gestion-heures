const db = require('../config/database');

const auditLog = async (userId, action, table, recordId, details, ip) => {
  try {
    await db.execute(
      'INSERT INTO audit_logs (user_id, action, table_concernee, enregistrement_id, details, ip_address) VALUES (?,?,?,?,?,?)',
      [userId, action, table, recordId, JSON.stringify(details), ip]
    );
  } catch (e) {
    console.error('Audit log error:', e.message);
  }
};

module.exports = { auditLog };
