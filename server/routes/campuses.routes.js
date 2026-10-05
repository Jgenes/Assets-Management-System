const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

// GET /api/v1/campuses
router.get('/', authenticateToken, (req, res) => {
  const campuses = db.query(`
    SELECT c.*,
           COUNT(DISTINCT b.id) as buildings_count,
           COUNT(DISTINCT a.id) as assets_count,
           COALESCE(SUM(a.acquisition_cost), 0) as total_asset_value
    FROM campuses c
    LEFT JOIN buildings b ON c.id = b.campus_id
    LEFT JOIN assets a ON c.id = a.campus_id
    GROUP BY c.id
    ORDER BY c.id ASC
  `);
  res.json({ success: true, campuses });
});

// GET /api/v1/campuses/:id
router.get('/:id', authenticateToken, (req, res) => {
  const campus = db.get('SELECT * FROM campuses WHERE id = ?', [req.params.id]);
  if (!campus) return res.status(404).json({ success: false, message: 'Campus not found.' });

  const buildings = db.query('SELECT * FROM buildings WHERE campus_id = ? ORDER BY name ASC', [req.params.id]);
  const faculties = db.query('SELECT * FROM faculties_schools WHERE campus_id = ? ORDER BY name ASC', [req.params.id]);

  res.json({ success: true, campus: { ...campus, buildings, faculties } });
});

// POST /api/v1/campuses
router.post('/', authenticateToken, requireRole('super_admin', 'asset_admin'), (req, res) => {
  try {
    const { code, name, location, address } = req.body;
    if (!code || !name) {
      return res.status(400).json({ success: false, message: 'Campus code and name are required.' });
    }

    const exists = db.get('SELECT id FROM campuses WHERE code = ?', [code.trim().toUpperCase()]);
    if (exists) {
      return res.status(400).json({ success: false, message: 'Campus code already exists.' });
    }

    const result = db.run(`
      INSERT INTO campuses (code, name, location, address)
      VALUES (?, ?, ?, ?)
    `, [code.trim().toUpperCase(), name.trim(), location || null, address || null]);

    const newId = Number(result.lastInsertRowid);
    logAudit(req, {
      action: 'CAMPUS_CREATED',
      entity_type: 'campus',
      entity_id: newId,
      entity_code: code,
      details: `Created campus: ${name} (${code})`
    });

    res.status(201).json({ success: true, message: 'Campus created successfully.', campusId: newId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/v1/campuses/:id
router.put('/:id', authenticateToken, requireRole('super_admin', 'asset_admin'), (req, res) => {
  try {
    const { name, location, address, is_active } = req.body;
    const existing = db.get('SELECT * FROM campuses WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ success: false, message: 'Campus not found.' });

    db.run(`
      UPDATE campuses
      SET name = ?, location = ?, address = ?, is_active = ?
      WHERE id = ?
    `, [
      name || existing.name,
      location !== undefined ? location : existing.location,
      address !== undefined ? address : existing.address,
      is_active !== undefined ? is_active : existing.is_active,
      req.params.id
    ]);

    logAudit(req, {
      action: 'CAMPUS_UPDATED',
      entity_type: 'campus',
      entity_id: req.params.id,
      entity_code: existing.code,
      details: `Updated campus: ${existing.code}`
    });

    res.json({ success: true, message: 'Campus updated successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/v1/campuses/:id
router.delete('/:id', authenticateToken, requireRole('super_admin'), (req, res) => {
  try {
    const existing = db.get('SELECT * FROM campuses WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ success: false, message: 'Campus not found.' });

    const buildingsCount = db.get('SELECT COUNT(*) as count FROM buildings WHERE campus_id = ?', [req.params.id]);
    if (buildingsCount.count > 0) {
      return res.status(400).json({ success: false, message: 'Cannot delete campus with associated buildings.' });
    }

    db.run('DELETE FROM campuses WHERE id = ?', [req.params.id]);
    logAudit(req, {
      action: 'CAMPUS_DELETED',
      entity_type: 'campus',
      entity_id: req.params.id,
      entity_code: existing.code,
      details: `Deleted campus: ${existing.name}`
    });

    res.json({ success: true, message: 'Campus deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
