const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

// GET /api/v1/disposals
router.get('/', authenticateToken, (req, res) => {
  const { status } = req.query;

  let query = `
    SELECT d.*,
           a.asset_number, a.name as asset_name, a.barcode, a.acquisition_cost, a.current_book_value,
           c.name as category_name, dept.name as department_name,
           (s.first_name || ' ' || s.last_name) as responsible_officer_name,
           req.full_name as requested_by_name,
           app.full_name as approved_by_name
    FROM asset_disposals d
    JOIN assets a ON d.asset_id = a.id
    LEFT JOIN asset_categories c ON a.category_id = c.id
    LEFT JOIN departments dept ON a.department_id = dept.id
    LEFT JOIN staff s ON d.responsible_officer_id = s.id
    LEFT JOIN users req ON d.requested_by = req.id
    LEFT JOIN users app ON d.approved_by = app.id
    WHERE 1=1
  `;
  const params = [];

  if (status) {
    query += ' AND d.status = ?';
    params.push(status);
  }

  query += ' ORDER BY d.id DESC';

  const disposals = db.query(query, params);
  res.json({ success: true, disposals });
});

// POST /api/v1/disposals (Initiate disposal request)
router.post('/', authenticateToken, requireRole('super_admin', 'asset_admin', 'asset_officer', 'department_admin'), (req, res) => {
  try {
    const {
      asset_id,
      disposal_method = 'public_auction',
      reason,
      committee_approval_ref,
      disposal_value = 0,
      buyer_recipient,
      responsible_officer_id,
      remarks
    } = req.body;

    if (!asset_id || !reason) {
      return res.status(400).json({ success: false, message: 'Asset ID and disposal reason are required.' });
    }

    const asset = db.get('SELECT * FROM assets WHERE id = ?', [asset_id]);
    if (!asset) return res.status(404).json({ success: false, message: 'Asset not found.' });

    if (asset.status === 'disposed') {
      return res.status(400).json({ success: false, message: 'Asset is already marked disposed.' });
    }

    const seq = db.get('SELECT COUNT(*) as count FROM asset_disposals');
    const dspNumber = `DSP-${new Date().getFullYear()}-${String(seq.count + 1).padStart(4, '0')}`;

    let disposalId;
    db.transaction(() => {
      const result = db.run(`
        INSERT INTO asset_disposals (
          disposal_number, asset_id, disposal_method, reason, committee_approval_ref,
          disposal_value, buyer_recipient, responsible_officer_id, requested_by,
          disposal_date, status, remarks
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, date('now'), 'pending_assessment', ?)
      `, [
        dspNumber,
        asset.id,
        disposal_method,
        reason,
        committee_approval_ref || null,
        disposal_value || 0,
        buyer_recipient || null,
        responsible_officer_id || asset.custodian_id,
        req.user.id,
        remarks || null
      ]);

      disposalId = Number(result.lastInsertRowid);

      // Flag asset as pending_disposal
      db.run("UPDATE assets SET status = 'pending_disposal', condition = 'obsolete' WHERE id = ?", [asset.id]);

      db.run(`
        INSERT INTO asset_history (
          asset_id, event_type, title, description, from_value, to_value, performed_by, performed_by_name
        ) VALUES (?, 'disposal_request', 'Disposal Requested', ?, ?, 'pending_disposal', ?, ?)
      `, [
        asset.id,
        `Disposal ticket ${dspNumber} submitted. Reason: ${reason}`,
        asset.status,
        req.user.id,
        req.user.full_name
      ]);
    });

    logAudit(req, {
      action: 'DISPOSAL_REQUESTED',
      entity_type: 'disposal',
      entity_id: disposalId,
      entity_code: dspNumber,
      details: `Initiated disposal request ${dspNumber} for asset ${asset.asset_number}`
    });

    res.status(201).json({
      success: true,
      message: 'Disposal request submitted for committee review.',
      disposal_number: dspNumber,
      disposalId
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/v1/disposals/:id/approve
router.put('/:id/approve', authenticateToken, requireRole('super_admin', 'asset_admin', 'finance_officer', 'management'), (req, res) => {
  try {
    const { committee_approval_ref, comments } = req.body;
    const disposal = db.get('SELECT * FROM asset_disposals WHERE id = ?', [req.params.id]);
    if (!disposal) return res.status(404).json({ success: false, message: 'Disposal record not found.' });

    db.run(`
      UPDATE asset_disposals
      SET status = 'approved',
          approved_by = ?,
          committee_approval_ref = COALESCE(?, committee_approval_ref),
          remarks = COALESCE(?, remarks)
      WHERE id = ?
    `, [req.user.id, committee_approval_ref || null, comments || null, disposal.id]);

    logAudit(req, {
      action: 'DISPOSAL_APPROVED',
      entity_type: 'disposal',
      entity_id: disposal.id,
      entity_code: disposal.disposal_number,
      details: `Approved asset disposal ${disposal.disposal_number}. Ref: ${committee_approval_ref || 'Official Resolution'}`
    });

    res.json({ success: true, message: 'Disposal request approved.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/v1/disposals/:id/complete (Final execution: asset becomes DISPOSED permanently)
router.put('/:id/complete', authenticateToken, requireRole('super_admin', 'asset_admin', 'finance_officer'), (req, res) => {
  try {
    const { disposal_value, buyer_recipient, remarks } = req.body;
    const disposal = db.get('SELECT * FROM asset_disposals WHERE id = ?', [req.params.id]);
    if (!disposal) return res.status(404).json({ success: false, message: 'Disposal record not found.' });

    const asset = db.get('SELECT * FROM assets WHERE id = ?', [disposal.asset_id]);

    db.transaction(() => {
      // 1. Mark disposal completed
      db.run(`
        UPDATE asset_disposals
        SET status = 'disposed',
            disposal_value = COALESCE(?, disposal_value),
            buyer_recipient = COALESCE(?, buyer_recipient),
            remarks = COALESCE(?, remarks),
            disposal_date = date('now')
        WHERE id = ?
      `, [disposal_value !== undefined ? parseFloat(disposal_value) : null, buyer_recipient || null, remarks || null, disposal.id]);

      // 2. Set asset status to DISPOSED, write down book value to 0, preserve all historical records
      db.run(`
        UPDATE assets
        SET status = 'disposed',
            condition = 'disposed',
            current_book_value = 0,
            updated_at = datetime('now')
        WHERE id = ?
      `, [asset.id]);

      // 3. Record timeline event
      db.run(`
        INSERT INTO asset_history (
          asset_id, event_type, title, description, from_value, to_value, performed_by, performed_by_name
        ) VALUES (?, 'disposed', 'Asset Permanently Disposed', ?, 'pending_disposal', 'disposed', ?, ?)
      `, [
        asset.id,
        `Asset disposed via ${disposal.disposal_method}. Disposal Value: TZS ${disposal_value || disposal.disposal_value}. Recipient: ${buyer_recipient || disposal.buyer_recipient || 'N/A'}. Ref: ${disposal.committee_approval_ref || 'Approved'}`,
        req.user.id,
        req.user.full_name
      ]);
    });

    logAudit(req, {
      action: 'ASSET_DISPOSED',
      entity_type: 'asset',
      entity_id: asset.id,
      entity_code: asset.asset_number,
      details: `Asset ${asset.asset_number} permanently disposed via ${disposal.disposal_method}. Historical records preserved.`
    });

    res.json({
      success: true,
      message: 'Asset successfully marked as DISPOSED. Historical and audit records preserved.'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
