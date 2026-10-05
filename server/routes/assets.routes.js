const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');
const barcodeService = require('../services/barcodeService');
const depreciationService = require('../services/depreciationService');
const upload = require('../middleware/upload');

// GET /api/v1/assets (List with search, filters, pagination)
router.get('/', authenticateToken, (req, res) => {
  const {
    search,
    category_id,
    department_id,
    building_id,
    room_id,
    custodian_id,
    campus_id,
    condition,
    status,
    is_capital,
    sort_by = 'id',
    sort_order = 'DESC',
    page = 1,
    limit = 50
  } = req.query;

  let query = `
    SELECT a.*,
           c.name as category_name, c.code as category_code,
           d.name as department_name, d.code as department_code,
           b.name as building_name, b.code as building_code,
           r.room_name, r.room_code,
           (s.first_name || ' ' || s.last_name) as custodian_name,
           s.staff_id as custodian_staff_id,
           cp.name as campus_name,
           sp.name as supplier_name
    FROM assets a
    LEFT JOIN asset_categories c ON a.category_id = c.id
    LEFT JOIN departments d ON a.department_id = d.id
    LEFT JOIN buildings b ON a.building_id = b.id
    LEFT JOIN rooms r ON a.room_id = r.id
    LEFT JOIN staff s ON a.custodian_id = s.id
    LEFT JOIN campuses cp ON a.campus_id = cp.id
    LEFT JOIN suppliers sp ON a.supplier_id = sp.id
    WHERE 1=1
  `;
  const params = [];

  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    query += ` AND (
      a.asset_number LIKE ? OR
      a.barcode LIKE ? OR
      a.name LIKE ? OR
      a.serial_number LIKE ? OR
      a.model LIKE ? OR
      a.brand LIKE ? OR
      a.description LIKE ?
    )`;
    params.push(term, term, term, term, term, term, term);
  }

  if (category_id) {
    query += ' AND a.category_id = ?';
    params.push(category_id);
  }
  if (department_id) {
    query += ' AND a.department_id = ?';
    params.push(department_id);
  }
  if (building_id) {
    query += ' AND a.building_id = ?';
    params.push(building_id);
  }
  if (room_id) {
    query += ' AND a.room_id = ?';
    params.push(room_id);
  }
  if (custodian_id) {
    query += ' AND a.custodian_id = ?';
    params.push(custodian_id);
  }
  if (campus_id) {
    query += ' AND a.campus_id = ?';
    params.push(campus_id);
  }
  if (condition) {
    query += ' AND a.condition = ?';
    params.push(condition);
  }
  if (status) {
    query += ' AND a.status = ?';
    params.push(status);
  }
  if (is_capital !== undefined && is_capital !== '') {
    query += ' AND a.is_capital = ?';
    params.push(parseInt(is_capital, 10));
  }

  // Count total matching
  const countSql = `SELECT COUNT(*) as total FROM (${query})`;
  const countRes = db.get(countSql, params);
  const total = countRes ? countRes.total : 0;

  // Ordering
  const allowedSortCols = ['id', 'asset_number', 'name', 'acquisition_date', 'acquisition_cost', 'current_book_value', 'condition', 'status'];
  const safeSortCol = allowedSortCols.includes(sort_by) ? `a.${sort_by}` : 'a.id';
  const safeOrder = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  query += ` ORDER BY ${safeSortCol} ${safeOrder}`;

  // Pagination
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10)));
  const offset = (pageNum - 1) * limitNum;

  query += ' LIMIT ? OFFSET ?';
  params.push(limitNum, offset);

  const assets = db.query(query, params);

  res.json({
    success: true,
    data: assets,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum)
    }
  });
});

