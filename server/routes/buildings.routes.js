const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

// GET /api/v1/buildings
router.get('/', authenticateToken, (req, res) => {
  const buildings = db.query(`
    SELECT b.*, cp.name as campus_name,
           COUNT(DISTINCT r.id) as rooms_count,
           COUNT(DISTINCT a.id) as assets_count,
           COALESCE(SUM(a.acquisition_cost), 0) as total_asset_value,
           COALESCE(SUM(a.current_book_value), 0) as total_book_value
    FROM buildings b
    LEFT JOIN campuses cp ON b.campus_id = cp.id
    LEFT JOIN rooms r ON b.id = r.building_id
    LEFT JOIN assets a ON b.id = a.building_id
    GROUP BY b.id
    ORDER BY b.name ASC
  `);
  res.json({ success: true, buildings });
});

// GET /api/v1/buildings/:id
router.get('/:id', authenticateToken, (req, res) => {
  const building = db.get(`
    SELECT b.*, cp.name as campus_name, cp.code as campus_code
    FROM buildings b
    LEFT JOIN campuses cp ON b.campus_id = cp.id
    WHERE b.id = ?
  `, [req.params.id]);

  if (!building) return res.status(404).json({ success: false, message: 'Building not found.' });

  const floors = db.query('SELECT * FROM floors WHERE building_id = ? ORDER BY floor_number ASC', [building.id]);
  const rooms = db.query(`
    SELECT r.*, d.name as department_name, (s.first_name || ' ' || s.last_name) as responsible_staff_name,
           COUNT(a.id) as assets_count,
           COALESCE(SUM(a.acquisition_cost), 0) as room_asset_value
    FROM rooms r
    LEFT JOIN departments d ON r.department_id = d.id
    LEFT JOIN staff s ON r.responsible_staff_id = s.id
    LEFT JOIN assets a ON r.id = a.room_id
    WHERE r.building_id = ?
    GROUP BY r.id
    ORDER BY r.room_code ASC
  `, [building.id]);

  res.json({ success: true, building: { ...building, floors, rooms } });
});

// GET /api/v1/buildings/:id/summary
// Summary of asset value, condition breakdown, and verification status per building
router.get('/:id/summary', authenticateToken, (req, res) => {
  const building = db.get('SELECT * FROM buildings WHERE id = ?', [req.params.id]);
  if (!building) return res.status(404).json({ success: false, message: 'Building not found.' });

  const stats = db.get(`
    SELECT COUNT(a.id) as total_assets,
           COALESCE(SUM(a.acquisition_cost), 0) as total_cost,
           COALESCE(SUM(a.current_book_value), 0) as total_current_value,
           SUM(CASE WHEN a.condition = 'good' THEN 1 ELSE 0 END) as good_count,
           SUM(CASE WHEN a.condition = 'new' THEN 1 ELSE 0 END) as new_count,
           SUM(CASE WHEN a.condition = 'fair' THEN 1 ELSE 0 END) as fair_count,
           SUM(CASE WHEN a.condition = 'poor' THEN 1 ELSE 0 END) as poor_count,
           SUM(CASE WHEN a.condition = 'damaged' THEN 1 ELSE 0 END) as damaged_count,
           SUM(CASE WHEN a.condition = 'obsolete' THEN 1 ELSE 0 END) as obsolete_count,
           SUM(CASE WHEN a.last_verified_at IS NOT NULL THEN 1 ELSE 0 END) as verified_count,
           SUM(CASE WHEN a.last_verified_at IS NULL THEN 1 ELSE 0 END) as unverified_count
    FROM assets a
    WHERE a.building_id = ?
  `, [building.id]);

  res.json({ success: true, building, stats });
});

// GET /api/v1/buildings/:id/assets
router.get('/:id/assets', authenticateToken, (req, res) => {
  const assets = db.query(`
    SELECT a.*, c.name as category_name, d.name as department_name, r.room_name, r.room_code,
           (s.first_name || ' ' || s.last_name) as custodian_name
    FROM assets a
    LEFT JOIN asset_categories c ON a.category_id = c.id
    LEFT JOIN departments d ON a.department_id = d.id
    LEFT JOIN rooms r ON a.room_id = r.id
    LEFT JOIN staff s ON a.custodian_id = s.id
    WHERE a.building_id = ?
    ORDER BY a.name ASC
  `, [req.params.id]);

  res.json({ success: true, assets });
});

// POST /api/v1/buildings
router.post('/', authenticateToken, requireRole('super_admin', 'asset_admin'), (req, res) => {
  try {
    const { campus_id, code, name, description, floors_count } = req.body;
    if (!code || !name) {
      return res.status(400).json({ success: false, message: 'Building code and name are required.' });
    }

    const exists = db.get('SELECT id FROM buildings WHERE code = ?', [code.trim().toUpperCase()]);
    if (exists) {
      return res.status(400).json({ success: false, message: 'Building code already exists.' });
    }

    const totalFloors = Math.max(1, parseInt(floors_count || 1, 10));

    let newBuildingId;
    db.transaction(() => {
      const result = db.run(`
        INSERT INTO buildings (campus_id, code, name, description, floors_count)
        VALUES (?, ?, ?, ?, ?)
      `, [campus_id || null, code.trim().toUpperCase(), name.trim(), description || null, totalFloors]);

      newBuildingId = Number(result.lastInsertRowid);

      // Create default floor records
      for (let f = 0; f < totalFloors; f++) {
        const floorName = f === 0 ? 'Ground Floor' : `${f}${f === 1 ? 'st' : f === 2 ? 'nd' : f === 3 ? 'rd' : 'th'} Floor`;
        db.run('INSERT INTO floors (building_id, floor_number, floor_name) VALUES (?, ?, ?)', [newBuildingId, f, floorName]);
      }
    });

    logAudit(req, {
      action: 'BUILDING_CREATED',
      entity_type: 'building',
      entity_id: newBuildingId,
      entity_code: code,
      details: `Created building: ${name} with ${totalFloors} floors`
    });

    res.status(201).json({ success: true, message: 'Building created successfully.', buildingId: newBuildingId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/v1/buildings/:id
router.put('/:id', authenticateToken, requireRole('super_admin', 'asset_admin'), (req, res) => {
  try {
    const { campus_id, name, description, floors_count, status } = req.body;
    const existing = db.get('SELECT * FROM buildings WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ success: false, message: 'Building not found.' });

    db.run(`
      UPDATE buildings
      SET campus_id = ?, name = ?, description = ?, floors_count = ?, status = ?
      WHERE id = ?
    `, [
      campus_id !== undefined ? campus_id : existing.campus_id,
      name || existing.name,
      description !== undefined ? description : existing.description,
      floors_count !== undefined ? floors_count : existing.floors_count,
      status || existing.status,
      req.params.id
    ]);

    res.json({ success: true, message: 'Building updated successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
