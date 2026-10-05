const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticateToken } = require('../middleware/auth');

// GET /api/v1/dashboard/stats
router.get('/stats', authenticateToken, (req, res) => {
  const totals = db.get(`
    SELECT
      COUNT(id) as total_assets,
      COALESCE(SUM(acquisition_cost), 0) as total_asset_value,
      COALESCE(SUM(current_book_value), 0) as total_book_value,
      COALESCE(SUM(accumulated_depreciation), 0) as total_depreciation,
      SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_count,
      SUM(CASE WHEN status = 'in_store' THEN 1 ELSE 0 END) as in_store_count,
      SUM(CASE WHEN status = 'under_maintenance' THEN 1 ELSE 0 END) as under_maintenance_count,
      SUM(CASE WHEN status IN ('missing', 'lost', 'stolen') THEN 1 ELSE 0 END) as missing_count,
      SUM(CASE WHEN condition IN ('damaged', 'poor') THEN 1 ELSE 0 END) as damaged_count,
      SUM(CASE WHEN status = 'disposed' THEN 1 ELSE 0 END) as disposed_count,
      SUM(CASE WHEN last_verified_at IS NOT NULL THEN 1 ELSE 0 END) as verified_count,
      SUM(CASE WHEN last_verified_at IS NULL THEN 1 ELSE 0 END) as unverified_count
    FROM assets
  `);

  const pendingTransfers = db.get("SELECT COUNT(*) as count FROM asset_transfers WHERE status = 'pending_approval'").count;
  const pendingDisposals = db.get("SELECT COUNT(*) as count FROM asset_disposals WHERE status = 'pending_assessment'").count;
  const pendingMaintenance = db.get("SELECT COUNT(*) as count FROM asset_maintenance WHERE status IN ('requested', 'assessed', 'in_progress')").count;
  const warrantiesExpiring = db.get("SELECT COUNT(*) as count FROM assets WHERE warranty_expiry_date >= date('now') AND warranty_expiry_date <= date('now', '+30 days')").count;

  // Active Verification Campaign
  const activeCampaign = db.get("SELECT * FROM verification_campaigns WHERE status = 'in_progress' ORDER BY id DESC LIMIT 1");
  let campaignProgress = null;
  if (activeCampaign) {
    const expected = db.get("SELECT COUNT(*) as count FROM assets WHERE status NOT IN ('disposed', 'retired')").count;
    const scanned = db.get("SELECT COUNT(DISTINCT asset_id) as count FROM asset_verifications WHERE campaign_id = ?", [activeCampaign.id]).count;
    campaignProgress = {
      id: activeCampaign.id,
      title: activeCampaign.title,
      expected,
      scanned,
      pct: expected > 0 ? Math.round((scanned / expected) * 100) : 0
    };
  }

  res.json({
    success: true,
    stats: {
      ...totals,
      pendingTransfers,
      pendingDisposals,
      pendingMaintenance,
      warrantiesExpiring,
      campaignProgress
    }
  });
});

// GET /api/v1/dashboard/charts
router.get('/charts', authenticateToken, (req, res) => {
  // 1. By Department
  const byDepartment = db.query(`
    SELECT d.code, d.name, COUNT(a.id) as count, COALESCE(SUM(a.acquisition_cost), 0) as total_value
    FROM departments d
    LEFT JOIN assets a ON d.id = a.department_id AND a.status != 'disposed'
    GROUP BY d.id
    ORDER BY count DESC
  `);

  // 2. By Building
  const byBuilding = db.query(`
    SELECT b.code, b.name, COUNT(a.id) as count, COALESCE(SUM(a.acquisition_cost), 0) as total_value
    FROM buildings b
    LEFT JOIN assets a ON b.id = a.building_id AND a.status != 'disposed'
    GROUP BY b.id
    ORDER BY count DESC
  `);

  // 3. By Category
  const byCategory = db.query(`
    SELECT c.code, c.name, COUNT(a.id) as count, COALESCE(SUM(a.acquisition_cost), 0) as total_value
    FROM asset_categories c
    LEFT JOIN assets a ON c.id = a.category_id AND a.status != 'disposed'
    GROUP BY c.id
    ORDER BY count DESC
  `);

  // 4. By Condition
  const byCondition = db.query(`
    SELECT condition, COUNT(id) as count
    FROM assets
    WHERE status != 'disposed'
    GROUP BY condition
  `);

  // 5. By Status
  const byStatus = db.query(`
    SELECT status, COUNT(id) as count
    FROM assets
    GROUP BY status
  `);

  res.json({
    success: true,
    charts: {
      byDepartment,
      byBuilding,
      byCategory,
      byCondition,
      byStatus
    }
  });
});

// GET /api/v1/dashboard/recent-activity
router.get('/recent-activity', authenticateToken, (req, res) => {
  const recentHistory = db.query(`
    SELECT h.*, a.asset_number, a.name as asset_name
    FROM asset_history h
    JOIN assets a ON h.asset_id = a.id
    ORDER BY h.id DESC
    LIMIT 15
  `);

  res.json({ success: true, activity: recentHistory });
});

module.exports = router;
