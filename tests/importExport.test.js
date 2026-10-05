const assert = require('assert');
const importService = require('../server/services/importService');
const db = require('../server/db/database');

async function runImportExportTest() {
  console.log('--- Running Import Service Test ---');

  const uniqueSuffix = Date.now();
  const sampleRows = [
    {
      name: 'Lenovo ThinkPad P16 Workstation',
      category_code: 'ICT',
      serial_number: `SN-TEST-${uniqueSuffix}-A`,
      brand: 'Lenovo',
      model: 'P16',
      building_code: 'MCB',
      room_code: 'ADM-201',
      department_code: 'ICT',
      staff_id: 'MoCU/EMP/0101',
      acquisition_cost: 4500000
    },
    {
      name: 'Ergonomic Executive Office Chair',
      category_code: 'FURN',
      serial_number: `SN-FURN-${uniqueSuffix}-B`,
      brand: 'Herman Miller',
      building_code: 'MCB',
      room_code: 'ADM-102',
      department_code: 'ACC_FIN',
      staff_id: 'MoCU/EMP/0102',
      acquisition_cost: 890000
    },
    {
      name: 'Invalid Asset Missing Valid Category Code',
      category_code: 'NON_EXISTENT_CAT_XYZ',
      serial_number: `SN-INVALID-${uniqueSuffix}-C`
    }
  ];

  const preview = await importService.previewImport(sampleRows);
  console.log(`Preview results: Total=${preview.totalRows}, Valid=${preview.validCount}, Errors=${preview.errorCount}`);

  assert.strictEqual(preview.totalRows, 3, 'Should have 3 rows');
  assert.strictEqual(preview.validCount, 2, '2 rows should be valid');
  assert.strictEqual(preview.errorCount, 1, '1 row should fail validation');

  // Test committing valid rows
  const validRows = preview.rows.filter(r => r.isValid).map(r => r.parsedData);
  const commitResult = await importService.commitImport(validRows, 1, 'Admin');
  console.log('Committed imported assets result:', commitResult);
  assert.strictEqual(commitResult.importedCount, 2, 'Should have imported 2 assets');

  console.log('--- ALL IMPORT SERVICE TESTS PASSED ---');
}

runImportExportTest().catch(err => {
  console.error('Import test failed:', err);
  process.exit(1);
});