// GET /api/v1/assets/lookup/:code (Quick scanner lookup by barcode, QR or asset_number)
router.get('/lookup/:code', authenticateToken, (req, res) => {
  const code = req.params.code.trim();

  // Try exact barcode, asset_number, or substring
  const asset = db.get(`
    SELECT a.*,
           c.name as category_name, c.code as category_code,
           d.name as department_name, d.code as department_code,
           b.name as building_name, b.code as building_code,
           r.room_name, r.room_code, r.location_type,
           (s.first_name || ' ' || s.last_name) as custodian_name,
           s.staff_id as custodian_staff_id, s.phone as custodian_phone,
           cp.name as campus_name,
           sp.name as supplier_name
    FROM assets a
    LEFT JOIN asset_categories c ON a.category_id = c.id
    LEFT JOIN departments d ON a.department_id = d.id
    LEFT JOIN buildings b ON a.building_id = b.id
    LEFT JOIN rooms r ON a.room_id = r.id
    LEFT JOIN staff s ON a.custodian_id = s.id
    LEFT JOIN campuses cp ON a.campus_id = cp.id
    LEFT JOIN suppliers sp ON a.supplier_id = sp.id
    WHERE a.barcode = ? OR a.asset_number = ? OR a.qr_code LIKE ?
  `, [code, code, `%${code}%`]);

  if (!asset) {
    return res.status(404).json({
      success: false,
      message: `No asset found matching code '${code}'`,
      code
    });
  }

  // Get last verification record
  const lastVerification = db.get(`
    SELECT v.*, u.full_name as verifier_name
    FROM asset_verifications v
    LEFT JOIN users u ON v.verifier_id = u.id
    WHERE v.asset_id = ?
    ORDER BY v.verified_at DESC LIMIT 1
  `, [asset.id]);

  res.json({
    success: true,
    asset: {
      ...asset,
      last_verification: lastVerification
    }
  });
});

// GET /api/v1/assets/:id (Single asset detail with full history and relations)
router.get('/:id', authenticateToken, (req, res) => {
  const asset = db.get(`
    SELECT a.*,
           c.name as category_name, c.code as category_code,
           sc.name as subcategory_name,
           d.name as department_name, d.code as department_code,
           b.name as building_name, b.code as building_code,
           fl.floor_name, fl.floor_number,
           r.room_name, r.room_code, r.location_type,
           (s.first_name || ' ' || s.last_name) as custodian_name,
           s.staff_id as custodian_staff_id, s.email as custodian_email, s.phone as custodian_phone, s.position as custodian_position,
           cp.name as campus_name,
           sp.name as supplier_name, sp.phone as supplier_phone, sp.email as supplier_email,
           creator.full_name as created_by_name
    FROM assets a
    LEFT JOIN asset_categories c ON a.category_id = c.id
    LEFT JOIN asset_subcategories sc ON a.subcategory_id = sc.id
    LEFT JOIN departments d ON a.department_id = d.id
    LEFT JOIN buildings b ON a.building_id = b.id
    LEFT JOIN floors fl ON a.floor_id = fl.id
    LEFT JOIN rooms r ON a.room_id = r.id
    LEFT JOIN staff s ON a.custodian_id = s.id
    LEFT JOIN campuses cp ON a.campus_id = cp.id
    LEFT JOIN suppliers sp ON a.supplier_id = sp.id
    LEFT JOIN users creator ON a.created_by = creator.id
    WHERE a.id = ?
  `, [req.params.id]);

  if (!asset) {
    return res.status(404).json({ success: false, message: 'Asset not found.' });
  }

  const history = db.query(`
    SELECT * FROM asset_history
    WHERE asset_id = ?
    ORDER BY event_date DESC, id DESC
  `, [asset.id]);

  const verifications = db.query(`
    SELECT v.*, u.full_name as verifier_name, b.name as building_name, r.room_name
    FROM asset_verifications v
    LEFT JOIN users u ON v.verifier_id = u.id
    LEFT JOIN buildings b ON v.verified_building_id = b.id
    LEFT JOIN rooms r ON v.verified_room_id = r.id
    WHERE v.asset_id = ?
    ORDER BY v.verified_at DESC
  `, [asset.id]);

  const transfers = db.query(`
    SELECT t.*, fb.name as from_building, tb.name as to_building,
           fd.name as from_dept, td.name as to_dept,
           (fs.first_name || ' ' || fs.last_name) as from_custodian_name,
           (ts.first_name || ' ' || ts.last_name) as to_custodian_name,
           u.full_name as requested_by_name
    FROM asset_transfers t
    LEFT JOIN buildings fb ON t.from_building_id = fb.id
    LEFT JOIN buildings tb ON t.to_building_id = tb.id
    LEFT JOIN departments fd ON t.from_department_id = fd.id
    LEFT JOIN departments td ON t.to_department_id = td.id
    LEFT JOIN staff fs ON t.from_custodian_id = fs.id
    LEFT JOIN staff ts ON t.to_custodian_id = ts.id
    LEFT JOIN users u ON t.requested_by = u.id
    WHERE t.asset_id = ?
    ORDER BY t.created_at DESC
  `, [asset.id]);

  const maintenance = db.query(`
    SELECT m.*, u.full_name as requested_by_name
    FROM asset_maintenance m
    LEFT JOIN users u ON m.requested_by = u.id
    WHERE m.asset_id = ?
    ORDER BY m.created_at DESC
  `, [asset.id]);

  const documents = db.query(`
    SELECT d.*, u.full_name as uploaded_by_name
    FROM asset_documents d
    LEFT JOIN users u ON d.uploaded_by = u.id
    WHERE d.asset_id = ?
    ORDER BY d.created_at DESC
  `, [asset.id]);

  const depreciationSchedule = depreciationService.calculateSchedule(asset);

  res.json({
    success: true,
    asset: {
      ...asset,
      history,
      verifications,
      transfers,
      maintenance,
      documents,
      depreciationSchedule
    }
  });
});

