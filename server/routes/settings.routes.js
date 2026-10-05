const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

// GET /api/v1/settings
router.get('/', authenticateToken, (req, res) => {
  const settings = db.query('SELECT * FROM system_settings ORDER BY key ASC');
  const obj = {};
  settings.forEach(s => {
    obj[s.key] = s.value;
  });
  res.json({ success: true, settings: obj });
});

// PUT /api/v1/settings
router.put('/', authenticateToken, requireRole('super_admin'), (req, res) => {
  try {
    const updates = req.body;
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ success: false, message: 'Invalid payload.' });
    }

    db.transaction(() => {
      const stmt = db.getRawDb().prepare('INSERT OR REPLACE INTO system_settings (key, value, description) VALUES (?, ?, ?)');
      for (const [k, v] of Object.entries(updates)) {
        stmt.run(k, String(v), `Configured setting: ${k}`);
      }
    });

    logAudit(req, {
      action: 'SETTINGS_UPDATED',
      entity_type: 'settings',
      entity_id: null,
      entity_code: 'SYS-CONFIG',
      details: 'Updated institutional system settings'
    });

    res.json({ success: true, message: 'Settings saved successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
