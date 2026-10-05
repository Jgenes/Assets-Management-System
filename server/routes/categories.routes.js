const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

// GET /api/v1/categories
router.get('/', authenticateToken, (req, res) => {
  const categories = db.query(`
    SELECT c.*,
           COUNT(DISTINCT sc.id) as subcategories_count,
           COUNT(DISTINCT a.id) as assets_count,
           COALESCE(SUM(a.acquisition_cost), 0) as total_category_value
    FROM asset_categories c
    LEFT JOIN asset_subcategories sc ON c.id = sc.category_id
    LEFT JOIN assets a ON c.id = a.category_id
    GROUP BY c.id
    ORDER BY c.name ASC
  `);

  const subcategories = db.query('SELECT * FROM asset_subcategories ORDER BY name ASC');

  const full = categories.map(cat => ({
    ...cat,
    subcategories: subcategories.filter(sc => sc.category_id === cat.id)
  }));

  res.json({ success: true, categories: full });
});

// POST /api/v1/categories
router.post('/', authenticateToken, requireRole('super_admin', 'asset_admin'), (req, res) => {
  try {
    const { code, name, description, depreciation_method, useful_life_years, residual_rate, is_capital } = req.body;
    if (!code || !name) {
      return res.status(400).json({ success: false, message: 'Category code and name are required.' });
    }

    const exists = db.get('SELECT id FROM asset_categories WHERE code = ?', [code.trim().toUpperCase()]);
    if (exists) {
      return res.status(400).json({ success: false, message: 'Category code already exists.' });
    }

    const result = db.run(`
      INSERT INTO asset_categories (code, name, description, depreciation_method, useful_life_years, residual_rate, is_capital)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      code.trim().toUpperCase(),
      name.trim(),
      description || null,
      depreciation_method || 'straight_line',
      useful_life_years || 5,
      residual_rate !== undefined ? residual_rate : 0.1,
      is_capital !== undefined ? is_capital : 1
    ]);

    const newId = Number(result.lastInsertRowid);
    logAudit(req, {
      action: 'CATEGORY_CREATED',
      entity_type: 'category',
      entity_id: newId,
      entity_code: code,
      details: `Created category: ${name}`
    });

    res.status(201).json({ success: true, message: 'Category created.', categoryId: newId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/v1/categories/:id/subcategories
router.post('/:id/subcategories', authenticateToken, requireRole('super_admin', 'asset_admin'), (req, res) => {
  try {
    const { code, name, description } = req.body;
    const catId = req.params.id;

    if (!code || !name) {
      return res.status(400).json({ success: false, message: 'Subcategory code and name are required.' });
    }

    const result = db.run(`
      INSERT INTO asset_subcategories (category_id, code, name, description)
      VALUES (?, ?, ?, ?)
    `, [catId, code.trim().toUpperCase(), name.trim(), description || null]);

    res.status(201).json({ success: true, message: 'Subcategory added.', subcategoryId: Number(result.lastInsertRowid) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
