const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

// GET /api/v1/staff
router.get('/', authenticateToken, (req, res) => {
  const { department_id } = req.query;
  let sql = `
    SELECT s.*, d.name as department_name, d.code as department_code,
           COUNT(DISTINCT a.id) as assigned_assets_count,
           COALESCE(SUM(a.acquisition_cost), 0) as total_custody_value
    FROM staff s
    LEFT JOIN departments d ON s.department_id = d.id
    LEFT JOIN assets a ON s.id = a.custodian_id
    WHERE 1=1
  `;
  const params = [];
  if (department_id) {
    sql += ' AND s.department_id = ?';
    params.push(department_id);
  }
  sql += ' GROUP BY s.id ORDER BY s.first_name ASC, s.last_name ASC';

  const staff = db.query(sql, params);
  res.json({ success: true, staff });
});

// GET /api/v1/staff/:id
router.get('/:id', authenticateToken, (req, res) => {
  const member = db.get(`
    SELECT s.*, d.name as department_name, d.code as department_code
    FROM staff s
    LEFT JOIN departments d ON s.department_id = d.id
    WHERE s.id = ?
  `, [req.params.id]);

  if (!member) return res.status(404).json({ success: false, message: 'Staff member not found.' });

  const assignedAssets = db.query(`
    SELECT a.*, c.name as category_name, b.name as building_name, r.room_name, r.room_code
    FROM assets a
    LEFT JOIN asset_categories c ON a.category_id = c.id
    LEFT JOIN buildings b ON a.building_id = b.id
    LEFT JOIN rooms r ON a.room_id = r.id
    WHERE a.custodian_id = ?
    ORDER BY a.name ASC
  `, [member.id]);

  res.json({ success: true, staff: { ...member, assignedAssets } });
});

// GET /api/v1/staff/:id/register
// Generates official Custodian Asset Register with acknowledgement data
router.get('/:id/register', authenticateToken, (req, res) => {
  const member = db.get(`
    SELECT s.*, d.name as department_name, d.code as department_code
    FROM staff s
    LEFT JOIN departments d ON s.department_id = d.id
    WHERE s.id = ?
  `, [req.params.id]);

  if (!member) return res.status(404).json({ success: false, message: 'Staff member not found.' });

  const assets = db.query(`
    SELECT a.id, a.asset_number, a.barcode, a.name, a.serial_number, a.model, a.brand,
           c.name as category_name, b.name as building_name, r.room_name, r.room_code,
           a.condition, a.status, a.date_assigned, a.acquisition_cost, a.current_book_value
    FROM assets a
    LEFT JOIN asset_categories c ON a.category_id = c.id
    LEFT JOIN buildings b ON a.building_id = b.id
    LEFT JOIN rooms r ON a.room_id = r.id
    WHERE a.custodian_id = ?
    ORDER BY a.name ASC
  `, [member.id]);

  const totalValue = assets.reduce((sum, a) => sum + (Number(a.acquisition_cost) || 0), 0);
  const totalBookValue = assets.reduce((sum, a) => sum + (Number(a.current_book_value) || 0), 0);

  res.json({
    success: true,
    register: {
      generatedAt: new Date().toISOString(),
      institution: 'Moshi Co-operative University (MoCU)',
      custodian: member,
      totalAssetsCount: assets.length,
      totalAcquisitionCost: totalValue,
      totalCurrentBookValue: totalBookValue,
      assets
    }
  });
});

// POST /api/v1/staff
router.post('/', authenticateToken, requireRole('super_admin', 'asset_admin'), (req, res) => {
  try {
    const { staff_id, first_name, last_name, email, phone, department_id, position, title } = req.body;
    if (!staff_id || !first_name || !last_name) {
      return res.status(400).json({ success: false, message: 'Staff ID, first name and last name are required.' });
    }

    const exists = db.get('SELECT id FROM staff WHERE staff_id = ?', [staff_id.trim()]);
    if (exists) {
      return res.status(400).json({ success: false, message: 'Staff ID already exists.' });
    }

    const result = db.run(`
      INSERT INTO staff (staff_id, first_name, last_name, email, phone, department_id, position, title)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      staff_id.trim(),
      first_name.trim(),
      last_name.trim(),
      email || null,
      phone || null,
      department_id || null,
      position || null,
      title || null
    ]);

    const newId = Number(result.lastInsertRowid);
    logAudit(req, {
      action: 'STAFF_CREATED',
      entity_type: 'staff',
      entity_id: newId,
      entity_code: staff_id,
      details: `Registered staff custodian: ${first_name} ${last_name} (${staff_id})`
    });

    res.status(201).json({ success: true, message: 'Staff member registered.', staffId: newId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/v1/staff/:id
router.put('/:id', authenticateToken, requireRole('super_admin', 'asset_admin'), (req, res) => {
  try {
    const { first_name, last_name, email, phone, department_id, position, title, status } = req.body;
    const existing = db.get('SELECT * FROM staff WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ success: false, message: 'Staff member not found.' });

    db.run(`
      UPDATE staff
      SET first_name = ?, last_name = ?, email = ?, phone = ?,
          department_id = ?, position = ?, title = ?, status = ?
      WHERE id = ?
    `, [
      first_name || existing.first_name,
      last_name || existing.last_name,
      email !== undefined ? email : existing.email,
      phone !== undefined ? phone : existing.phone,
      department_id !== undefined ? department_id : existing.department_id,
      position !== undefined ? position : existing.position,
      title !== undefined ? title : existing.title,
      status || existing.status,
      req.params.id
    ]);

    res.json({ success: true, message: 'Staff details updated.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
