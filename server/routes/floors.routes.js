const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

// GET /api/v1/floors?building_id=...
router.get('/', authenticateToken, (req, res) => {
  const { building_id } = req.query;
  let sql = 'SELECT * FROM floors';
  const params = [];
  if (building_id) {
    sql += ' WHERE building_id = ?';
    params.push(building_id);
  }
  sql += ' ORDER BY floor_number ASC';
  const floors = db.query(sql, params);
  res.json({ success: true, floors });
});

// POST /api/v1/floors
router.post('/', authenticateToken, requireRole('super_admin', 'asset_admin'), (req, res) => {
  try {
    const { building_id, floor_number, floor_name } = req.body;
    if (!building_id || floor_number === undefined || !floor_name) {
      return res.status(400).json({ success: false, message: 'Building, floor number, and name are required.' });
    }

    const result = db.run(`
      INSERT INTO floors (building_id, floor_number, floor_name)
      VALUES (?, ?, ?)
    `, [building_id, floor_number, floor_name.trim()]);

    res.status(201).json({ success: true, floorId: Number(result.lastInsertRowid) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