// POST /api/v1/assets (Register new asset)
router.post('/', authenticateToken, requireRole('super_admin', 'asset_admin', 'asset_officer', 'procurement_officer'), async (req, res) => {
  try {
    const {
      name, description, category_id, subcategory_id, asset_type,
      serial_number, model, manufacturer, brand, part_number,
      is_capital = 1, is_tangible = 1,
      campus_id, building_id, floor_id, room_id, department_id, custodian_id, date_assigned,
      acquisition_method = 'purchase', acquisition_date, purchase_price = 0, acquisition_cost = 0,
      currency = 'TZS', purchase_order_no, invoice_no, funding_source, project_program, budget_code,
      supplier_id, useful_life_years, residual_value, depreciation_method = 'straight_line',
      warranty_provider, warranty_start_date, warranty_expiry_date, warranty_terms,
      condition = 'good', status = 'active', remarks
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Asset Name is required.' });
    }
    if (!category_id) {
      return res.status(400).json({ success: false, message: 'Category is required.' });
    }

    const category = db.get('SELECT code, useful_life_years, residual_rate FROM asset_categories WHERE id = ?', [category_id]);
    if (!category) {
      return res.status(400).json({ success: false, message: 'Invalid category specified.' });
    }

    // Auto-generate unique asset number and barcode
    const assetNumber = await barcodeService.generateAssetNumber(category.code);
    const barcode = barcodeService.generateBarcodeString(assetNumber);
    const qrCode = `https://mocu.ac.tz/ams/asset/${barcode}`;

    // Verify barcode uniqueness
    if (!barcodeService.isBarcodeAvailable(barcode)) {
      return res.status(400).json({ success: false, message: 'Generated barcode collision. Please retry.' });
    }

    const cost = parseFloat(acquisition_cost || purchase_price || 0) || 0;
    const lifeYears = parseInt(useful_life_years || category.useful_life_years || 5, 10);
    const residualVal = residual_value !== undefined ? parseFloat(residual_value) : cost * (category.residual_rate || 0.1);

    let newAssetId;
    db.transaction(() => {
      const insert = db.getRawDb().prepare(`
        INSERT INTO assets (
          asset_number, barcode, qr_code, name, description,
          category_id, subcategory_id, asset_type, serial_number, model, manufacturer, brand, part_number,
          is_capital, is_tangible,
          campus_id, building_id, floor_id, room_id, department_id, custodian_id, date_assigned,
          acquisition_method, acquisition_date, purchase_price, acquisition_cost, currency,
          purchase_order_no, invoice_no, funding_source, project_program, budget_code,
          supplier_id, useful_life_years, residual_value, depreciation_method,
          current_book_value, accumulated_depreciation,
          warranty_provider, warranty_start_date, warranty_expiry_date, warranty_terms,
          condition, status, remarks, created_by
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?,
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, 0,
          ?, ?, ?, ?,
          ?, ?, ?, ?
        )
      `);

      const result = insert.run(
        assetNumber, barcode, qrCode, name.trim(), description || null,
        category_id, subcategory_id || null, asset_type || null, serial_number || null, model || null, manufacturer || null, brand || null, part_number || null,
        is_capital ? 1 : 0, is_tangible ? 1 : 0,
        campus_id || null, building_id || null, floor_id || null, room_id || null, department_id || null, custodian_id || null, date_assigned || (custodian_id ? new Date().toISOString().split('T')[0] : null),
        acquisition_method, acquisition_date || new Date().toISOString().split('T')[0], purchase_price || cost, cost, currency || 'TZS',
        purchase_order_no || null, invoice_no || null, funding_source || null, project_program || null, budget_code || null,
        supplier_id || null, lifeYears, residualVal, depreciation_method,
        cost,
        warranty_provider || null, warranty_start_date || null, warranty_expiry_date || null, warranty_terms || null,
        condition, status, remarks || null, req.user.id
      );

      newAssetId = Number(result.lastInsertRowid);

      // Record initial history
      db.run(`
        INSERT INTO asset_history (asset_id, event_type, title, description, to_value, performed_by, performed_by_name)
        VALUES (?, 'registration', 'Asset Registered', ?, ?, ?, ?)
      `, [
        newAssetId,
        `Asset registered with number ${assetNumber} and barcode ${barcode}`,
        status,
        req.user.id,
        req.user.full_name
      ]);

      if (custodian_id) {
        db.run(`
          INSERT INTO asset_history (asset_id, event_type, title, description, to_value, performed_by, performed_by_name)
          VALUES (?, 'assignment', 'Custodian Assigned', ?, ?, ?, ?)
        `, [
          newAssetId,
          `Initial custody assigned to staff ID #${custodian_id}`,
          `Custodian #${custodian_id}`,
          req.user.id,
          req.user.full_name
        ]);
      }
    });

    logAudit(req, {
      action: 'ASSET_CREATED',
      entity_type: 'asset',
      entity_id: newAssetId,
      entity_code: assetNumber,
      new_values: { asset_number: assetNumber, barcode, name, cost },
      details: `Registered asset: ${name} (${assetNumber})`
    });

    res.status(201).json({
      success: true,
      message: 'Asset registered successfully.',
      asset: {
        id: newAssetId,
        asset_number: assetNumber,
        barcode,
        qr_code: qrCode,
        name
      }
    });
  } catch (err) {
    console.error('Asset creation error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/v1/assets/:id (Update asset)
router.put('/:id', authenticateToken, requireRole('super_admin', 'asset_admin', 'asset_officer'), async (req, res) => {
  try {
    const assetId = req.params.id;
    const existing = db.get('SELECT * FROM assets WHERE id = ?', [assetId]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Asset not found.' });
    }

    const {
      name, description, category_id, subcategory_id, asset_type,
      serial_number, model, manufacturer, brand, part_number,
      is_capital, is_tangible,
      campus_id, building_id, floor_id, room_id, department_id, custodian_id, date_assigned,
      acquisition_method, acquisition_date, purchase_price, acquisition_cost, currency,
      purchase_order_no, invoice_no, funding_source, project_program, budget_code,
      supplier_id, useful_life_years, residual_value, depreciation_method,
      current_book_value, condition, status, remarks,
      warranty_provider, warranty_start_date, warranty_expiry_date, warranty_terms
    } = req.body;

    const changes = [];
    if (condition && condition !== existing.condition) {
      changes.push(`Condition changed from '${existing.condition}' to '${condition}'`);
    }
    if (status && status !== existing.status) {
      changes.push(`Status changed from '${existing.status}' to '${status}'`);
    }

    db.transaction(() => {
      db.run(`
        UPDATE assets
        SET name = ?, description = ?, category_id = ?, subcategory_id = ?, asset_type = ?,
            serial_number = ?, model = ?, manufacturer = ?, brand = ?, part_number = ?,
            is_capital = ?, is_tangible = ?,
            campus_id = ?, building_id = ?, floor_id = ?, room_id = ?, department_id = ?, custodian_id = ?, date_assigned = ?,
            acquisition_method = ?, acquisition_date = ?, purchase_price = ?, acquisition_cost = ?, currency = ?,
            purchase_order_no = ?, invoice_no = ?, funding_source = ?, project_program = ?, budget_code = ?,
            supplier_id = ?, useful_life_years = ?, residual_value = ?, depreciation_method = ?,
            current_book_value = ?, condition = ?, status = ?, remarks = ?,
            warranty_provider = ?, warranty_start_date = ?, warranty_expiry_date = ?, warranty_terms = ?,
            updated_at = datetime('now')
        WHERE id = ?
      `, [
        name || existing.name,
        description !== undefined ? description : existing.description,
        category_id || existing.category_id,
        subcategory_id !== undefined ? subcategory_id : existing.subcategory_id,
        asset_type !== undefined ? asset_type : existing.asset_type,
        serial_number !== undefined ? serial_number : existing.serial_number,
        model !== undefined ? model : existing.model,
        manufacturer !== undefined ? manufacturer : existing.manufacturer,
        brand !== undefined ? brand : existing.brand,
        part_number !== undefined ? part_number : existing.part_number,
        is_capital !== undefined ? (is_capital ? 1 : 0) : existing.is_capital,
        is_tangible !== undefined ? (is_tangible ? 1 : 0) : existing.is_tangible,
        campus_id !== undefined ? campus_id : existing.campus_id,
        building_id !== undefined ? building_id : existing.building_id,
        floor_id !== undefined ? floor_id : existing.floor_id,
        room_id !== undefined ? room_id : existing.room_id,
        department_id !== undefined ? department_id : existing.department_id,
        custodian_id !== undefined ? custodian_id : existing.custodian_id,
        date_assigned !== undefined ? date_assigned : existing.date_assigned,
        acquisition_method || existing.acquisition_method,
        acquisition_date || existing.acquisition_date,
        purchase_price !== undefined ? purchase_price : existing.purchase_price,
        acquisition_cost !== undefined ? acquisition_cost : existing.acquisition_cost,
        currency || existing.currency,
        purchase_order_no !== undefined ? purchase_order_no : existing.purchase_order_no,
        invoice_no !== undefined ? invoice_no : existing.invoice_no,
        funding_source !== undefined ? funding_source : existing.funding_source,
        project_program !== undefined ? project_program : existing.project_program,
        budget_code !== undefined ? budget_code : existing.budget_code,
        supplier_id !== undefined ? supplier_id : existing.supplier_id,
        useful_life_years !== undefined ? useful_life_years : existing.useful_life_years,
        residual_value !== undefined ? residual_value : existing.residual_value,
        depreciation_method || existing.depreciation_method,
        current_book_value !== undefined ? current_book_value : existing.current_book_value,
        condition || existing.condition,
        status || existing.status,
        remarks !== undefined ? remarks : existing.remarks,
        warranty_provider !== undefined ? warranty_provider : existing.warranty_provider,
        warranty_start_date !== undefined ? warranty_start_date : existing.warranty_start_date,
        warranty_expiry_date !== undefined ? warranty_expiry_date : existing.warranty_expiry_date,
        warranty_terms !== undefined ? warranty_terms : existing.warranty_terms,
        assetId
      ]);

      if (changes.length > 0) {
        db.run(`
          INSERT INTO asset_history (asset_id, event_type, title, description, from_value, to_value, performed_by, performed_by_name)
          VALUES (?, 'status_update', 'Asset Information Updated', ?, ?, ?, ?, ?)
        `, [
          assetId,
          changes.join('; '),
          existing.status,
          status || existing.status,
          req.user.id,
          req.user.full_name
        ]);
      }
    });

    logAudit(req, {
      action: 'ASSET_UPDATED',
      entity_type: 'asset',
      entity_id: assetId,
      entity_code: existing.asset_number,
      old_values: { condition: existing.condition, status: existing.status },
      new_values: { condition: condition || existing.condition, status: status || existing.status },
      details: `Updated asset ${existing.asset_number}: ${changes.join(', ') || 'Details modified'}`
    });

    res.json({ success: true, message: 'Asset updated successfully.' });
  } catch (err) {
    console.error('Asset update error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/v1/assets/:id/barcode (Barcode & QR code assets)
router.get('/:id/barcode', authenticateToken, async (req, res) => {
  const asset = db.get('SELECT id, asset_number, barcode, qr_code, name, serial_number FROM assets WHERE id = ?', [req.params.id]);
  if (!asset) return res.status(404).json({ success: false, message: 'Asset not found.' });

  try {
    const qrDataUrl = await barcodeService.generateQrCodeDataUrl(asset.qr_code || asset.barcode);
    const qrSvg = await barcodeService.generateQrSvg(asset.qr_code || asset.barcode);

    res.json({
      success: true,
      asset_number: asset.asset_number,
      barcode: asset.barcode,
      qr_code: asset.qr_code,
      qr_data_url: qrDataUrl,
      qr_svg: qrSvg
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/v1/assets/:id/documents (Upload file/photo)
router.post('/:id/documents', authenticateToken, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file provided.' });
  }

  const { document_type = 'photo', notes } = req.body;
  const assetId = req.params.id;

  const result = db.run(`
    INSERT INTO asset_documents (
      asset_id, document_type, file_name, file_path, file_size, mime_type, uploaded_by, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    assetId,
    document_type,
    req.file.originalname,
    `/uploads/${req.file.filename}`,
    req.file.size,
    req.file.mimetype,
    req.user.id,
    notes || null
  ]);

  // If it's a photo, update asset image_url
  if (req.file.mimetype.startsWith('image/')) {
    db.run('UPDATE assets SET image_url = ? WHERE id = ?', [`/uploads/${req.file.filename}`, assetId]);
  }

  res.status(201).json({
    success: true,
    message: 'File uploaded successfully.',
    documentId: Number(result.lastInsertRowid),
    file_path: `/uploads/${req.file.filename}`
  });
});

module.exports = router;
