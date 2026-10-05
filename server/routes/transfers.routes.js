const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

// GET /api/v1/transfers
router.get('/', authenticateToken, (req, res) => {
  const { status, asset_id } = req.query;

  let query = `
    SELECT t.*,
           a.asset_number, a.name as asset_name, a.barcode,
           fc.name as from_campus_name, tc.name as to_campus_name,
           fb.name as from_building_name, tb.name as to_building_name,
           fr.room_name as from_room_name, tr.room_name as to_room_name,
           fd.name as from_department_name, td.name as to_department_name,
           (fs.first_name || ' ' || fs.last_name) as from_custodian_name,
           (ts.first_name || ' ' || ts.last_name) as to_custodian_name,
           req.full_name as requested_by_name,
           app.full_name as approved_by_name
    FROM asset_transfers t
    JOIN assets a ON t.asset_id = a.id
    LEFT JOIN campuses fc ON t.from_campus_id = fc.id
    LEFT JOIN campuses tc ON t.to_campus_id = tc.id
    LEFT JOIN buildings fb ON t.from_building_id = fb.id
    LEFT JOIN buildings tb ON t.to_building_id = tb.id
    LEFT JOIN rooms fr ON t.from_room_id = fr.id
    LEFT JOIN rooms tr ON t.to_room_id = tr.id
    LEFT JOIN departments fd ON t.from_department_id = fd.id
    LEFT JOIN departments td ON t.to_department_id = td.id
    LEFT JOIN staff fs ON t.from_custodian_id = fs.id
    LEFT JOIN staff ts ON t.to_custodian_id = ts.id
    LEFT JOIN users req ON t.requested_by = req.id
    LEFT JOIN users app ON t.approved_by = app.id
    WHERE 1=1
  `;
  const params = [];

  if (status) {
    query += ' AND t.status = ?';
    params.push(status);
  }
  if (asset_id) {
    query += ' AND t.asset_id = ?';
    params.push(asset_id);
  }

  query += ' ORDER BY t.id DESC';

  const transfers = db.query(query, params);
  res.json({ success: true, transfers });
});

