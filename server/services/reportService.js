const ExcelJS = require('exceljs');
const db = require('../db/database');

const reportService = {
  getReportData(reportType, filters = {}) {
    let query = '';
    const params = [];

    switch (reportType) {
      case 'asset_register':
        query = `
          SELECT a.id, a.asset_number, a.barcode, a.name, a.serial_number, a.model, a.brand,
                 c.name as category_name, d.name as department_name, b.name as building_name,
                 r.room_name, r.room_code,
                 (s.first_name || ' ' || s.last_name) as custodian_name,
                 a.condition, a.status, a.acquisition_date, a.acquisition_cost, a.current_book_value,
                 a.currency, a.funding_source
          FROM assets a
          LEFT JOIN asset_categories c ON a.category_id = c.id
          LEFT JOIN departments d ON a.department_id = d.id
          LEFT JOIN buildings b ON a.building_id = b.id
          LEFT JOIN rooms r ON a.room_id = r.id
          LEFT JOIN staff s ON a.custodian_id = s.id
          WHERE 1=1
        `;
        break;

      case 'department_register':
        query = `
          SELECT d.name as department_name, d.code as department_code,
                 COUNT(a.id) as total_assets,
                 SUM(a.acquisition_cost) as total_acquisition_cost,
                 SUM(a.current_book_value) as total_book_value,
                 SUM(CASE WHEN a.condition = 'good' OR a.condition = 'new' THEN 1 ELSE 0 END) as good_condition_count,
                 SUM(CASE WHEN a.condition = 'damaged' OR a.condition = 'poor' THEN 1 ELSE 0 END) as damaged_count
          FROM departments d
          LEFT JOIN assets a ON d.id = a.department_id
          WHERE 1=1
          GROUP BY d.id, d.name, d.code
        `;
        break;

      case 'building_register':
        query = `
          SELECT b.name as building_name, b.code as building_code, cp.name as campus_name,
                 b.floors_count,
                 COUNT(a.id) as total_assets,
                 SUM(a.acquisition_cost) as total_acquisition_cost,
                 SUM(a.current_book_value) as total_book_value,
                 COUNT(DISTINCT r.id) as total_rooms_with_assets
          FROM buildings b
          LEFT JOIN campuses cp ON b.campus_id = cp.id
          LEFT JOIN rooms r ON b.id = r.building_id
          LEFT JOIN assets a ON b.id = a.building_id
          WHERE 1=1
          GROUP BY b.id, b.name, b.code, cp.name, b.floors_count
        `;
        break;

      case 'room_register':
        query = `
          SELECT r.room_code, r.room_name, r.location_type, b.name as building_name,
                 d.name as department_name,
                 COUNT(a.id) as total_assets,
                 SUM(a.acquisition_cost) as total_value
          FROM rooms r
          LEFT JOIN buildings b ON r.building_id = b.id
          LEFT JOIN departments d ON r.department_id = d.id
          LEFT JOIN assets a ON r.id = a.room_id
          WHERE 1=1
          GROUP BY r.id, r.room_code, r.room_name, r.location_type, b.name, d.name
        `;
        break;

      case 'custodian_register':
        query = `
          SELECT s.staff_id, (s.first_name || ' ' || s.last_name) as custodian_name,
                 s.position, d.name as department_name, s.email, s.phone,
                 COUNT(a.id) as assigned_assets_count,
                 SUM(a.acquisition_cost) as total_custody_value
          FROM staff s
          LEFT JOIN departments d ON s.department_id = d.id
          LEFT JOIN assets a ON s.id = a.custodian_id
          WHERE 1=1
          GROUP BY s.id, s.staff_id, s.first_name, s.last_name, s.position, d.name, s.email, s.phone
        `;
        break;

      case 'category_report':
        query = `
          SELECT c.code as category_code, c.name as category_name, c.depreciation_method,
                 c.useful_life_years,
                 COUNT(a.id) as total_assets,
                 SUM(a.acquisition_cost) as total_cost,
                 SUM(a.current_book_value) as total_current_value,
                 SUM(a.accumulated_depreciation) as total_depreciation
          FROM asset_categories c
          LEFT JOIN assets a ON c.id = a.category_id
          WHERE 1=1
          GROUP BY c.id, c.code, c.name, c.depreciation_method, c.useful_life_years
        `;
        break;

      case 'condition_report':
        query = `
          SELECT a.condition, COUNT(a.id) as count,
                 SUM(a.acquisition_cost) as total_cost,
                 SUM(a.current_book_value) as total_book_value
          FROM assets a
          WHERE 1=1
          GROUP BY a.condition
        `;
        break;

      case 'missing_assets':
        query = `
          SELECT a.id, a.asset_number, a.barcode, a.name, c.name as category_name,
                 d.name as department_name, b.name as building_name, r.room_name,
                 (s.first_name || ' ' || s.last_name) as custodian_name,
                 a.status, a.condition, a.last_verified_at
          FROM assets a
          LEFT JOIN asset_categories c ON a.category_id = c.id
          LEFT JOIN departments d ON a.department_id = d.id
          LEFT JOIN buildings b ON a.building_id = b.id
          LEFT JOIN rooms r ON a.room_id = r.id
          LEFT JOIN staff s ON a.custodian_id = s.id
          WHERE a.status IN ('missing', 'lost', 'stolen')
             OR a.id NOT IN (
               SELECT asset_id FROM asset_verifications
               WHERE campaign_id = (SELECT id FROM verification_campaigns WHERE status = 'in_progress' ORDER BY id DESC LIMIT 1)
             )
        `;
        break;

      case 'verification_report':
        query = `
          SELECT v.id, v.verified_at, vc.title as campaign_title,
                 a.asset_number, a.name as asset_name, a.barcode,
                 u.full_name as verifier_name,
                 v.verified_condition,
                 b.name as verified_building,
                 r.room_name as verified_room,
                 v.is_location_mismatch, v.is_department_mismatch, v.is_condition_changed,
                 v.verification_status, v.remarks
          FROM asset_verifications v
          JOIN assets a ON v.asset_id = a.id
          LEFT JOIN verification_campaigns vc ON v.campaign_id = vc.id
          LEFT JOIN users u ON v.verifier_id = u.id
          LEFT JOIN buildings b ON v.verified_building_id = b.id
          LEFT JOIN rooms r ON v.verified_room_id = r.id
          WHERE 1=1
        `;
        break;

      case 'unverified_report':
        query = `
          SELECT a.id, a.asset_number, a.barcode, a.name, c.name as category_name,
                 d.name as department_name, b.name as building_name, r.room_name,
                 (s.first_name || ' ' || s.last_name) as custodian_name,
                 a.condition, a.status, a.last_verified_at
          FROM assets a
          LEFT JOIN asset_categories c ON a.category_id = c.id
          LEFT JOIN departments d ON a.department_id = d.id
          LEFT JOIN buildings b ON a.building_id = b.id
          LEFT JOIN rooms r ON a.room_id = r.id
          LEFT JOIN staff s ON a.custodian_id = s.id
          WHERE a.last_verified_at IS NULL
             OR a.last_verified_at < date('now', '-6 months')
        `;
        break;

      case 'transfer_report':
        query = `
          SELECT t.transfer_number, t.transfer_date, a.asset_number, a.name as asset_name,
                 fb.name as from_building, tb.name as to_building,
                 fd.name as from_department, td.name as to_department,
                 (fs.first_name || ' ' || fs.last_name) as from_custodian,
                 (ts.first_name || ' ' || ts.last_name) as to_custodian,
                 t.status, t.reason, req.full_name as requested_by_name,
                 app.full_name as approved_by_name
          FROM asset_transfers t
          JOIN assets a ON t.asset_id = a.id
          LEFT JOIN buildings fb ON t.from_building_id = fb.id
          LEFT JOIN buildings tb ON t.to_building_id = tb.id
          LEFT JOIN departments fd ON t.from_department_id = fd.id
          LEFT JOIN departments td ON t.to_department_id = td.id
          LEFT JOIN staff fs ON t.from_custodian_id = fs.id
          LEFT JOIN staff ts ON t.to_custodian_id = ts.id
          LEFT JOIN users req ON t.requested_by = req.id
          LEFT JOIN users app ON t.approved_by = app.id
          WHERE 1=1
        `;
        break;

      case 'maintenance_report':
        query = `
          SELECT m.maintenance_number, a.asset_number, a.name as asset_name,
                 m.maintenance_type, m.priority, m.issue_reported,
                 m.service_provider, m.cost, m.status,
                 m.scheduled_date, m.completed_date,
                 u.full_name as requested_by_name
          FROM asset_maintenance m
          JOIN assets a ON m.asset_id = a.id
          LEFT JOIN users u ON m.requested_by = u.id
          WHERE 1=1
        `;
        break;

      case 'warranty_report':
        query = `
          SELECT a.asset_number, a.barcode, a.name, a.warranty_provider,
                 a.warranty_start_date, a.warranty_expiry_date,
                 a.warranty_terms,
                 ROUND((julianday(a.warranty_expiry_date) - julianday('now'))) as days_remaining,
                 CASE
                   WHEN a.warranty_expiry_date < date('now') THEN 'EXPIRED'
                   WHEN a.warranty_expiry_date <= date('now', '+30 days') THEN 'EXPIRING_SOON'
                   ELSE 'ACTIVE'
                 END as warranty_status,
                 sp.name as supplier_name, sp.phone as supplier_phone
          FROM assets a
          LEFT JOIN suppliers sp ON a.supplier_id = sp.id
          WHERE a.warranty_expiry_date IS NOT NULL
        `;
        break;

      case 'acquisition_report':
        query = `
          SELECT a.asset_number, a.name, a.acquisition_date, a.acquisition_method,
                 a.purchase_price, a.acquisition_cost, a.currency,
                 a.purchase_order_no, a.invoice_no, a.funding_source,
                 sp.name as supplier_name, c.name as category_name
          FROM assets a
          LEFT JOIN suppliers sp ON a.supplier_id = sp.id
          LEFT JOIN asset_categories c ON a.category_id = c.id
          WHERE 1=1
        `;
        break;

      case 'disposal_report':
        query = `
          SELECT d.disposal_number, a.asset_number, a.name as asset_name,
                 d.disposal_method, d.reason, d.disposal_date,
                 d.disposal_value, d.buyer_recipient, d.status,
                 d.committee_approval_ref,
                 (s.first_name || ' ' || s.last_name) as responsible_officer
          FROM asset_disposals d
          JOIN assets a ON d.asset_id = a.id
          LEFT JOIN staff s ON d.responsible_officer_id = s.id
          WHERE 1=1
        `;
        break;

      case 'depreciation_report':
        query = `
          SELECT a.asset_number, a.name, c.name as category_name,
                 a.acquisition_cost, a.depreciation_method, a.useful_life_years,
                 a.residual_value, a.accumulated_depreciation, a.current_book_value,
                 a.last_depreciation_date
          FROM assets a
          LEFT JOIN asset_categories c ON a.category_id = c.id
          WHERE a.acquisition_cost > 0
        `;
        break;

      case 'audit_trail_report':
        query = `
          SELECT al.id, al.created_at, al.user_name, al.action,
                 al.entity_type, al.entity_code, al.ip_address,
                 al.details
          FROM audit_logs al
          WHERE 1=1
          ORDER BY al.id DESC
        `;
        break;

      default:
        throw new Error(`Unknown report type: ${reportType}`);
    }

    // Apply generic filters if relevant
    if (filters.campus_id && query.includes('cp.id')) {
      query += ` AND cp.id = ?`;
      params.push(filters.campus_id);
    }
    if (filters.department_id && query.includes('d.id')) {
      query += ` AND d.id = ?`;
      params.push(filters.department_id);
    }
    if (filters.building_id && query.includes('b.id')) {
      query += ` AND b.id = ?`;
      params.push(filters.building_id);
    }
    if (filters.category_id && query.includes('c.id')) {
      query += ` AND c.id = ?`;
      params.push(filters.category_id);
    }

    const rows = db.query(query, params);
    return rows;
  },

  async generateExcelWorkbook(reportType, data) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Moshi Co-operative University AMS';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Report');

    if (!data || data.length === 0) {
      sheet.addRow(['No data found for this report.']);
      return workbook;
    }

    const headers = Object.keys(data[0]);
    sheet.columns = headers.map(key => ({
      header: key.replace(/_/g, ' ').toUpperCase(),
      key: key,
      width: Math.max(15, key.length + 5)
    }));

    // Header styling
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0A2540' } // MoCU Navy
    };

    data.forEach(row => {
      sheet.addRow(row);
    });

    return workbook;
  },

  generateCsv(data) {
    if (!data || data.length === 0) return '';
    const headers = Object.keys(data[0]);
    const lines = [headers.join(',')];

    for (const row of data) {
      const line = headers.map(h => {
        let val = row[h];
        if (val === null || val === undefined) return '""';
        val = String(val).replace(/"/g, '""');
        return `"${val}"`;
      }).join(',');
      lines.push(line);
    }

    return lines.join('\n');
  }
};

module.exports = reportService;
