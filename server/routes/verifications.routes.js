const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticateToken } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

// GET /api/v1/verifications/campaigns
router.get('/campaigns', authenticateToken, (req, res) => {
  const campaigns = db.query(`
    SELECT vc.*,
           cp.name as campus_name,
           d.name as department_name,
           b.name as building_name,
           u.full_name as created_by_name,
           COUNT(DISTINCT v.id) as total_scans_count
    FROM verification_campaigns vc
    LEFT JOIN campuses cp ON vc.campus_id = cp.id
    LEFT JOIN departments d ON vc.department_id = d.id
    LEFT JOIN buildings b ON vc.building_id = b.id
    LEFT JOIN users u ON vc.created_by = u.id
    LEFT JOIN asset_verifications v ON vc.id = v.campaign_id
    GROUP BY vc.id
    ORDER BY vc.id DESC
  `);

  const enriched = campaigns.map(c => {
    // Expected assets in scope
    let scopeSql = `SELECT COUNT(*) as count FROM assets WHERE status NOT IN ('disposed', 'retired')`;
    const scopeParams = [];
    if (c.campus_id) {
      scopeSql += ' AND campus_id = ?';
      scopeParams.push(c.campus_id);
    }
    if (c.department_id) {
      scopeSql += ' AND department_id = ?';
      scopeParams.push(c.department_id);
    }
    if (c.building_id) {
      scopeSql += ' AND building_id = ?';
      scopeParams.push(c.building_id);
    }
    const expected = db.get(scopeSql, scopeParams).count;

    // Scanned distinct assets in this campaign
    const scanned = db.get(`
      SELECT COUNT(DISTINCT asset_id) as count FROM asset_verifications WHERE campaign_id = ?
    `, [c.id]).count;

    const mismatched = db.get(`
      SELECT COUNT(*) as count FROM asset_verifications
      WHERE campaign_id = ? AND (is_location_mismatch = 1 OR is_department_mismatch = 1)
    `, [c.id]).count;

    const conditionChanged = db.get(`
      SELECT COUNT(*) as count FROM asset_verifications
      WHERE campaign_id = ? AND is_condition_changed = 1
    `, [c.id]).count;

    const missing = Math.max(0, expected - scanned);
    const completionPct = expected > 0 ? Math.min(100, Math.round((scanned / expected) * 100)) : 0;

    return {
      ...c,
      stats: {
        expected,
        scanned,
        verified: scanned - mismatched,
        missing,
        mismatched,
        conditionChanged,
        completionPct
      }
    };
  });

  res.json({ success: true, campaigns: enriched });
});

