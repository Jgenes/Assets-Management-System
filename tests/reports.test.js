const assert = require('assert');
const reportService = require('../server/services/reportService');

const REPORT_KEYS = [
  'asset_register',
  'department_register',
  'building_register',
  'room_register',
  'custodian_register',
  'category_report',
  'condition_report',
  'missing_assets',
  'verification_report',
  'unverified_report',
  'transfer_report',
  'maintenance_report',
  'warranty_report',
  'acquisition_report',
  'disposal_report',
  'depreciation_report',
  'audit_trail_report'
];

async function runReportsTest() {
  console.log('--- Running 17 Institutional Reports Test ---');

  for (const rep of REPORT_KEYS) {
    const data = reportService.getReportData(rep, {});
    assert(Array.isArray(data), `Report ${rep} must return an array`);
    console.log(`✓ [Report ${rep}] rows returned: ${data.length}`);

    // Verify CSV generation
    const csv = reportService.generateCsv(data);
    assert(typeof csv === 'string', `Report ${rep} CSV must be a string`);

    // Verify Excel generation
    const workbook = await reportService.generateExcelWorkbook(rep, data);
    assert(workbook && workbook.xlsx, `Report ${rep} Excel workbook must be created`);
  }

  console.log('--- ALL 17 INSTITUTIONAL REPORTS VERIFIED SUCCESSFULLY ---');
}

runReportsTest().catch(err => {
  console.error('Reports test failed:', err);
  process.exit(1);
});
