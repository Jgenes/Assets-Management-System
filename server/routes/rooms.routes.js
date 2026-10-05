const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

// GET /api/v1/rooms
router.get('/', authenticateToken, (req, res) => {
  const { building_id, department_id, location_type } = req.query;

  let query = `
    SELECT r.*, b.name as building_name, b.code as building_code,
           fl.floor_name, fl.floor_number,
           d.name as department_name, d.code as department_code,
           (s.first_name || ' ' || s.last_name) as responsible_staff_name,
           COUNT(DISTINCT a.id) as assets_count,
           COALESCE(SUM(a.acquisition_cost), 0) as total_room_value
    FROM rooms r
    JOIN buildings b ON r.building_id = b.id
    LEFT JOIN floors fl ON r.floor_id = fl.id
    LEFT JOIN departments d ON r.department_id = d.id
    LEFT JOIN staff s ON r.responsible_staff_id = s.id
    LEFT JOIN assets a ON r.id = a.room_id
    WHERE 1=1
  `;
  const params = [];

  if (building_id) {
    query += ' AND r.building_id = ?';
    params.push(building_id);
  }
  if (department_id) {
    query += ' AND r.department_id = ?';
    params.push(department_id);
  }
  if (location_type) {
    query += ' AND r.location_type = ?';
    params.push(location_type);
  }

  query += ' GROUP BY r.id ORDER BY b.name ASC, r.room_code ASC';

  const rooms = db.query(query, params);
  res.json({ success: true, rooms });
});

// GET /api/v1/rooms/:id
router.get('/:id', authenticateToken, (req, res) => {
  const room = db.get(`
    SELECT r.*, b.name as building_name, b.code as building_code,
           fl.floor_name, fl.floor_number,
           d.name as department_name,
           (s.first_name || ' ' || s.last_name) as responsible_staff_name
    FROM rooms r
    JOIN buildings b ON r.building_id = b.id
    LEFT JOIN floors fl ON r.floor_id = fl.id
    LEFT JOIN departments d ON r.department_id = d.id
    LEFT JOIN staff s ON r.responsible_staff_id = s.id
    WHERE r.id = ?
  `, [req.params.id]);

  if (!room) return res.status(404).json({ success: false, message: 'Room/Office not found.' });

  const assets = db.query(`
    SELECT a.*, c.name as category_name, (st.first_name || ' ' || st.last_name) as custodian_name
    FROM assets a
    LEFT JOIN asset_categories c ON a.category_id = c.id
    LEFT JOIN staff st ON a.custodian_id = st.id
    WHERE a.room_id = ?
    ORDER BY a.name ASC
  `, [req.params.id]);

  res.json({ success: true, room: { ...room, assets } });
});

// GET /api/v1/rooms/:id/assets
router.get('/:id/assets', authenticateToken, (req, res) => {
  const assets = db.query(`
    SELECT a.*, c.name as category_name, d.name as department_name,
           (s.first_name || ' ' || s.last_name) as custodian_name
    FROM assets a
    LEFT JOIN asset_categories c ON a.category_id = c.id
    LEFT JOIN departments d ON a.department_id = d.id
    LEFT JOIN staff s ON a.custodian_id = s.id
    WHERE a.room_id = ?
    ORDER BY a.name ASC
  `, [req.params.id]);

  res.json({ success: true, assets });
});

// POST /api/v1/rooms
router.post('/', authenticateToken, requireRole('super_admin', 'asset_admin'), (req, res) => {
  try {
    const { building_id, floor_id, department_id, responsible_staff_id, room_code, room_name, location_type, capacity, description } = req.body;

    if (!building_id || !room_code || !room_name) {
      return res.status(400).json({ success: false, message: 'Building, room code and room name are required.' });
    }

    const exists = db.get('SELECT id FROM rooms WHERE building_id = ? AND room_code = ?', [building_id, room_code.trim().toUpperCase()]);
    if (exists) {
      return res.status(400).json({ success: false, message: 'Room code already exists in this building.' });
    }

    const result = db.run(`
      INSERT INTO rooms (building_id, floor_id, department_id, responsible_staff_id, room_code, room_name, location_type, capacity, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      building_id,
      floor_id || null,
      department_id || null,
      responsible_staff_id || null,
      room_code.trim().toUpperCase(),
      room_name.trim(),
      location_type || 'office',
      capacity || 1,
      description || null
    ]);

    const newId = Number(result.lastInsertRowid);
    logAudit(req, {
      action: 'ROOM_CREATED',
      entity_type: 'room',
      entity_id: newId,
      entity_code: room_code,
      details: `Created room/office: ${room_name} (${room_code})`
    });

    res.status(201).json({ success: true, message: 'Room created successfully.', roomId: newId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/v1/rooms/:id
router.put('/:id', authenticateToken, requireRole('super_admin', 'asset_admin'), (req, res) => {
  try {
    const { floor_id, department_id, responsible_staff_id, room_name, location_type, capacity, description, status } = req.body;
    const existing = db.get('SELECT * FROM rooms WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ success: false, message: 'Room not found.' });

    db.run(`
      UPDATE rooms
      SET floor_id = ?, department_id = ?, responsible_staff_id = ?,
          room_name = ?, location_type = ?, capacity = ?, description = ?, status = ?
      WHERE id = ?
    `, [
      floor_id !== undefined ? floor_id : existing.floor_id,
      department_id !== undefined ? department_id : existing.department_id,
      responsible_staff_id !== undefined ? responsible_staff_id : existing.responsible_staff_id,
      room_name || existing.room_name,
      location_type || existing.location_type,
      capacity !== undefined ? capacity : existing.capacity,
      description !== undefined ? description : existing.description,
      status || existing.status,
      req.params.id
    ]);

    res.json({ success: true, message: 'Room updated successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
