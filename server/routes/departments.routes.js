const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

// GET /api/v1/departments
router.get('/', authenticateToken, (req, res) => {
  const departments = db.query(`
    SELECT d.*, f.name as faculty_name,
           COUNT(DISTINCT s.id) as staff_count,
           COUNT(DISTINCT r.id) as rooms_count,
           COUNT(DISTINCT a.id) as assets_count,
           COALESCE(SUM(a.acquisition_cost), 0) as total_asset_value
    FROM departments d
    LEFT JOIN faculties_schools f ON d.faculty_id = f.id
    LEFT JOIN staff s ON d.id = s.department_id
    LEFT JOIN rooms r ON d.id = r.department_id
    LEFT JOIN assets a ON d.id = a.department_id
    GROUP BY d.id
    ORDER BY d.name ASC
  `);
  res.json({ success: true, departments });
});

// GET /api/v1/departments/:id
router.get('/:id', authenticateToken, (req, res) => {
  const department = db.get(`
    SELECT d.*, f.name as faculty_name, f.code as faculty_code
    FROM departments d
    LEFT JOIN faculties_schools f ON d.faculty_id = f.id
    WHERE d.id = ?
  `, [req.params.id]);

  if (!department) return res.status(404).json({ success: false, message: 'Department not found.' });

  const staff = db.query('SELECT * FROM staff WHERE department_id = ? ORDER BY first_name ASC', [req.params.id]);
  const rooms = db.query(`
    SELECT r.*, b.name as building_name
    FROM rooms r
    JOIN buildings b ON r.building_id = b.id
    WHERE r.department_id = ?
    ORDER BY r.room_code ASC
  `, [req.params.id]);

  res.json({ success: true, department: { ...department, staff, rooms } });
});

// GET /api/v1/departments/:id/hierarchy
// Full drilldown: Department -> Buildings -> Offices -> Staff -> Assets
router.get('/:id/hierarchy', authenticateToken, (req, res) => {
  const department = db.get('SELECT * FROM departments WHERE id = ?', [req.params.id]);
  if (!department) return res.status(404).json({ success: false, message: 'Department not found.' });

  // Find all buildings housing assets or rooms of this department
  const buildings = db.query(`
    SELECT DISTINCT b.id, b.code, b.name
    FROM buildings b
    WHERE b.id IN (
      SELECT building_id FROM rooms WHERE department_id = ?
      UNION
      SELECT building_id FROM assets WHERE department_id = ?
    )
  `, [department.id, department.id]);

  const hierarchy = buildings.map(bld => {
    // Rooms in this building for this department
    const rooms = db.query(`
      SELECT r.id, r.room_code, r.room_name, r.location_type,
             s.staff_id as custodian_staff_id, (s.first_name || ' ' || s.last_name) as custodian_name
      FROM rooms r
      LEFT JOIN staff s ON r.responsible_staff_id = s.id
      WHERE r.building_id = ? AND (r.department_id = ? OR r.department_id IS NULL)
    `, [bld.id, department.id]);

    const roomsWithAssets = rooms.map(rm => {
      const assets = db.query(`
        SELECT a.id, a.asset_number, a.barcode, a.name, a.condition, a.status,
               a.current_book_value, (st.first_name || ' ' || st.last_name) as custodian_name
        FROM assets a
        LEFT JOIN staff st ON a.custodian_id = st.id
        WHERE a.room_id = ? AND a.department_id = ?
      `, [rm.id, department.id]);

      return {
        ...rm,
        assets
      };
    });

    return {
      ...bld,
      rooms: roomsWithAssets
    };
  });

  const departmentStaff = db.query(`
    SELECT s.id, s.staff_id, (s.first_name || ' ' || s.last_name) as staff_name, s.position,
           COUNT(a.id) as assigned_assets_count,
           COALESCE(SUM(a.acquisition_cost), 0) as total_value
    FROM staff s
    LEFT JOIN assets a ON s.id = a.custodian_id
    WHERE s.department_id = ?
    GROUP BY s.id
  `, [department.id]);

  res.json({
    success: true,
    department,
    buildings: hierarchy,
    staff: departmentStaff
  });
});

// POST /api/v1/departments
router.post('/', authenticateToken, requireRole('super_admin', 'asset_admin'), (req, res) => {
  try {
    const { faculty_id, code, name, head_of_department, contact_email, contact_phone, description } = req.body;
    if (!code || !name) {
      return res.status(400).json({ success: false, message: 'Department code and name are required.' });
    }

    const exists = db.get('SELECT id FROM departments WHERE code = ?', [code.trim().toUpperCase()]);
    if (exists) {
      return res.status(400).json({ success: false, message: 'Department code already exists.' });
    }

    const result = db.run(`
      INSERT INTO departments (faculty_id, code, name, head_of_department, contact_email, contact_phone, description)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      faculty_id || null,
      code.trim().toUpperCase(),
      name.trim(),
      head_of_department || null,
      contact_email || null,
      contact_phone || null,
      description || null
    ]);

    const newId = Number(result.lastInsertRowid);
    logAudit(req, {
      action: 'DEPARTMENT_CREATED',
      entity_type: 'department',
      entity_id: newId,
      entity_code: code,
      details: `Created department: ${name}`
    });

    res.status(201).json({ success: true, message: 'Department created successfully.', departmentId: newId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/v1/departments/:id
router.put('/:id', authenticateToken, requireRole('super_admin', 'asset_admin'), (req, res) => {
  try {
    const { faculty_id, name, head_of_department, contact_email, contact_phone, description, status } = req.body;
    const existing = db.get('SELECT * FROM departments WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ success: false, message: 'Department not found.' });

    db.run(`
      UPDATE departments
      SET faculty_id = ?, name = ?, head_of_department = ?, contact_email = ?,
          contact_phone = ?, description = ?, status = ?
      WHERE id = ?
    `, [
      faculty_id !== undefined ? faculty_id : existing.faculty_id,
      name || existing.name,
      head_of_department !== undefined ? head_of_department : existing.head_of_department,
      contact_email !== undefined ? contact_email : existing.contact_email,
      contact_phone !== undefined ? contact_phone : existing.contact_phone,
      description !== undefined ? description : existing.description,
      status || existing.status,
      req.params.id
    ]);

    res.json({ success: true, message: 'Department updated successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
