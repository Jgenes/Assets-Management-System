const db = require('../db/database');
const barcodeService = require('./barcodeService');

const importService = {
  validateRow(row, rowIndex, seenAssetNumbers, seenBarcodes, seenSerials) {
    const errors = [];

    if (!row.name || !row.name.trim()) {
      errors.push('Asset Name is required');
    }

    // Category
    let category = null;
    if (row.category_code) {
      category = db.get('SELECT id, code, useful_life_years, residual_rate FROM asset_categories WHERE code = ?', [row.category_code.trim().toUpperCase()]);
      if (!category) errors.push(`Unknown category code: '${row.category_code}'`);
    } else if (row.category_id) {
      category = db.get('SELECT id, code, useful_life_years, residual_rate FROM asset_categories WHERE id = ?', [row.category_id]);
      if (!category) errors.push(`Unknown category ID: '${row.category_id}'`);
    } else {
      errors.push('Category code or category ID is required');
    }

    // Serial number duplicate check
    if (row.serial_number && row.serial_number.trim()) {
      const serial = row.serial_number.trim();
      if (seenSerials.has(serial)) {
        errors.push(`Duplicate serial number '${serial}' in import file`);
      } else {
        const existing = db.get('SELECT id FROM assets WHERE serial_number = ?', [serial]);
        if (existing) {
          errors.push(`Serial number '${serial}' already exists in database`);
        }
        seenSerials.add(serial);
      }
    }

    // Building
    let building = null;
    if (row.building_code) {
      building = db.get('SELECT id FROM buildings WHERE code = ?', [row.building_code.trim().toUpperCase()]);
      if (!building) errors.push(`Unknown building code: '${row.building_code}'`);
    }

    // Room
    let room = null;
    if (row.room_code) {
      room = db.get('SELECT id, building_id FROM rooms WHERE room_code = ?', [row.room_code.trim().toUpperCase()]);
      if (!room) errors.push(`Unknown room code: '${row.room_code}'`);
    }

    // Department
    let department = null;
    if (row.department_code) {
      department = db.get('SELECT id FROM departments WHERE code = ?', [row.department_code.trim().toUpperCase()]);
      if (!department) errors.push(`Unknown department code: '${row.department_code}'`);
    }

    // Custodian / Staff
    let custodian = null;
    if (row.staff_id) {
      custodian = db.get('SELECT id FROM staff WHERE staff_id = ?', [row.staff_id.trim()]);
      if (!custodian) errors.push(`Unknown staff/custodian ID: '${row.staff_id}'`);
    }

    // Supplier
    let supplier = null;
    if (row.supplier_code) {
      supplier = db.get('SELECT id FROM suppliers WHERE code = ?', [row.supplier_code.trim().toUpperCase()]);
    }

    const cost = parseFloat(row.purchase_price || row.acquisition_cost || 0) || 0;

    return {
      rowIndex,
      isValid: errors.length === 0,
      errors,
      parsedData: errors.length === 0 ? {
        name: row.name.trim(),
        description: row.description || '',
        category_id: category.id,
        category_code: category.code,
        asset_type: row.asset_type || '',
        serial_number: row.serial_number ? row.serial_number.trim() : null,
        model: row.model || '',
        manufacturer: row.manufacturer || '',
        brand: row.brand || '',
        building_id: building ? building.id : (room ? room.building_id : null),
        room_id: room ? room.id : null,
        department_id: department ? department.id : null,
        custodian_id: custodian ? custodian.id : null,
        acquisition_date: row.acquisition_date || new Date().toISOString().split('T')[0],
        purchase_price: cost,
        acquisition_cost: cost,
        currency: row.currency || 'TZS',
        funding_source: row.funding_source || 'MoCU Budget',
        purchase_order_no: row.purchase_order_no || null,
        invoice_no: row.invoice_no || null,
        supplier_id: supplier ? supplier.id : null,
        useful_life_years: category.useful_life_years || 5,
        residual_value: cost * (category.residual_rate || 0.1),
        current_book_value: cost,
        condition: row.condition || 'good',
        status: row.status || 'active'
      } : null
    };
  },

  async previewImport(rows) {
    const seenAssetNumbers = new Set();
    const seenBarcodes = new Set();
    const seenSerials = new Set();

    const results = [];
    let validCount = 0;
    let errorCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const validation = this.validateRow(rows[i], i + 1, seenAssetNumbers, seenBarcodes, seenSerials);
      if (validation.isValid) {
        validCount++;
      } else {
        errorCount++;
      }
      results.push(validation);
    }

    return {
      totalRows: rows.length,
      validCount,
      errorCount,
      rows: results
    };
  },

  async commitImport(validRowsData, userId = 1, userName = 'Administrator') {
    const insertedAssets = [];

    db.transaction(() => {
      for (const item of validRowsData) {
        // Auto-generate Asset Number & Barcode
        const assetNumber = barcodeService.generateAssetNumber(item.category_code);
        // Wait, generateAssetNumber is async in barcodeService! Let's do it synchronously here:
        const year = new Date().getFullYear();
        const prefixSetting = db.get("SELECT value FROM system_settings WHERE key = 'asset_number_prefix'");
        const prefix = prefixSetting ? prefixSetting.value : 'MoCU';
        const cleanCat = (item.category_code || 'GEN').toUpperCase().replace(/[^A-Z0-9]/g, '');

        const lastAsset = db.get(`
          SELECT asset_number FROM assets
          WHERE asset_number LIKE ?
          ORDER BY id DESC LIMIT 1
        `, [`${prefix}/${cleanCat}/${year}/%`]);

        let seq = 1;
        if (lastAsset && lastAsset.asset_number) {
          const parts = lastAsset.asset_number.split('/');
          const lastSeq = parseInt(parts[parts.length - 1], 10);
          if (!isNaN(lastSeq)) seq = lastSeq + 1;
        }

        const fullAssetNumber = `${prefix}/${cleanCat}/${year}/${String(seq).padStart(6, '0')}`;
        const barcode = fullAssetNumber.replace(/\//g, '-').toUpperCase();
        const qrCode = `https://mocu.ac.tz/ams/asset/${barcode}`;

        const insert = db.getRawDb().prepare(`
          INSERT INTO assets (
            asset_number, barcode, qr_code, name, description,
            category_id, asset_type, serial_number, model, manufacturer, brand,
            building_id, room_id, department_id, custodian_id,
            acquisition_method, acquisition_date, purchase_price, acquisition_cost, currency,
            funding_source, purchase_order_no, invoice_no, supplier_id,
            useful_life_years, residual_value, current_book_value,
            condition, status, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'purchase', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const res = insert.run(
          fullAssetNumber, barcode, qrCode, item.name, item.description,
          item.category_id, item.asset_type, item.serial_number, item.model, item.manufacturer, item.brand,
          item.building_id, item.room_id, item.department_id, item.custodian_id,
          item.acquisition_date, item.purchase_price, item.acquisition_cost, item.currency,
          item.funding_source, item.purchase_order_no, item.invoice_no, item.supplier_id,
          item.useful_life_years, item.residual_value, item.current_book_value,
          item.condition, item.status, userId
        );

        const assetId = Number(res.lastInsertRowid);

        db.run(`
          INSERT INTO asset_history (asset_id, event_type, title, description, to_value, performed_by, performed_by_name)
          VALUES (?, 'registration', 'Bulk Import Registered', 'Asset registered via bulk import tool', 'active', ?, ?)
        `, [assetId, userId, userName]);

        insertedAssets.push({ id: assetId, asset_number: fullAssetNumber, barcode, name: item.name });
      }
    });

    return {
      success: true,
      importedCount: insertedAssets.length,
      assets: insertedAssets
    };
  }
};

module.exports = importService;
