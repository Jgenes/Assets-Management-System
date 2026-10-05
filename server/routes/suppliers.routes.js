const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

// GET /api/v1/suppliers
router.get('/', authenticateToken, (req, res) => {
  const suppliers = db.query(`
    SELECT sp.*,
           COUNT(DISTINCT a.id) as supplied_assets_count,
           COALESCE(SUM(a.acquisition_cost), 0) as total_supplied_value
    FROM suppliers sp
    LEFT JOIN assets a ON sp.id = a.supplier_id
    GROUP BY sp.id
    ORDER BY sp.name ASC
  `);
  res.json({ success: true, suppliers });
});

// GET /api/v1/suppliers/:id
router.get('/:id', authenticateToken, (req, res) => {
  const supplier = db.get('SELECT * FROM suppliers WHERE id = ?', [req.params.id]);
  if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found.' });

  const assets = db.query(`
    SELECT a.*, c.name as category_name
    FROM assets a
    LEFT JOIN asset_categories c ON a.category_id = c.id
    WHERE a.supplier_id = ?
    ORDER BY a.acquisition_date DESC
  `, [req.params.id]);

  res.json({ success: true, supplier: { ...supplier, assets } });
});

// POST /api/v1/suppliers
router.post('/', authenticateToken, requireRole('super_admin', 'asset_admin', 'procurement_officer'), (req, res) => {
  try {
    const { code, name, contact_person, email, phone, address, tin_number, vat_registered, notes } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Supplier name is required.' });
    }

    const supCode = code && code.trim() ? code.trim().toUpperCase() : `SUP-${String(Date.now()).slice(-4)}`;

    const result = db.run(`
      INSERT INTO suppliers (code, name, contact_person, email, phone, address, tin_number, vat_registered, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      supCode,
      name.trim(),
      contact_person || null,
      email || null,
      phone || null,
      address || null,
      tin_number || null,
      vat_registered !== undefined ? vat_registered : 1,
      notes || null
    ]);

    const newId = Number(result.lastInsertRowid);
    logAudit(req, {
      action: 'SUPPLIER_CREATED',
      entity_type: 'supplier',
      entity_id: newId,
      entity_code: supCode,
      details: `Created supplier: ${name}`
    });

    res.status(201).json({ success: true, message: 'Supplier created.', supplierId: newId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
