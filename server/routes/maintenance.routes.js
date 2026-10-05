const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

// GET /api/v1/maintenance
router.get('/', authenticateToken, (req, res) => {
  const { status, asset_id, priority, type } = req.query;

  let query = `
    SELECT m.*,
           a.asset_number, a.name as asset_name, a.barcode, a.serial_number,
           c.name as category_name,
           b.name as building_name, r.room_name,
           req.full_name as requested_by_name,
           app.full_name as approved_by_name
    FROM asset_maintenance m
    JOIN assets a ON m.asset_id = a.id
    LEFT JOIN asset_categories c ON a.category_id = c.id
    LEFT JOIN buildings b ON a.building_id = b.id
    LEFT JOIN rooms r ON a.room_id = r.id
    LEFT JOIN users req ON m.requested_by = req.id
    LEFT JOIN users app ON m.approved_by = app.id
    WHERE 1=1
  `;
  const params = [];

  if (status) {
    query += ' AND m.status = ?';
    params.push(status);
  }
  if (asset_id) {
    query += ' AND m.asset_id = ?';
    params.push(asset_id);
  }
  if (priority) {
    query += ' AND m.priority = ?';
    params.push(priority);
  }
  if (type) {
    query += ' AND m.maintenance_type = ?';
    params.push(type);
  }

  query += ' ORDER BY m.id DESC';

  const maintenance = db.query(query, params);
  res.json({ success: true, maintenance });
});