// POST /api/v1/verifications/campaigns
router.post('/campaigns', authenticateToken, (req, res) => {
  try {
    const { title, description, start_date, end_date, campus_id, department_id, building_id } = req.body;
    if (!title || !start_date || !end_date) {
      return res.status(400).json({ success: false, message: 'Campaign title, start date and end date are required.' });
    }

    const seq = db.get('SELECT COUNT(*) as count FROM verification_campaigns');
    const code = `VC-${new Date().getFullYear()}-${String(seq.count + 1).padStart(3, '0')}`;

    const result = db.run(`
      INSERT INTO verification_campaigns (
        campaign_code, title, description, start_date, end_date, campus_id, department_id, building_id, status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'in_progress', ?)
    `, [
      code,
      title.trim(),
      description || null,
      start_date,
      end_date,
      campus_id || null,
      department_id || null,
      building_id || null,
      req.user.id
    ]);

    const campaignId = Number(result.lastInsertRowid);
    logAudit(req, {
      action: 'CAMPAIGN_CREATED',
      entity_type: 'verification_campaign',
      entity_id: campaignId,
      entity_code: code,
      details: `Created verification campaign: ${title}`
    });

    res.status(201).json({ success: true, message: 'Verification campaign created.', campaignId, campaign_code: code });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/v1/verifications/campaigns/:id/missing
// Returns assets in scope that have not yet been scanned
router.get('/campaigns/:id/missing', authenticateToken, (req, res) => {
  const campaign = db.get('SELECT * FROM verification_campaigns WHERE id = ?', [req.params.id]);
  if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found.' });

  let query = `
    SELECT a.id, a.asset_number, a.barcode, a.name, a.condition, a.status,
           c.name as category_name, d.name as department_name, b.name as building_name,
           r.room_name, r.room_code,
           (s.first_name || ' ' || s.last_name) as custodian_name,
           a.last_verified_at
    FROM assets a
    LEFT JOIN asset_categories c ON a.category_id = c.id
    LEFT JOIN departments d ON a.department_id = d.id
    LEFT JOIN buildings b ON a.building_id = b.id
    LEFT JOIN rooms r ON a.room_id = r.id
    LEFT JOIN staff s ON a.custodian_id = s.id
    WHERE a.status NOT IN ('disposed', 'retired')
      AND a.id NOT IN (
        SELECT asset_id FROM asset_verifications WHERE campaign_id = ?
      )
  `;
  const params = [campaign.id];

  if (campaign.campus_id) {
    query += ' AND a.campus_id = ?';
    params.push(campaign.campus_id);
  }
  if (campaign.department_id) {
    query += ' AND a.department_id = ?';
    params.push(campaign.department_id);
  }
  if (campaign.building_id) {
    query += ' AND a.building_id = ?';
    params.push(campaign.building_id);
  }

  query += ' ORDER BY b.name ASC, r.room_code ASC, a.name ASC';

  const missingAssets = db.query(query, params);
  res.json({ success: true, count: missingAssets.length, assets: missingAssets });
});

// POST /api/v1/verifications/scan (Core Mobile & Web Physical Verification API)
router.post('/scan', authenticateToken, (req, res) => {
  try {
    const {
      barcode,
      asset_id,
      campaign_id,
      scanned_campus_id,
      scanned_building_id,
      scanned_room_id,
      scanned_department_id,
      scanned_custodian_id,
      condition,
      remarks,
      photo_url,
      gps_lat,
      gps_lng
    } = req.body;

    if (!barcode && !asset_id) {
      return res.status(400).json({ success: false, message: 'Barcode or asset ID is required.' });
    }

    // 1. Locate Asset
    let asset;
    if (asset_id) {
      asset = db.get('SELECT * FROM assets WHERE id = ?', [asset_id]);
    } else {
      const code = barcode.trim();
      asset = db.get('SELECT * FROM assets WHERE barcode = ? OR asset_number = ?', [code, code]);
    }

    if (!asset) {
      return res.status(404).json({
        success: false,
        is_unregistered: true,
        message: `Asset with barcode '${barcode}' is not registered in the system.`
      });
    }

    // 2. Resolve Active Campaign if not provided
    let campaignId = campaign_id;
    if (!campaignId) {
      const activeCamp = db.get("SELECT id FROM verification_campaigns WHERE status = 'in_progress' ORDER BY id DESC LIMIT 1");
      campaignId = activeCamp ? activeCamp.id : null;
    }

    // 3. Location and Department Mismatch Detection
    const expectedBuildingId = asset.building_id;
    const expectedRoomId = asset.room_id;
    const expectedDeptId = asset.department_id;

    const isLocationMismatch = Boolean(
      (scanned_building_id && Number(scanned_building_id) !== Number(expectedBuildingId)) ||
      (scanned_room_id && Number(scanned_room_id) !== Number(expectedRoomId))
    );

    const isDeptMismatch = Boolean(
      scanned_department_id && Number(scanned_department_id) !== Number(expectedDeptId)
    );

    const isConditionChanged = Boolean(
      condition && condition.toLowerCase() !== asset.condition.toLowerCase()
    );

    let verificationStatus = 'verified';
    if (isLocationMismatch || isDeptMismatch) {
      verificationStatus = 'mismatched';
    } else if (condition === 'damaged' || condition === 'poor') {
      verificationStatus = 'damaged';
    }

    let verificationRecordId;
    db.transaction(() => {
      const insertVerif = db.getRawDb().prepare(`
        INSERT INTO asset_verifications (
          campaign_id, asset_id, verifier_id, verified_at,
          verified_campus_id, verified_building_id, verified_room_id,
          verified_department_id, verified_custodian_id,
          verified_condition,
          expected_building_id, expected_room_id, expected_department_id,
          is_location_mismatch, is_department_mismatch, is_condition_changed, is_unexpected,
          verification_status, remarks, photo_url, gps_lat, gps_lng
        ) VALUES (
          ?, ?, ?, datetime('now'),
          ?, ?, ?,
          ?, ?,
          ?,
          ?, ?, ?,
          ?, ?, ?, 0,
          ?, ?, ?, ?, ?
        )
      `);

      const result = insertVerif.run(
        campaignId,
        asset.id,
        req.user.id,
        scanned_campus_id || asset.campus_id,
        scanned_building_id || asset.building_id,
        scanned_room_id || asset.room_id,
        scanned_department_id || asset.department_id,
        scanned_custodian_id || asset.custodian_id,
        condition || asset.condition,
        expectedBuildingId,
        expectedRoomId,
        expectedDeptId,
        isLocationMismatch ? 1 : 0,
        isDeptMismatch ? 1 : 0,
        isConditionChanged ? 1 : 0,
        verificationStatus,
        remarks || null,
        photo_url || null,
        gps_lat || null,
        gps_lng || null
      );

      verificationRecordId = Number(result.lastInsertRowid);

      // Update asset's last verification info and condition (DO NOT alter permanent location automatically per rules!)
      db.run(`
        UPDATE assets
        SET last_verified_at = datetime('now'),
            last_verified_by = ?,
            condition = ?
        WHERE id = ?
      `, [req.user.id, condition || asset.condition, asset.id]);

      // Add to timeline
      const mismatchNotes = [];
      if (isLocationMismatch) mismatchNotes.push('LOCATION MISMATCH DETECTED');
      if (isDeptMismatch) mismatchNotes.push('DEPARTMENT MISMATCH DETECTED');
      if (isConditionChanged) mismatchNotes.push(`Condition updated: ${asset.condition} -> ${condition}`);

      const noteText = mismatchNotes.length > 0
        ? `Verification completed with flags: ${mismatchNotes.join(', ')}. ${remarks || ''}`
        : `Physical verification confirmed in designated location. Condition: ${condition || asset.condition}. ${remarks || ''}`;

      db.run(`
        INSERT INTO asset_history (
          asset_id, event_type, title, description, from_value, to_value, performed_by, performed_by_name
        ) VALUES (?, 'verification', 'Physical Asset Verified', ?, ?, ?, ?, ?)
      `, [
        asset.id,
        noteText,
        asset.condition,
        condition || asset.condition,
        req.user.id,
        req.user.full_name
      ]);
    });

    logAudit(req, {
      action: 'ASSET_VERIFIED',
      entity_type: 'verification',
      entity_id: verificationRecordId,
      entity_code: asset.asset_number,
      details: `Verified ${asset.asset_number} with status '${verificationStatus}'. Mismatch: ${isLocationMismatch}`
    });

    // Fetch location names for friendly client response
    const expectedBuilding = db.get('SELECT name FROM buildings WHERE id = ?', [expectedBuildingId]);
    const expectedRoom = db.get('SELECT room_name, room_code FROM rooms WHERE id = ?', [expectedRoomId]);
    const scannedBuilding = scanned_building_id ? db.get('SELECT name FROM buildings WHERE id = ?', [scanned_building_id]) : null;
    const scannedRoom = scanned_room_id ? db.get('SELECT room_name, room_code FROM rooms WHERE id = ?', [scanned_room_id]) : null;

    res.status(201).json({
      success: true,
      message: isLocationMismatch
        ? 'Asset verified with LOCATION MISMATCH warning recorded.'
        : 'Asset verified successfully.',
      verification: {
        id: verificationRecordId,
        verification_status: verificationStatus,
        is_location_mismatch: isLocationMismatch,
        is_department_mismatch: isDeptMismatch,
        is_condition_changed: isConditionChanged,
        asset: {
          id: asset.id,
          asset_number: asset.asset_number,
          barcode: asset.barcode,
          name: asset.name,
          expected_location: {
            building: expectedBuilding ? expectedBuilding.name : 'Unassigned',
            room: expectedRoom ? `${expectedRoom.room_name} (${expectedRoom.room_code})` : 'Unassigned'
          },
          scanned_location: {
            building: scannedBuilding ? scannedBuilding.name : (expectedBuilding ? expectedBuilding.name : ''),
            room: scannedRoom ? `${scannedRoom.room_name} (${scannedRoom.room_code})` : ''
          },
          condition: condition || asset.condition
        }
      }
    });
  } catch (err) {
    console.error('Scan error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/v1/verifications/recent
router.get('/recent', authenticateToken, (req, res) => {
  const recent = db.query(`
    SELECT v.*, a.asset_number, a.name as asset_name, a.barcode,
           u.full_name as verifier_name,
           b.name as verified_building_name,
           r.room_name as verified_room_name
    FROM asset_verifications v
    JOIN assets a ON v.asset_id = a.id
    LEFT JOIN users u ON v.verifier_id = u.id
    LEFT JOIN buildings b ON v.verified_building_id = b.id
    LEFT JOIN rooms r ON v.verified_room_id = r.id
    ORDER BY v.verified_at DESC
    LIMIT 25
  `);
  res.json({ success: true, verifications: recent });
});

module.exports = router;
