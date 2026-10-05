const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

// GET /api/v1/audit-logs
router.get('/', authenticateToken, requireRole('super_admin', 'asset_admin', 'internal_auditor'), (req, res) => {
  const { action, entity_type, entity_id, search, limit = 100, page = 1 } = req.query;

  let query = 'SELECT * FROM audit_logs WHERE 1=1';
  const params = [];

  if (action) {
    query += ' AND action = ?';
    params.push(action);
  }
  if (entity_type) {
    query += ' AND entity_type = ?';
    params.push(entity_type);
  }
  if (entity_id) {
    query += ' AND entity_id = ?';
    params.push(entity_id);
  }
  if (search) {
    query += ' AND (entity_code LIKE ? OR user_name LIKE ? OR details LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  const countSql = `SELECT COUNT(*) as total FROM (${query})`;
  const total = db.get(countSql, params).total;

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10)));
  const offset = (pageNum - 1) * limitNum;

  query += ' ORDER BY id DESC LIMIT ? OFFSET ?';
  params.push(limitNum, offset);

  const logs = db.query(query, params);

  const parsed = logs.map(l => ({
    ...l,
    old_values: l.old_values ? JSON.parse(l.old_values) : null,
    new_values: l.new_values ? JSON.parse(l.new_values) : null
  }));

  res.json({
    success: true,
    total,
    page: pageNum,
    limit: limitNum,
    logs: parsed
  });
});

module.exports = router;