// POST /api/v1/maintenance (Request maintenance)
router.post('/', authenticateToken, (req, res) => {
  try {
    const {
      asset_id,
      maintenance_type = 'corrective',
      priority = 'medium',
      issue_reported,
      description,
      service_provider,
      scheduled_date
    } = req.body;

    if (!asset_id || !issue_reported) {
      return res.status(400).json({ success: false, message: 'Asset ID and reported issue description are required.' });
    }

    const asset = db.get('SELECT * FROM assets WHERE id = ?', [asset_id]);
    if (!asset) return res.status(404).json({ success: false, message: 'Asset not found.' });

    const seq = db.get('SELECT COUNT(*) as count FROM asset_maintenance');
    const mntNumber = `MNT-${new Date().getFullYear()}-${String(seq.count + 1).padStart(4, '0')}`;

    let mntId;
    db.transaction(() => {
      const result = db.run(`
        INSERT INTO asset_maintenance (
          maintenance_number, asset_id, maintenance_type, priority,
          issue_reported, description, service_provider, scheduled_date,
          status, requested_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'requested', ?)
      `, [
        mntNumber,
        asset.id,
        maintenance_type,
        priority,
        issue_reported.trim(),
        description || null,
        service_provider || null,
        scheduled_date || null,
        req.user.id
      ]);

      mntId = Number(result.lastInsertRowid);

      // Flag asset status as under_maintenance
      db.run("UPDATE assets SET status = 'under_maintenance', condition = 'under_repair' WHERE id = ?", [asset.id]);

      db.run(`
        INSERT INTO asset_history (
          asset_id, event_type, title, description, from_value, to_value, performed_by, performed_by_name
        ) VALUES (?, 'maintenance_request', 'Maintenance Work Order Opened', ?, 'active', 'under_maintenance', ?, ?)
      `, [
        asset.id,
        `Ticket ${mntNumber}: ${issue_reported}`,
        req.user.id,
        req.user.full_name
      ]);
    });

    logAudit(req, {
      action: 'MAINTENANCE_REQUESTED',
      entity_type: 'maintenance',
      entity_id: mntId,
      entity_code: mntNumber,
      details: `Opened maintenance work order ${mntNumber} for asset ${asset.asset_number}`
    });

    res.status(201).json({
      success: true,
      message: 'Maintenance ticket created successfully.',
      maintenance_number: mntNumber,
      maintenanceId: mntId
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/v1/maintenance/:id/assess
router.put('/:id/assess', authenticateToken, requireRole('super_admin', 'asset_admin', 'asset_officer'), (req, res) => {
  try {
    const { service_provider, cost, technician_notes, scheduled_date } = req.body;
    const mnt = db.get('SELECT * FROM asset_maintenance WHERE id = ?', [req.params.id]);
    if (!mnt) return res.status(404).json({ success: false, message: 'Maintenance record not found.' });

    db.run(`
      UPDATE asset_maintenance
      SET service_provider = ?, cost = ?, technician_notes = ?, scheduled_date = ?, status = 'assessed'
      WHERE id = ?
    `, [
      service_provider || mnt.service_provider,
      cost !== undefined ? parseFloat(cost) : mnt.cost,
      technician_notes || mnt.technician_notes,
      scheduled_date || mnt.scheduled_date,
      mnt.id
    ]);

    res.json({ success: true, message: 'Maintenance assessment recorded.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/v1/maintenance/:id/approve
router.put('/:id/approve', authenticateToken, requireRole('super_admin', 'asset_admin', 'finance_officer'), (req, res) => {
  try {
    const mnt = db.get('SELECT * FROM asset_maintenance WHERE id = ?', [req.params.id]);
    if (!mnt) return res.status(404).json({ success: false, message: 'Maintenance record not found.' });

    db.run(`
      UPDATE asset_maintenance
      SET status = 'approved', approved_by = ?, start_date = date('now')
      WHERE id = ?
    `, [req.user.id, mnt.id]);

    logAudit(req, {
      action: 'MAINTENANCE_APPROVED',
      entity_type: 'maintenance',
      entity_id: mnt.id,
      entity_code: mnt.maintenance_number,
      details: `Approved maintenance work order ${mnt.maintenance_number}`
    });

    res.json({ success: true, message: 'Maintenance approved and scheduled.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/v1/maintenance/:id/complete
router.put('/:id/complete', authenticateToken, requireRole('super_admin', 'asset_admin', 'asset_officer'), (req, res) => {
  try {
    const { cost, technician_notes, condition_after = 'good' } = req.body;
    const mnt = db.get('SELECT * FROM asset_maintenance WHERE id = ?', [req.params.id]);
    if (!mnt) return res.status(404).json({ success: false, message: 'Maintenance record not found.' });

    const asset = db.get('SELECT * FROM assets WHERE id = ?', [mnt.asset_id]);

    db.transaction(() => {
      // 1. Complete maintenance ticket
      db.run(`
        UPDATE asset_maintenance
        SET status = 'completed',
            cost = ?,
            technician_notes = ?,
            condition_after = ?,
            completed_date = date('now')
        WHERE id = ?
      `, [
        cost !== undefined ? parseFloat(cost) : mnt.cost,
        technician_notes || mnt.technician_notes,
        condition_after,
        mnt.id
      ]);

      // 2. Restore asset status and update condition
      db.run(`
        UPDATE assets
        SET status = 'active',
            condition = ?,
            updated_at = datetime('now')
        WHERE id = ?
      `, [condition_after, asset.id]);

      // 3. Add to asset timeline
      db.run(`
        INSERT INTO asset_history (
          asset_id, event_type, title, description, from_value, to_value, performed_by, performed_by_name
        ) VALUES (?, 'maintenance_completed', 'Maintenance Completed', ?, 'under_maintenance', 'active', ?, ?)
      `, [
        asset.id,
        `Work order ${mnt.maintenance_number} completed. Cost: TZS ${cost || mnt.cost}. Condition restored to: ${condition_after}. Notes: ${technician_notes || 'Service performed.'}`,
        req.user.id,
        req.user.full_name
      ]);
    });

    logAudit(req, {
      action: 'MAINTENANCE_COMPLETED',
      entity_type: 'maintenance',
      entity_id: mnt.id,
      entity_code: mnt.maintenance_number,
      details: `Completed maintenance on ${asset.asset_number}. Condition after: ${condition_after}`
    });

    res.json({
      success: true,
      message: 'Maintenance completed and asset condition updated successfully.'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
