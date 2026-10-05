const assert = require('assert');
const depreciationService = require('../server/services/depreciationService');
const db = require('../server/db/database');

async function runDepreciationTest() {
  console.log('--- Running Depreciation Service Test ---');

  const asset = db.get('SELECT * FROM assets WHERE acquisition_cost > 0 LIMIT 1');
  assert(asset, 'Asset should exist in database');
  console.log('Testing asset:', asset.asset_number, 'Cost:', asset.acquisition_cost);

  const schedule = depreciationService.calculateSchedule(asset);
  console.log('Schedule periods:', schedule.length);
  assert(Array.isArray(schedule) && schedule.length > 0, 'Schedule must have periods');

  const currentValue = depreciationService.calculateCurrentValue(asset);
  console.log('Current book value:', currentValue.current_book_value);
  assert(typeof currentValue.current_book_value === 'number', 'Book value must be numeric');

  // Test running institutional depreciation
  const result = depreciationService.runInstitutionalDepreciation('2026/2027', 1);
  console.log('Institutional run result:', result);
  assert(typeof result.processed === 'number', 'Processed count must be a number');

  console.log('--- ALL DEPRECIATION TESTS PASSED ---');
}

runDepreciationTest().catch(err => {
  console.error('Depreciation test failed:', err);
  process.exit(1);
});
