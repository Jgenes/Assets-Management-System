const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');
const depreciationService = require('../services/depreciationService');

// GET /api/v1/depreciation/summary
router.get('/summary', authenticateToken, (req, res) => {
  const summary = db.get(`
    SELECT COUNT(id) as total_assets,
           COALESCE(SUM(acquisition_cost), 0) as total_acquisition_cost,
           COALESCE(SUM(current_book_value), 0) as total_book_value,
           COALESCE(SUM(accumulated_depreciation), 0) as total_accumulated_depreciation
    FROM assets
    WHERE status NOT IN ('disposed', 'retired')
  `);

  const byCategory = db.query(`
    SELECT c.name as category_name, c.code as category_code,
           COUNT(a.id) as asset_count,
           COALESCE(SUM(a.acquisition_cost), 0) as total_cost,
           COALESCE(SUM(a.current_book_value), 0) as total_book_value,
           COALESCE(SUM(a.accumulated_depreciation), 0) as total_depreciation
    FROM asset_categories c
    LEFT JOIN assets a ON c.id = a.category_id AND a.status NOT IN ('disposed', 'retired')
    GROUP BY c.id
    ORDER BY total_cost DESC
  `);

  res.json({ success: true, summary, byCategory });
});

// GET /api/v1/depreciation/asset/:id
router.get('/asset/:id', authenticateToken, (req, res) => {
  const asset = db.get('SELECT * FROM assets WHERE id = ?', [req.params.id]);
  if (!asset) return res.status(404).json({ success: false, message: 'Asset not found.' });

  const schedule = depreciationService.calculateSchedule(asset);
  const records = db.query(`
    SELECT r.*, u.full_name as calculated_by_name
    FROM depreciation_records r
    LEFT JOIN users u ON r.calculated_by = u.id
    WHERE r.asset_id = ?
    ORDER BY r.financial_year ASC
  `, [asset.id]);

  res.json({ success: true, asset, schedule, recordedRuns: records });
});

// POST /api/v1/depreciation/run (Run institutional depreciation for a Financial Year)
router.post('/run', authenticateToken, requireRole('super_admin', 'finance_officer'), (req, res) => {
  try {
    const { financial_year } = req.body;
    const currentFY = financial_year || `${new Date().getFullYear() - 1}/${new Date().getFullYear()}`;

    const result = depreciationService.runInstitutionalDepreciation(currentFY, req.user.id);

    logAudit(req, {
      action: 'DEPRECIATION_RUN',
      entity_type: 'depreciation',
      entity_id: null,
      entity_code: currentFY,
      details: `Executed institutional depreciation run for FY ${currentFY}. Processed ${result.processed} assets, Total: TZS ${result.totalDepreciation}`
    });

    res.json({
      success: true,
      message: `Depreciation calculated and posted for Financial Year ${currentFY}.`,
      result
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
