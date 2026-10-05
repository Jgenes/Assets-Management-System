const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

// GET /api/v1/faculties
router.get('/', authenticateToken, (req, res) => {
  const faculties = db.query(`
    SELECT f.*, c.name as campus_name,
           COUNT(DISTINCT d.id) as departments_count
    FROM faculties_schools f
    LEFT JOIN campuses c ON f.campus_id = c.id
    LEFT JOIN departments d ON f.id = d.faculty_id
    GROUP BY f.id
    ORDER BY f.name ASC
  `);
  res.json({ success: true, faculties });
});

// POST /api/v1/faculties
router.post('/', authenticateToken, requireRole('super_admin', 'asset_admin'), (req, res) => {
  try {
    const { campus_id, code, name, type, dean_director } = req.body;
    if (!code || !name) {
      return res.status(400).json({ success: false, message: 'Faculty code and name are required.' });
    }

    const exists = db.get('SELECT id FROM faculties_schools WHERE code = ?', [code.trim().toUpperCase()]);
    if (exists) {
      return res.status(400).json({ success: false, message: 'Code already exists.' });
    }

    const result = db.run(`
      INSERT INTO faculties_schools (campus_id, code, name, type, dean_director)
      VALUES (?, ?, ?, ?, ?)
    `, [campus_id || null, code.trim().toUpperCase(), name.trim(), type || 'faculty', dean_director || null]);

    const newId = Number(result.lastInsertRowid);
    logAudit(req, {
      action: 'FACULTY_CREATED',
      entity_type: 'faculty',
      entity_id: newId,
      entity_code: code,
      details: `Created faculty/school: ${name}`
    });

    res.status(201).json({ success: true, message: 'Faculty/School created.', facultyId: newId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/v1/faculties/:id
router.put('/:id', authenticateToken, requireRole('super_admin', 'asset_admin'), (req, res) => {
  try {
    const { campus_id, name, type, dean_director, is_active } = req.body;
    const existing = db.get('SELECT * FROM faculties_schools WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ success: false, message: 'Faculty not found.' });

    db.run(`
      UPDATE faculties_schools
      SET campus_id = ?, name = ?, type = ?, dean_director = ?, is_active = ?
      WHERE id = ?
    `, [
      campus_id !== undefined ? campus_id : existing.campus_id,
      name || existing.name,
      type || existing.type,
      dean_director !== undefined ? dean_director : existing.dean_director,
      is_active !== undefined ? is_active : existing.is_active,
      req.params.id
    ]);

    res.json({ success: true, message: 'Faculty updated successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