// POST /api/v1/transfers (Initiate transfer request)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      asset_id,
      to_campus_id,
      to_building_id,
      to_room_id,
      to_department_id,
      to_custodian_id,
      reason,
      transfer_date
    } = req.body;

    if (!asset_id || !reason) {
      return res.status(400).json({ success: false, message: 'Asset ID and transfer reason are required.' });
    }

    const asset = db.get('SELECT * FROM assets WHERE id = ?', [asset_id]);
    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found.' });
    }

    if (asset.status === 'disposed') {
      return res.status(400).json({ success: false, message: 'Cannot transfer a disposed asset.' });
    }

    const seq = db.get('SELECT COUNT(*) as count FROM asset_transfers');
    const transferNumber = `TRF-${new Date().getFullYear()}-${String(seq.count + 1).padStart(4, '0')}`;

    const result = db.run(`
      INSERT INTO asset_transfers (
        transfer_number, asset_id,
        from_campus_id, to_campus_id,
        from_building_id, to_building_id,
        from_room_id, to_room_id,
        from_department_id, to_department_id,
        from_custodian_id, to_custodian_id,
        reason, requested_by, status, transfer_date
      ) VALUES (
        ?, ?,
        ?, ?,
        ?, ?,
        ?, ?,
        ?, ?,
        ?, ?,
        ?, ?, 'pending_approval', ?
      )
    `, [
      transferNumber,
      asset.id,
      asset.campus_id,
      to_campus_id || asset.campus_id,
      asset.building_id,
      to_building_id || asset.building_id,
      asset.room_id,
      to_room_id || null,
      asset.department_id,
      to_department_id || asset.department_id,
      asset.custodian_id,
      to_custodian_id || null,
      reason.trim(),
      req.user.id,
      transfer_date || new Date().toISOString().split('T')[0]
    ]);

    const transferId = Number(result.lastInsertRowid);

    // Notify asset administrators
    db.run(`
      INSERT INTO notifications (user_id, role_id, title, message, type, entity_type, entity_id)
      VALUES (null, 2, 'New Asset Transfer Request', ?, 'info', 'transfer', ?)
    `, [`Transfer request ${transferNumber} submitted for asset ${asset.asset_number}: ${reason}`, transferId]);

    logAudit(req, {
      action: 'TRANSFER_REQUESTED',
      entity_type: 'transfer',
      entity_id: transferId,
      entity_code: transferNumber,
      details: `Initiated transfer request for ${asset.asset_number}: ${reason}`
    });

    res.status(201).json({
      success: true,
      message: 'Transfer request submitted successfully and pending approval.',
      transfer_number: transferNumber,
      transferId
    });
  } catch (err) {
    console.error('Transfer request error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/v1/transfers/:id/approve (Approve & execute transfer)
router.put('/:id/approve', authenticateToken, requireRole('super_admin', 'asset_admin', 'finance_officer'), (req, res) => {
  try {
    const transfer = db.get('SELECT * FROM asset_transfers WHERE id = ?', [req.params.id]);
    if (!transfer) {
      return res.status(404).json({ success: false, message: 'Transfer request not found.' });
    }

    if (transfer.status !== 'pending_approval') {
      return res.status(400).json({ success: false, message: `Cannot approve transfer with status '${transfer.status}'.` });
    }

    const asset = db.get('SELECT * FROM assets WHERE id = ?', [transfer.asset_id]);
    if (!asset) {
      return res.status(404).json({ success: false, message: 'Associated asset not found.' });
    }

    const { comments } = req.body;

    db.transaction(() => {
      // 1. Mark transfer completed
      db.run(`
        UPDATE asset_transfers
        SET status = 'completed',
            approved_by = ?,
            approval_date = datetime('now'),
            completion_date = datetime('now'),
            comments = ?
        WHERE id = ?
      `, [req.user.id, comments || null, transfer.id]);

      // 2. Update asset's official location & custodian
      db.run(`
        UPDATE assets
        SET campus_id = ?,
            building_id = ?,
            room_id = ?,
            department_id = ?,
            custodian_id = ?,
            date_assigned = date('now'),
            status = 'active',
            updated_at = datetime('now')
        WHERE id = ?
      `, [
        transfer.to_campus_id,
        transfer.to_building_id,
        transfer.to_room_id,
        transfer.to_department_id,
        transfer.to_custodian_id,
        asset.id
      ]);

      // 3. Log asset history timeline
      db.run(`
        INSERT INTO asset_history (
          asset_id, event_type, title, description, from_value, to_value, performed_by, performed_by_name
        ) VALUES (?, 'transfer', 'Asset Relocated & Transferred', ?, ?, ?, ?, ?)
      `, [
        asset.id,
        `Transferred under ${transfer.transfer_number}. Reason: ${transfer.reason}`,
        `Bld: #${asset.building_id}, Rm: #${asset.room_id}, Dept: #${asset.department_id}`,
        `Bld: #${transfer.to_building_id}, Rm: #${transfer.to_room_id}, Dept: #${transfer.to_department_id}`,
        req.user.id,
        req.user.full_name
      ]);
    });

    logAudit(req, {
      action: 'TRANSFER_APPROVED',
      entity_type: 'transfer',
      entity_id: transfer.id,
      entity_code: transfer.transfer_number,
      details: `Approved & completed asset transfer ${transfer.transfer_number} for ${asset.asset_number}`
    });

    res.json({
      success: true,
      message: 'Asset transfer approved and official asset location updated successfully.'
    });
  } catch (err) {
    console.error('Approve transfer error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/v1/transfers/:id/reject
router.put('/:id/reject', authenticateToken, requireRole('super_admin', 'asset_admin', 'finance_officer'), (req, res) => {
  try {
    const transfer = db.get('SELECT * FROM asset_transfers WHERE id = ?', [req.params.id]);
    if (!transfer) return res.status(404).json({ success: false, message: 'Transfer not found.' });

    const { comments } = req.body;
    db.run(`
      UPDATE asset_transfers
      SET status = 'rejected', approved_by = ?, approval_date = datetime('now'), comments = ?
      WHERE id = ?
    `, [req.user.id, comments || 'Transfer rejected', transfer.id]);

    logAudit(req, {
      action: 'TRANSFER_REJECTED',
      entity_type: 'transfer',
      entity_id: transfer.id,
      entity_code: transfer.transfer_number,
      details: `Rejected asset transfer ${transfer.transfer_number}: ${comments || 'No comment'}`
    });

    res.json({ success: true, message: 'Transfer request rejected.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
