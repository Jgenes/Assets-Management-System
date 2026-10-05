const db = require('../db/database');

function logAudit(req, { action, entity_type, entity_id, entity_code, old_values, new_values, details }) {
  try {
    const userId = req && req.user ? req.user.id : null;
    const userName = req && req.user ? req.user.full_name : 'System';
    const ip = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1') : '127.0.0.1';
    const userAgent = req ? (req.headers['user-agent'] || 'Unknown') : 'System';

    db.run(`
      INSERT INTO audit_logs (
        user_id, user_name, action, entity_type, entity_id, entity_code,
        old_values, new_values, ip_address, user_agent, details
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      userId,
      userName,
      action,
      entity_type,
      entity_id || null,
      entity_code || null,
      old_values ? JSON.stringify(old_values) : null,
      new_values ? JSON.stringify(new_values) : null,
      ip,
      userAgent,
      details || null
    ]);
  } catch (err) {
    console.error('Failed to write audit log:', err.message);
  }
}

module.exports = { logAudit };
