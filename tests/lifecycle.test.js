const assert = require('assert');
const app = require('../server/app');
const http = require('http');

let server;
let baseUrl;
let authToken;

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const headers = options.headers || {};
    if (authToken && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    if (options.body && typeof options.body === 'object' && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const req = http.request(url, {
      method: options.method || 'GET',
      headers
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json;
        try { json = JSON.parse(data); } catch { json = data; }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });

    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- Running API Verification Tests ---');

  server = http.createServer(app);
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
  console.log('Test server running at:', baseUrl);

  // 1. Health check
  const health = await request('/api/v1/health');
  assert.strictEqual(health.status, 200);
  assert.strictEqual(health.body.status, 'healthy');
  console.log('✓ Health check passed');

  // 2. Login Super Admin
  const login = await request('/api/v1/auth/login', {
    method: 'POST',
    body: { username: 'admin', password: 'Admin@123' }
  });
  assert.strictEqual(login.status, 200);
  assert.ok(login.body.token);
  authToken = login.body.token;
  console.log('✓ Super Admin authentication passed');

  // 3. User profile
  const me = await request('/api/v1/auth/me');
  assert.strictEqual(me.status, 200);
  assert.strictEqual(me.body.user.role, 'super_admin');
  console.log('✓ User profile (/me) passed');

  // 4. List Campuses
  const campuses = await request('/api/v1/campuses');
  assert.strictEqual(campuses.status, 200);
  assert.ok(campuses.body.campuses.length >= 2);
  console.log('✓ Campuses list passed, count:', campuses.body.campuses.length);

  // 5. List Buildings
  const buildings = await request('/api/v1/buildings');
  assert.strictEqual(buildings.status, 200);
  assert.ok(buildings.body.buildings.length >= 5);
  console.log('✓ Buildings list passed, count:', buildings.body.buildings.length);

  // 6. Department Hierarchy (Department -> Buildings -> Offices -> Staff -> Assets)
  const deptHier = await request('/api/v1/departments/1/hierarchy');
  assert.strictEqual(deptHier.status, 200);
  assert.ok(deptHier.body.buildings.length > 0);
  console.log('✓ Department hierarchy drilldown passed');

  // 7. Assets list & Search
  const assets = await request('/api/v1/assets?search=Dell');
  assert.strictEqual(assets.status, 200);
  assert.ok(assets.body.data.length > 0);
  console.log('✓ Asset search passed, found:', assets.body.data.length);

  // 8. Asset Lookup by Barcode
  const firstAsset = assets.body.data[0];
  const lookup = await request(`/api/v1/assets/lookup/${firstAsset.barcode}`);
  assert.strictEqual(lookup.status, 200);
  assert.strictEqual(lookup.body.asset.id, firstAsset.id);
  console.log('✓ Asset lookup by barcode passed:', firstAsset.barcode);

  // 9. Asset Registration (Full workflow)
  const newAssetRes = await request('/api/v1/assets', {
    method: 'POST',
    body: {
      name: 'Test Cisco Core Switch 9500',
      category_id: 1,
      asset_type: 'Core Switch',
      serial_number: 'TEST-CS-9500-001',
      model: 'Catalyst 9500',
      manufacturer: 'Cisco',
      building_id: 2,
      room_id: 4,
      department_id: 1,
      custodian_id: 3,
      acquisition_cost: 25000000,
      condition: 'new',
      status: 'active'
    }
  });
  assert.strictEqual(newAssetRes.status, 201);
  const createdAsset = newAssetRes.body.asset;
  assert.ok(createdAsset.asset_number.startsWith('MoCU/ICT/'));
  assert.ok(createdAsset.barcode.startsWith('MOCU-ICT-'));
  console.log('✓ Asset registration passed, generated:', createdAsset.asset_number);

  // 10. Scan Verification
  const scanRes = await request('/api/v1/verifications/scan', {
    method: 'POST',
    body: {
      barcode: createdAsset.barcode,
      scanned_building_id: 2,
      scanned_room_id: 4,
      condition: 'good',
      remarks: 'Audited in test rack'
    }
  });
  assert.strictEqual(scanRes.status, 201);
  assert.strictEqual(scanRes.body.verification.is_location_mismatch, false);
  console.log('✓ Physical verification scan passed (in place)');

  // 11. Scan Verification Mismatch Detection
  const scanMismatch = await request('/api/v1/verifications/scan', {
    method: 'POST',
    body: {
      barcode: createdAsset.barcode,
      scanned_building_id: 1, // expected 2
      scanned_room_id: 1,     // expected 4
      condition: 'good',
      remarks: 'Found in Vice Chancellor office unexpectedly'
    }
  });
  assert.strictEqual(scanMismatch.status, 201);
  assert.strictEqual(scanMismatch.body.verification.is_location_mismatch, true);
  console.log('✓ Verification location mismatch detection passed!');

  // 12. Asset Transfer Workflow
  const transferReq = await request('/api/v1/transfers', {
    method: 'POST',
    body: {
      asset_id: createdAsset.id,
      to_building_id: 1,
      to_room_id: 2,
      to_department_id: 2,
      to_custodian_id: 4,
      reason: 'Relocating to Finance Department for departmental switch setup'
    }
  });
  assert.strictEqual(transferReq.status, 201);
  const transferId = transferReq.body.transferId;
  console.log('✓ Transfer request created:', transferReq.body.transfer_number);

  // Approve transfer
  const approveTransfer = await request(`/api/v1/transfers/${transferId}/approve`, {
    method: 'PUT',
    body: { comments: 'Approved by Director of ICT & Bursar' }
  });
  assert.strictEqual(approveTransfer.status, 200);

  // Verify asset's location was updated
  const updatedAsset = await request(`/api/v1/assets/${createdAsset.id}`);
  assert.strictEqual(updatedAsset.body.asset.building_id, 1);
  assert.strictEqual(updatedAsset.body.asset.department_id, 2);
  assert.strictEqual(updatedAsset.body.asset.custodian_id, 4);
  console.log('✓ Transfer approval & location update verified');

  // 13. Maintenance Workflow
  const mntReq = await request('/api/v1/maintenance', {
    method: 'POST',
    body: {
      asset_id: createdAsset.id,
      maintenance_type: 'preventive',
      priority: 'medium',
      issue_reported: 'Quarterly firmware patch and port diagnostics'
    }
  });
  assert.strictEqual(mntReq.status, 201);
  const mntId = mntReq.body.maintenanceId;

  // Complete maintenance
  const completeMnt = await request(`/api/v1/maintenance/${mntId}/complete`, {
    method: 'PUT',
    body: {
      cost: 50000,
      technician_notes: 'Firmware upgraded to v17.9.4. All diagnostics passed.',
      condition_after: 'good'
    }
  });
  assert.strictEqual(completeMnt.status, 200);
  console.log('✓ Maintenance workflow passed');

  // 14. Reports Check
  const report1 = await request('/api/v1/reports/asset_register');
  assert.strictEqual(report1.status, 200);
  assert.ok(report1.body.data.length > 0);
  console.log('✓ Asset Register report generated with records:', report1.body.data.length);

  // 15. Dashboard Stats
  const dashStats = await request('/api/v1/dashboard/stats');
  assert.strictEqual(dashStats.status, 200);
  assert.ok(dashStats.body.stats.total_assets > 0);
  console.log('✓ Dashboard stats passed. Total assets:', dashStats.body.stats.total_assets);

  // 16. Controlled Disposal Workflow
  const dispReq = await request('/api/v1/disposals', {
    method: 'POST',
    body: {
      asset_id: createdAsset.id,
      disposal_method: 'public_auction',
      reason: 'Surplus redundant equipment',
      committee_approval_ref: 'MoCU/DISP/TEST-01'
    }
  });
  assert.strictEqual(dispReq.status, 201);
  const dispId = dispReq.body.disposalId;

  const approveDisp = await request(`/api/v1/disposals/${dispId}/approve`, {
    method: 'PUT',
    body: { committee_approval_ref: 'MoCU/DISP/TEST-01-APPROVED' }
  });
  assert.strictEqual(approveDisp.status, 200);

  const completeDisp = await request(`/api/v1/disposals/${dispId}/complete`, {
    method: 'PUT',
    body: { disposal_value: 500000, buyer_recipient: 'Auction Winner #42' }
  });
  assert.strictEqual(completeDisp.status, 200);

  // Verify asset status is 'disposed' and historical timeline preserved
  const disposedAsset = await request(`/api/v1/assets/${createdAsset.id}`);
  assert.strictEqual(disposedAsset.body.asset.status, 'disposed');
  assert.ok(disposedAsset.body.asset.history.length >= 4);
  console.log('✓ Controlled disposal passed and historical records preserved! History events:', disposedAsset.body.asset.history.length);

  server.close();
  console.log('--- ALL API VERIFICATION TESTS PASSED SUCCESSFULLY! ---');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  if (server) server.close();
  process.exit(1);
});
