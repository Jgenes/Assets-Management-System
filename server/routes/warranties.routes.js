const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticateToken } = require('../middleware/auth');

// GET /api/v1/warranties
router.get('/', authenticateToken, (req, res) => {
  const { status } = req.query;

  let query = `
    SELECT a.id as asset_id, a.asset_number, a.barcode, a.name as asset_name,
           a.serial_number, a.model, a.warranty_provider,
           a.warranty_start_date, a.warranty_expiry_date, a.warranty_terms,
           c.name as category_name, d.name as department_name,
           sp.name as supplier_name, sp.phone as supplier_phone,
           ROUND(julianday(a.warranty_expiry_date) - julianday('now')) as days_remaining,
           CASE
             WHEN a.warranty_expiry_date < date('now') THEN 'EXPIRED'
             WHEN a.warranty_expiry_date <= date('now', '+30 days') THEN 'EXPIRING_SOON'
             ELSE 'ACTIVE'
           END as warranty_status
    FROM assets a
    LEFT JOIN asset_categories c ON a.category_id = c.id
    LEFT JOIN departments d ON a.department_id = d.id
    LEFT JOIN suppliers sp ON a.supplier_id = sp.id
    WHERE a.warranty_expiry_date IS NOT NULL
  `;
  const params = [];

  if (status) {
    if (status.toUpperCase() === 'EXPIRED') {
      query += ` AND a.warranty_expiry_date < date('now')`;
    } else if (status.toUpperCase() === 'EXPIRING_SOON') {
      query += ` AND a.warranty_expiry_date >= date('now') AND a.warranty_expiry_date <= date('now', '+30 days')`;
    } else if (status.toUpperCase() === 'ACTIVE') {
      query += ` AND a.warranty_expiry_date > date('now', '+30 days')`;
    }
  }

  query += ' ORDER BY a.warranty_expiry_date ASC';

  const warranties = db.query(query, params);
  res.json({ success: true, warranties });
});

// GET /api/v1/warranties/alerts
router.get('/alerts', authenticateToken, (req, res) => {
  const expiringSoon = db.query(`
    SELECT a.id as asset_id, a.asset_number, a.name as asset_name,
           a.warranty_provider, a.warranty_expiry_date,
           ROUND(julianday(a.warranty_expiry_date) - julianday('now')) as days_remaining
    FROM assets a
    WHERE a.warranty_expiry_date >= date('now')
      AND a.warranty_expiry_date <= date('now', '+30 days')
    ORDER BY a.warranty_expiry_date ASC
  `);

  const expired = db.query(`
    SELECT a.id as asset_id, a.asset_number, a.name as asset_name,
           a.warranty_provider, a.warranty_expiry_date
    FROM assets a
    WHERE a.warranty_expiry_date < date('now')
    ORDER BY a.warranty_expiry_date DESC
    LIMIT 20
  `);

  res.json({
    success: true,
    expiringSoonCount: expiringSoon.length,
    expiredCount: expired.length,
    expiringSoon,
    expired
  });
});

module.exports = router;
