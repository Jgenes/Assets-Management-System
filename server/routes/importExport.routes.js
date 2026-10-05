const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');
const importService = require('../services/importService');
const reportService = require('../services/reportService');
const upload = require('../middleware/upload');
const fs = require('fs');

// GET /api/v1/import/template (Download sample CSV template)
router.get('/template', authenticateToken, (req, res) => {
  const headers = [
    'name', 'category_code', 'asset_type', 'serial_number', 'model', 'manufacturer', 'brand',
    'building_code', 'room_code', 'department_code', 'staff_id', 'supplier_code',
    'purchase_price', 'currency', 'acquisition_date', 'purchase_order_no', 'invoice_no',
    'funding_source', 'condition', 'status', 'description'
  ];

  const sampleRows = [
    [
      'Dell Latitude 5540 Laptop', 'ICT', 'Laptop Computer', 'DL-LAT-5540-881', 'Latitude 5540', 'Dell Inc.', 'Dell',
      'ICT-C', 'ICT-101', 'ICT', 'MoCU/EMP/0103', 'SUP-001',
      '3500000', 'TZS', '2026-02-15', 'MoCU-PO-2026-033', 'INV-DEL-9122',
      'HEET Project', 'new', 'active', 'Core i7, 16GB RAM, 512GB SSD'
    ],
    [
      'Ergonomic High-Back Mesh Chair', 'FURN', 'Office Chair', 'CHR-MOCU-099', 'ErgoPro 500', 'KOF', 'KOF',
      'MCB', 'ADM-102', 'ACC_FIN', 'MoCU/EMP/0104', 'SUP-003',
      '650000', 'TZS', '2026-02-20', 'MoCU-PO-2026-034', 'INV-KOF-401',
      'MoCU Budget', 'new', 'active', 'Adjustable lumbar support and armrests'
    ]
  ];

  const csv = [headers.join(','), ...sampleRows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="MoCU_Asset_Import_Template.csv"');
  res.send(csv);
});

// POST /api/v1/import/preview (Validate rows without committing)
router.post('/preview', authenticateToken, requireRole('super_admin', 'asset_admin', 'asset_officer'), upload.single('file'), async (req, res) => {
  try {
    let rows = [];

    if (req.file) {
      // Parse CSV file content
      const content = fs.readFileSync(req.file.path, 'utf-8');
      const lines = content.split('\n').filter(l => l.trim().length > 0);
      if (lines.length <= 1) {
        return res.status(400).json({ success: false, message: 'CSV file is empty or missing data rows.' });
      }

      // Simple CSV line parser handling quotes
      const parseCsvLine = (line) => {
        const result = [];
        let cur = '';
        let inQuote = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"' && (i === 0 || line[i - 1] !== '\\')) {
            inQuote = !inQuote;
          } else if (char === ',' && !inQuote) {
            result.push(cur.trim().replace(/^"|"$/g, ''));
            cur = '';
          } else {
            cur += char;
          }
        }
        result.push(cur.trim().replace(/^"|"$/g, ''));
        return result;
      };

      const headers = parseCsvLine(lines[0]).map(h => h.trim().toLowerCase());
      for (let i = 1; i < lines.length; i++) {
        const values = parseCsvLine(lines[i]);
        const row = {};
        headers.forEach((h, idx) => {
          row[h] = values[idx] || '';
        });
        rows.push(row);
      }
    } else if (req.body.rows) {
      rows = Array.isArray(req.body.rows) ? req.body.rows : JSON.parse(req.body.rows);
    } else {
      return res.status(400).json({ success: false, message: 'No file or rows provided for preview.' });
    }

    const previewResult = await importService.previewImport(rows);
    res.json({ success: true, preview: previewResult });
  } catch (err) {
    console.error('Import preview error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/v1/import/commit (Commit valid rows)
router.post('/commit', authenticateToken, requireRole('super_admin', 'asset_admin'), async (req, res) => {
  try {
    const { validRows } = req.body;
    if (!validRows || !Array.isArray(validRows) || validRows.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid rows provided to commit.' });
    }

    const result = await importService.commitImport(validRows, req.user.id, req.user.full_name);

    logAudit(req, {
      action: 'BULK_IMPORT',
      entity_type: 'asset',
      entity_id: null,
      entity_code: `BATCH-${result.importedCount}`,
      details: `Bulk imported ${result.importedCount} institutional assets`
    });

    res.json({
      success: true,
      message: `Successfully registered ${result.importedCount} institutional assets into MoCU AMS.`,
      result
    });
  } catch (err) {
    console.error('Import commit error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/v1/export/assets (Full assets export to XLSX or CSV)
router.get('/export/assets', authenticateToken, async (req, res) => {
  try {
    const format = (req.query.format || 'xlsx').toLowerCase();
    const assets = db.query(`
      SELECT a.asset_number, a.barcode, a.name, a.asset_type, a.serial_number, a.model, a.brand,
             c.name as category_name, d.name as department_name, b.name as building_name, r.room_name,
             (s.first_name || ' ' || s.last_name) as custodian_name,
             a.acquisition_method, a.acquisition_date, a.acquisition_cost, a.currency,
             a.current_book_value, a.accumulated_depreciation, a.funding_source,
             a.condition, a.status, a.warranty_expiry_date
      FROM assets a
      LEFT JOIN asset_categories c ON a.category_id = c.id
      LEFT JOIN departments d ON a.department_id = d.id
      LEFT JOIN buildings b ON a.building_id = b.id
      LEFT JOIN rooms r ON a.room_id = r.id
      LEFT JOIN staff s ON a.custodian_id = s.id
      ORDER BY a.id ASC
    `);

    const filename = `MoCU_Asset_Catalogue_${new Date().toISOString().split('T')[0]}`;

    if (format === 'csv') {
      const csv = reportService.generateCsv(assets);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      res.send(csv);
    } else {
      const workbook = await reportService.generateExcelWorkbook('asset_catalogue', assets);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
      await workbook.xlsx.write(res);
      res.end();
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
