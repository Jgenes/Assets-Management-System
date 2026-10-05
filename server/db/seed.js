const bcrypt = require('bcryptjs');
const db = require('./database');
const fs = require('fs');
const path = require('path');

async function seed() {
  console.log('--- Seeding Moshi Co-operative University (MoCU) Asset Database ---');

  // Check if tables exist; if not, initialize schema
  const tableCheck = db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'");
  if (!tableCheck) {
    console.log('Initializing database schema from schema.sql...');
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    db.exec(schemaSql);
    console.log('Database schema created successfully.');
  }

  // Check if already seeded
  const existingUsers = db.query('SELECT COUNT(*) as count FROM users');
  if (existingUsers[0].count > 0) {
    console.log('Database already has users. Skipping full re-seed.');
    return;
  }

  // 1. System Settings
  const settings = [
    ['institution_name', 'Moshi Co-operative University', 'Official University Name'],
    ['institution_abbr', 'MoCU', 'University Abbreviation'],
    ['country', 'Tanzania', 'Country of Operation'],
    ['city', 'Moshi, Kilimanjaro', 'Main Campus City'],
    ['currency', 'TZS', 'Base Financial Currency'],
    ['asset_number_prefix', 'MoCU', 'Standard Prefix for Asset Numbering'],
    ['asset_number_format', '{PREFIX}/{CAT}/{YEAR}/{SEQ}', 'Asset Number Format Pattern'],
    ['barcode_symbology', 'CODE128', 'Primary Barcode Type'],
    ['depreciation_convention', 'Full Year / Straight-Line', 'Institutional Depreciation Rule'],
    ['verification_cycle_months', '12', 'Standard Physical Audit Interval']
  ];

  const insertSetting = db.getRawDb().prepare('INSERT OR REPLACE INTO system_settings (key, value, description) VALUES (?, ?, ?)');
  for (const [k, v, d] of settings) {
    insertSetting.run(k, v, d);
  }

  // 2. Roles
  const roles = [
    ['super_admin', 'Super Administrator', 'Full institutional access across all modules and settings', JSON.stringify(['*'])],
    ['asset_admin', 'Asset Administrator', 'Oversees university assets, locations, transfers, approvals and verifications', JSON.stringify(['assets:manage', 'locations:manage', 'transfers:approve', 'verification:manage', 'maintenance:approve', 'disposal:approve', 'reports:view', 'reports:export'])],
    ['asset_officer', 'Asset Officer', 'Registers assets, generates barcodes, performs audits and updates conditions', JSON.stringify(['assets:create', 'assets:edit', 'barcodes:print', 'transfers:create', 'maintenance:create', 'verification:record'])],
    ['department_admin', 'Department Administrator', 'Manages department assets, requests transfers and maintenance', JSON.stringify(['department_assets:view', 'transfers:request', 'maintenance:request'])],
    ['custodian', 'Staff Custodian', 'Views assigned custody assets and acknowledges verification', JSON.stringify(['custody_assets:view', 'custody:acknowledge'])],
    ['finance_officer', 'Finance Officer', 'Accesses asset values, budgets, depreciation and valuation reports', JSON.stringify(['assets:view', 'financials:view', 'depreciation:run', 'reports:financial', 'disposal:review'])],
    ['procurement_officer', 'Procurement Officer', 'Manages suppliers, purchase orders and initial acquisition data', JSON.stringify(['suppliers:manage', 'acquisitions:create', 'assets:create'])],
    ['store_officer', 'Store Officer', 'Oversees inventory entering, holding, and dispatch from central stores', JSON.stringify(['stores:manage', 'assets:store_move'])],
    ['internal_auditor', 'Internal Auditor', 'Read-only comprehensive access to records, audit trails and compliance reports', JSON.stringify(['assets:view', 'audit:view', 'reports:view', 'verification:audit'])],
    ['management', 'Executive Management', 'High-level dashboard KPIs, institutional reports and strategic approvals', JSON.stringify(['dashboard:view', 'reports:executive', 'approvals:high_level'])],
    ['mobile_verifier', 'Mobile Verifier', 'Field verification and barcode/QR scanning on mobile device', JSON.stringify(['scanner:use', 'verification:record', 'assets:lookup'])]
  ];

  const insertRole = db.getRawDb().prepare('INSERT INTO roles (code, name, description, permissions) VALUES (?, ?, ?, ?)');
  for (const r of roles) {
    insertRole.run(...r);
  }

  // 3. Campuses
  const campuses = [
    ['MOCU-MAIN', 'Moshi Main Campus', 'Sokoine Road, Moshi Municipal, Kilimanjaro', 'P.O. Box 474, Moshi, Tanzania'],
    ['KTC-SHY', 'Kizumbi Teaching Centre', 'Kizumbi, Shinyanga Municipality', 'P.O. Box 282, Shinyanga, Tanzania']
  ];
  const insertCampus = db.getRawDb().prepare('INSERT INTO campuses (code, name, location, address) VALUES (?, ?, ?, ?)');
  for (const c of campuses) {
    insertCampus.run(...c);
  }

  // 4. Faculties / Schools
  const faculties = [
    [1, 'FBIS', 'Faculty of Business and Information Sciences', 'faculty', 'Dr. Neema M. Kessy'],
    [1, 'SCL', 'School of Co-operative Studies and Law', 'school', 'Prof. Faustine K. Bee'],
    [1, 'DRPS', 'Directorate of Research and Postgraduate Studies', 'directorate', 'Prof. Dismas L. Mwaseba'],
    [1, 'ESTATES', 'Directorate of Estates and Works', 'directorate', 'Eng. Emmanuel K. Lyimo'],
    [1, 'ADMIN', 'Central University Administration', 'unit', 'Prof. Alfred S. Mwita']
  ];
  const insertFac = db.getRawDb().prepare('INSERT INTO faculties_schools (campus_id, code, name, type, dean_director) VALUES (?, ?, ?, ?, ?)');
  for (const f of faculties) {
    insertFac.run(...f);
  }

  // 5. Departments
  const departments = [
    [1, 'ICT', 'Department of Information and Communication Technology', 'Mr. Baraka J. Mushi', 'ict.head@mocu.ac.tz', '+255 27 2754401', 'ICT Infrastructure, Software Systems and Network Services'],
    [1, 'ACC_FIN', 'Department of Accounting and Finance', 'Dr. Rehema S. Mshana', 'accfin.head@mocu.ac.tz', '+255 27 2754402', 'Academic training and institutional financial management'],
    [2, 'COOP_MGMT', 'Department of Co-operative Development and Management', 'Dr. John J. Mrema', 'coop.head@mocu.ac.tz', '+255 27 2754403', 'Co-operative leadership, economics and governance'],
    [4, 'ESTATES_FAC', 'Estates and Facilities Management Unit', 'Eng. Emmanuel K. Lyimo', 'estates@mocu.ac.tz', '+255 27 2754404', 'Civil works, maintenance, physical security and utilities'],
    [5, 'PROC_SCM', 'Procurement and Supply Chain Management Directorate', 'Ms. Zaituni H. Mchome', 'procurement@mocu.ac.tz', '+255 27 2754405', 'Institutional procurement, storekeeping and asset disposals'],
    [5, 'LIBRARY_SERV', 'University Library and Information Services', 'Ms. Fatuma A. Nassor', 'library@mocu.ac.tz', '+255 27 2754406', 'Main library, e-resources and archival collections']
  ];
  const insertDept = db.getRawDb().prepare('INSERT INTO departments (faculty_id, code, name, head_of_department, contact_email, contact_phone, description) VALUES (?, ?, ?, ?, ?, ?, ?)');
  for (const d of departments) {
    insertDept.run(...d);
  }

  // 6. Buildings
  const buildings = [
    [1, 'MCB', 'Main Administration Building', 'Principal university administration offices and council chamber', 3],
    [1, 'ICT-C', 'ICT Complex & Innovation Hub', 'Data centre, computer labs, software engineering centre', 4],
    [1, 'CHALL', 'Co-operative Great Hall', 'Large auditorium, ceremonial hall and examination venues', 2],
    [1, 'LIB-B', 'Dr. J.K. Nyerere Library Building', 'Three-story academic research library and learning commons', 3],
    [1, 'SCI-LAB', 'Science Laboratories Building', 'Specialized scientific testing and agricultural research labs', 2],
    [1, 'HOSTEL-A', 'Kilimanjaro Hostel Block A', 'Student residential accommodation and warden offices', 4]
  ];
  const insertBld = db.getRawDb().prepare('INSERT INTO buildings (campus_id, code, name, description, floors_count) VALUES (?, ?, ?, ?, ?)');
  for (const b of buildings) {
    insertBld.run(...b);
  }

  // 7. Floors
  const floors = [
    // MCB (id=1)
    [1, 0, 'Ground Floor'], [1, 1, 'First Floor'], [1, 2, 'Second Floor'],
    // ICT-C (id=2)
    [2, 0, 'Ground Floor'], [2, 1, 'First Floor'], [2, 2, 'Second Floor'], [2, 3, 'Third Floor'],
    // CHALL (id=3)
    [3, 0, 'Ground Floor'], [3, 1, 'First Floor'],
    // LIB-B (id=4)
    [4, 0, 'Ground Floor'], [4, 1, 'First Floor'], [4, 2, 'Second Floor'],
    // SCI-LAB (id=5)
    [5, 0, 'Ground Floor'], [5, 1, 'First Floor'],
    // HOSTEL-A (id=6)
    [6, 0, 'Ground Floor'], [6, 1, 'First Floor'], [6, 2, 'Second Floor'], [6, 3, 'Third Floor']
  ];
  const insertFloor = db.getRawDb().prepare('INSERT INTO floors (building_id, floor_number, floor_name) VALUES (?, ?, ?)');
  for (const fl of floors) {
    insertFloor.run(...fl);
  }

  // 8. Staff / Custodians
  const staffMembers = [
    ['MoCU/EMP/0101', 'Alfred', 'Mwita', 'vc@mocu.ac.tz', '+255 754 111001', 5, 'Vice Chancellor', 'Prof.'],
    ['MoCU/EMP/0102', 'Neema', 'Kessy', 'neema.kessy@mocu.ac.tz', '+255 754 111002', 1, 'Dean, FBIS', 'Dr.'],
    ['MoCU/EMP/0103', 'Baraka', 'Mushi', 'baraka.mushi@mocu.ac.tz', '+255 754 111003', 1, 'Head of ICT & Systems Architect', 'Mr.'],
    ['MoCU/EMP/0104', 'Grace', 'Shirima', 'grace.shirima@mocu.ac.tz', '+255 754 111004', 2, 'Chief Financial Officer', 'Ms.'],
    ['MoCU/EMP/0105', 'Emmanuel', 'Lyimo', 'emmanuel.lyimo@mocu.ac.tz', '+255 754 111005', 4, 'Director of Estates & Works', 'Eng.'],
    ['MoCU/EMP/0106', 'Josephat', 'Tarimo', 'josephat.tarimo@mocu.ac.tz', '+255 754 111006', 1, 'Senior Lecturer & Lab Director', 'Dr.'],
    ['MoCU/EMP/0107', 'Fatuma', 'Nassor', 'fatuma.nassor@mocu.ac.tz', '+255 754 111007', 6, 'Chief University Librarian', 'Ms.'],
    ['MoCU/EMP/0108', 'Peter', 'Mvungi', 'peter.mvungi@mocu.ac.tz', '+255 754 111008', 5, 'Senior University Asset Officer', 'Mr.'],
    ['MoCU/EMP/0109', 'Denis', 'Kimaro', 'denis.kimaro@mocu.ac.tz', '+255 754 111009', 1, 'Senior Network Administrator', 'Mr.'],
    ['MoCU/EMP/0110', 'Zaituni', 'Mchome', 'zaituni.mchome@mocu.ac.tz', '+255 754 111010', 5, 'Director of Procurement', 'Ms.']
  ];
  const insertStaff = db.getRawDb().prepare('INSERT INTO staff (staff_id, first_name, last_name, email, phone, department_id, position, title) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  for (const s of staffMembers) {
    insertStaff.run(...s);
  }

  // 9. Offices / Rooms / Labs / Stores
  const rooms = [
    // building_id, floor_id, dept_id, staff_id, code, name, type, capacity, desc
    [1, 3, 5, 1, 'ADM-201', 'Vice Chancellor Executive Office', 'office', 12, 'Executive reception, meeting room and VC personal office'],
    [1, 2, 2, 4, 'ADM-102', 'Finance & Bursar Directorate', 'office', 20, 'Financial management, revenue collection and payroll'],
    [1, 1, 5, 8, 'ADM-G05', 'Asset Management & Central Registry', 'office', 8, 'Institutional asset records and registry'],
    [2, 4, 1, 9, 'ICT-01', 'Data Center & Primary Server Room', 'server_room', 4, 'High security tier-2 server room with raised flooring and UPS'],
    [2, 5, 1, 3, 'ICT-101', 'Software Development Lab', 'laboratory', 60, '60-seat modern computing lab for academic training'],
    [2, 6, 1, 9, 'ICT-201', 'Network Operations Centre (NOC)', 'office', 10, 'Campus network backbone monitoring and NOC support'],
    [3, 8, 5, 5, 'CH-101', 'Senate & Ceremonial Hall', 'meeting_room', 500, 'University senate meetings, graduations and conferences'],
    [4, 10, 6, 7, 'LIB-G01', 'Main Digital Learning Commons', 'library', 150, 'Open access e-library and high-density book collection'],
    [5, 13, 1, 6, 'LAB-101', 'Co-operative Research & Testing Lab', 'laboratory', 40, 'Advanced computational and statistical research lab'],
    [1, 1, 4, 5, 'EST-001', 'Estates Central Stores & Workshop', 'store', 6, 'Storage for electrical, civil fixtures and university spares']
  ];
  const insertRoom = db.getRawDb().prepare('INSERT INTO rooms (building_id, floor_id, department_id, responsible_staff_id, room_code, room_name, location_type, capacity, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  for (const rm of rooms) {
    insertRoom.run(...rm);
  }

  // 10. Users
  const passwordHash = await bcrypt.hash('Admin@123', 10);
  const assetAdminHash = await bcrypt.hash('Asset@123', 10);
  const officerHash = await bcrypt.hash('Officer@123', 10);
  const hodHash = await bcrypt.hash('Hod@123', 10);
  const financeHash = await bcrypt.hash('Finance@123', 10);
  const auditorHash = await bcrypt.hash('Auditor@123', 10);
  const verifierHash = await bcrypt.hash('Verifier@123', 10);
  const custodianHash = await bcrypt.hash('Custodian@123', 10);

  const users = [
    ['admin', 'admin@mocu.ac.tz', passwordHash, 'MoCU Super Administrator', 1, 1, 1],
    ['asset.admin', 'asset.admin@mocu.ac.tz', assetAdminHash, 'Mr. Peter K. Mvungi (Asset Admin)', 2, 5, 8],
    ['asset.officer', 'officer@mocu.ac.tz', officerHash, 'Ms. Amina J. Moshi (Asset Officer)', 3, 5, 8],
    ['ict.hod', 'ict.hod@mocu.ac.tz', hodHash, 'Mr. Baraka J. Mushi (HOD ICT)', 4, 1, 3],
    ['finance', 'finance@mocu.ac.tz', financeHash, 'Ms. Grace P. Shirima (CFO)', 6, 2, 4],
    ['auditor', 'auditor@mocu.ac.tz', auditorHash, 'CPA Charles M. Kimaro (Internal Auditor)', 9, 5, null],
    ['verifier', 'verifier@mocu.ac.tz', verifierHash, 'Mr. Frank L. Temu (Mobile Verifier)', 11, 5, 9],
    ['custodian', 'custodian@mocu.ac.tz', custodianHash, 'Dr. Josephat E. Tarimo (Custodian)', 5, 1, 6]
  ];
  const insertUser = db.getRawDb().prepare('INSERT INTO users (username, email, password_hash, full_name, role_id, department_id, staff_id) VALUES (?, ?, ?, ?, ?, ?, ?)');
  for (const u of users) {
    insertUser.run(...u);
  }

  // 11. Suppliers
  const suppliers = [
    ['SUP-001', 'Dell Technologies Tanzania Ltd', 'Jackson Mtui', 'j.mtui@dell-tz.com', '+255 22 2124400', 'Plot 45 Ali Hassan Mwinyi Rd, Dar es Salaam', '100-245-890', 1, 'Primary vendor for server infrastructure and enterprise laptops'],
    ['SUP-002', 'Cisco Certified Systems East Africa', 'Fatuma Kipanga', 'fkipanga@cisco-ea.co.tz', '+255 22 2601900', 'Victoria Area, New Bagamoyo Rd, Dar es Salaam', '104-556-789', 1, 'Core networking switches, edge routers and firewall appliances'],
    ['SUP-003', 'Kilimanjaro Office Furnishings Co.', 'Eliazer Lyimo', 'sales@kili-furnishings.co.tz', '+255 27 2751234', 'Commercial Street, Moshi Municipality', '108-990-123', 1, 'University executive desks, ergonomic chairs and storage units'],
    ['SUP-004', 'SciTech Instruments East Africa', 'Dr. David Ochieng', 'info@scitech-ea.com', '+254 20 4455660', 'Enterprise Road, Industrial Area, Nairobi', '999-001-445', 1, 'Scientific laboratory equipment, balances and spectrophotometers'],
    ['SUP-005', 'Toyota Tanzania Ltd (Kilimanjaro Branch)', 'Godfrey Mremi', 'arusha.sales@toyotatz.com', '+255 27 2508888', 'Arusha-Moshi Highway, Moshi', '100-001-333', 1, 'Official university motor vehicles and genuine fleet maintenance'],
    ['SUP-006', 'Perkins Power Systems Tanzania', 'Salim Bakari', 'power@perkins-tz.com', '+255 22 2864320', 'Nyerere Road, Dar es Salaam', '102-334-556', 1, 'Heavy duty standby diesel generators and industrial ATS switches']
  ];
  const insertSup = db.getRawDb().prepare('INSERT INTO suppliers (code, name, contact_person, email, phone, address, tin_number, vat_registered, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  for (const sp of suppliers) {
    insertSup.run(...sp);
  }

  // 12. Asset Categories & Subcategories
  const categories = [
    ['ICT', 'ICT & Computing Equipment', 'Servers, laptops, desktops, network hardware, printers and UPS units', 'straight_line', 4, 0.10, 1],
    ['FURN', 'Office & Classroom Furniture', 'Executive desks, lecture room chairs, conference tables, steel filing cabinets', 'straight_line', 10, 0.05, 1],
    ['LAB', 'Laboratory & Scientific Equipment', 'Precision measurement devices, microscopes, spectrophotometers, testing rigs', 'straight_line', 8, 0.10, 1],
    ['LIB', 'Library Assets & Archival Equipment', 'RFID gates, digital book scanners, high-density academic book shelving', 'straight_line', 7, 0.05, 1],
    ['TRANS', 'Transport & University Vehicles', 'Passenger utility pickups, student buses, motorcycles and tractors', 'reducing_balance', 5, 0.15, 1],
    ['FAC', 'Facilities & Plant Infrastructure', 'Standby generators, air conditioning systems, solar inverters, water pumps', 'straight_line', 12, 0.05, 1],
    ['TEACH', 'Teaching & Audio-Visual Systems', 'Smart interactive flat panels, laser projectors, public address audio systems', 'straight_line', 5, 0.10, 1]
  ];
  const insertCat = db.getRawDb().prepare('INSERT INTO asset_categories (code, name, description, depreciation_method, useful_life_years, residual_rate, is_capital) VALUES (?, ?, ?, ?, ?, ?, ?)');
  for (const ct of categories) {
    insertCat.run(...ct);
  }

  // Subcategories
  const subcategories = [
    // ICT (id=1)
    [1, 'ICT-SRV', 'Enterprise Rack Servers', 'Physical rackmount and blade servers'],
    [1, 'ICT-LPT', 'Laptops & Mobile Workstations', 'Staff portable computing devices'],
    [1, 'ICT-DSK', 'Desktop Computers', 'Laboratory and administration desktop workstations'],
    [1, 'ICT-NET', 'Network Switches & Routers', 'Managed L2/L3 switches, firewalls and routers'],
    [1, 'ICT-PRN', 'Printers & Multi-Function Units', 'Network laser printers and heavy photocopiers'],
    [1, 'ICT-UPS', 'Uninterruptible Power Supplies', 'High capacity rackmount UPS and battery banks'],
    // FURN (id=2)
    [2, 'FRN-DSK', 'Executive & Office Desks', 'Mahogany executive desks and staff workstations'],
    [2, 'FRN-CHR', 'Ergonomic & Conference Chairs', 'Mesh ergonomic chairs and padded meeting chairs'],
    [2, 'FRN-CAB', 'Steel Cabinets & Shelving', 'Fireproof security cabinets and document storage'],
    // LAB (id=3)
    [3, 'LAB-SPC', 'Spectrophotometers & Optical', 'UV-Vis spectrophotometers and optical instruments'],
    [3, 'LAB-BAL', 'Analytical Precision Balances', 'Micro-gram analytical digital weighing balances'],
    // LIB (id=4)
    [4, 'LIB-RFD', 'Library RFID Systems', 'Security gates, tags and self-checkout kiosks'],
    // TRANS (id=5)
    [5, 'TRN-4X4', 'Double-Cabin Utility Vehicles', 'Heavy duty 4x4 pickup vehicles for field work'],
    // FAC (id=6)
    [6, 'FAC-GEN', 'Standby Diesel Generators', 'Backup power generation sets for campus blocks'],
    [6, 'FAC-AIR', 'Air Conditioning Units', 'Inverter split AC units for server rooms and labs'],
    // TEACH (id=7)
    [7, 'TCH-IFP', 'Interactive Flat Panel Displays', '75-inch and 86-inch 4K touch displays for classrooms']
  ];
  const insertSubcat = db.getRawDb().prepare('INSERT INTO asset_subcategories (category_id, code, name, description) VALUES (?, ?, ?, ?)');
  for (const sc of subcategories) {
    insertSubcat.run(...sc);
  }

  // 13. Assets Master (Realistic university inventory)
  const assets = [
    {
      asset_number: 'MoCU/ICT/2026/000001',
      barcode: 'MOCU-ICT-2026-000001',
      qr_code: 'https://mocu.ac.tz/ams/asset/MOCU-ICT-2026-000001',
      name: 'Dell PowerEdge R750 Enterprise Server',
      description: 'Primary virtualization node hosting Academic Management Information System (AMIS) and Student Portal',
      category_id: 1, subcategory_id: 1, asset_type: 'Rack Server 2U',
      serial_number: 'SN-DELL-R750-89102', model: 'PowerEdge R750', manufacturer: 'Dell Inc.', brand: 'Dell', part_number: 'PE-R750-X64',
      campus_id: 1, building_id: 2, floor_id: 4, room_id: 4, department_id: 1, custodian_id: 3,
      date_assigned: '2026-01-15', acquisition_method: 'purchase', acquisition_date: '2026-01-10',
      purchase_price: 38500000, acquisition_cost: 38500000, currency: 'TZS', purchase_order_no: 'MoCU-PO-2025-118', invoice_no: 'INV-DELL-9921',
      funding_source: 'World Bank Higher Education Economic Transformation (HEET) Project', project_program: 'HEET Component 2.1', budget_code: 'BG-ICT-2025-01',
      supplier_id: 1, useful_life_years: 5, residual_value: 3850000, depreciation_method: 'straight_line',
      current_book_value: 33308333, accumulated_depreciation: 5191667, last_depreciation_date: '2026-09-30',
      warranty_provider: 'Dell Technologies ProSupport Plus (4-Hour Onsite)', warranty_start_date: '2026-01-15', warranty_expiry_date: '2029-01-14',
      warranty_terms: '24/7 mission critical support with replacement parts on-site within 4 hours',
      condition: 'good', status: 'active', remarks: 'Dual Xeon Silver 4314, 256GB RAM, 8x 3.84TB SAS SSD RAID 10'
    },
    {
      asset_number: 'MoCU/ICT/2026/000002',
      barcode: 'MOCU-ICT-2026-000002',
      qr_code: 'https://mocu.ac.tz/ams/asset/MOCU-ICT-2026-000002',
      name: 'Cisco Catalyst 9300-48P Core PoE Switch',
      description: 'Campus network distribution layer core switch with 10Gbps SFP+ uplink fibre',
      category_id: 1, subcategory_id: 4, asset_type: 'Network Switch 48-Port',
      serial_number: 'FOC2441920L', model: 'Catalyst 9300-48P', manufacturer: 'Cisco Systems', brand: 'Cisco', part_number: 'C9300-48P-E',
      campus_id: 1, building_id: 2, floor_id: 4, room_id: 4, department_id: 1, custodian_id: 9,
      date_assigned: '2026-01-20', acquisition_method: 'purchase', acquisition_date: '2026-01-12',
      purchase_price: 18200000, acquisition_cost: 18200000, currency: 'TZS', purchase_order_no: 'MoCU-PO-2025-119', invoice_no: 'INV-CS-5582',
      funding_source: 'MoCU Internal Revenue (Cost Centre ICT)', project_program: 'Network Modernization', budget_code: 'BG-ICT-2025-04',
      supplier_id: 2, useful_life_years: 5, residual_value: 1820000, depreciation_method: 'straight_line',
      current_book_value: 15743333, accumulated_depreciation: 2456667, last_depreciation_date: '2026-09-30',
      warranty_provider: 'Cisco SMARTnet Service', warranty_start_date: '2026-01-20', warranty_expiry_date: '2028-01-19',
      warranty_terms: 'Advanced hardware replacement next business day',
      condition: 'good', status: 'active', remarks: 'Equipped with 1100W AC redundant power supply'
    },
    {
      asset_number: 'MoCU/ICT/2026/000003',
      barcode: 'MOCU-ICT-2026-000003',
      qr_code: 'https://mocu.ac.tz/ams/asset/MOCU-ICT-2026-000003',
      name: 'HP EliteBook 840 G10 Executive Laptop',
      description: 'Vice Chancellor executive travel and administrative laptop computer',
      category_id: 1, subcategory_id: 2, asset_type: 'Laptop Computer',
      serial_number: '5CG3490X1K', model: 'EliteBook 840 G10', manufacturer: 'HP Inc.', brand: 'HP', part_number: '840-G10-i7',
      campus_id: 1, building_id: 1, floor_id: 3, room_id: 1, department_id: 5, custodian_id: 1,
      date_assigned: '2026-02-01', acquisition_method: 'purchase', acquisition_date: '2026-01-25',
      purchase_price: 4950000, acquisition_cost: 4950000, currency: 'TZS', purchase_order_no: 'MoCU-PO-2026-002', invoice_no: 'INV-HP-1120',
      funding_source: 'University General Fund', project_program: 'Executive Modernization', budget_code: 'BG-ADM-2026-01',
      supplier_id: 1, useful_life_years: 4, residual_value: 495000, depreciation_method: 'straight_line',
      current_book_value: 4118750, accumulated_depreciation: 831250, last_depreciation_date: '2026-09-30',
      warranty_provider: 'HP Care Pack Onsite Service', warranty_start_date: '2026-02-01', warranty_expiry_date: '2029-01-31',
      warranty_terms: '3-year next business day onsite repair',
      condition: 'good', status: 'assigned', remarks: 'Intel Core i7-1360P, 32GB RAM, 1TB NVMe, Windows 11 Enterprise'
    },
    {
      asset_number: 'MoCU/ICT/2026/000004',
      barcode: 'MOCU-ICT-2026-000004',
      qr_code: 'https://mocu.ac.tz/ams/asset/MOCU-ICT-2026-000004',
      name: 'APC Smart-UPS RT 10kVA On-Line Power Unit',
      description: 'Dual-conversion online UPS protecting Main Data Center server racks',
      category_id: 1, subcategory_id: 6, asset_type: 'Enterprise UPS',
      serial_number: 'QS1924150821', model: 'SURT10000XLI', manufacturer: 'Schneider Electric', brand: 'APC', part_number: 'SURT10KXLI',
      campus_id: 1, building_id: 2, floor_id: 4, room_id: 4, department_id: 1, custodian_id: 9,
      date_assigned: '2026-01-18', acquisition_method: 'purchase', acquisition_date: '2026-01-10',
      purchase_price: 24500000, acquisition_cost: 24500000, currency: 'TZS', purchase_order_no: 'MoCU-PO-2025-118', invoice_no: 'INV-SE-9081',
      funding_source: 'HEET Project', project_program: 'HEET Component 2.1', budget_code: 'BG-ICT-2025-01',
      supplier_id: 2, useful_life_years: 6, residual_value: 2450000, depreciation_method: 'straight_line',
      current_book_value: 21743750, accumulated_depreciation: 2756250, last_depreciation_date: '2026-09-30',
      warranty_provider: 'Schneider Electric East Africa', warranty_start_date: '2026-01-18', warranty_expiry_date: '2028-01-17',
      warranty_terms: 'Full parts and battery warranty for 24 months',
      condition: 'good', status: 'active', remarks: 'Connected to external battery bank pack SURT192XLBP'
    },
    {
      asset_number: 'MoCU/ICT/2026/000005',
      barcode: 'MOCU-ICT-2026-000005',
      qr_code: 'https://mocu.ac.tz/ams/asset/MOCU-ICT-2026-000005',
      name: 'Kyocera TASKalfa 4054i Multi-Function System',
      description: 'High-speed institutional monochrome multifunction laser printer, scanner and copier',
      category_id: 1, subcategory_id: 5, asset_type: 'Heavy Photocopier/Printer',
      serial_number: 'QRA3819052', model: 'TASKalfa 4054i', manufacturer: 'Kyocera Document Solutions', brand: 'Kyocera', part_number: 'TA-4054i',
      campus_id: 1, building_id: 1, floor_id: 2, room_id: 2, department_id: 2, custodian_id: 4,
      date_assigned: '2026-02-10', acquisition_method: 'purchase', acquisition_date: '2026-01-28',
      purchase_price: 14800000, acquisition_cost: 14800000, currency: 'TZS', purchase_order_no: 'MoCU-PO-2026-005', invoice_no: 'INV-KYO-4412',
      funding_source: 'MoCU Operational Budget', project_program: 'Finance Automation', budget_code: 'BG-FIN-2026-02',
      supplier_id: 1, useful_life_years: 5, residual_value: 1480000, depreciation_method: 'straight_line',
      current_book_value: 13024000, accumulated_depreciation: 1776000, last_depreciation_date: '2026-09-30',
      warranty_provider: 'Kyocera Service Partner Tanzania', warranty_start_date: '2026-02-10', warranty_expiry_date: '2027-02-09',
      warranty_terms: '1 year or 300,000 prints maintenance agreement',
      condition: 'good', status: 'active', remarks: 'Duplex single pass document processor and network card'
    },
    {
      asset_number: 'MoCU/FURN/2026/000001',
      barcode: 'MOCU-FURN-2026-000001',
      qr_code: 'https://mocu.ac.tz/ams/asset/MOCU-FURN-2026-000001',
      name: 'Handcrafted Mahogany Executive Desk with Credenza',
      description: 'Solid East African Mahogany double-pedestal executive desk with leather blotter',
      category_id: 2, subcategory_id: 7, asset_type: 'Executive Desk Set',
      serial_number: 'KOF-DESK-2026-01', model: 'Presidential Suite 240', manufacturer: 'Kilimanjaro Office Furnishings', brand: 'KOF Exclusive', part_number: 'DESK-MH-240',
      campus_id: 1, building_id: 1, floor_id: 3, room_id: 1, department_id: 5, custodian_id: 1,
      date_assigned: '2026-01-20', acquisition_method: 'purchase', acquisition_date: '2026-01-15',
      purchase_price: 6800000, acquisition_cost: 6800000, currency: 'TZS', purchase_order_no: 'MoCU-PO-2026-001', invoice_no: 'INV-KOF-881',
      funding_source: 'Capital Expenditure Budget', project_program: 'Executive Suites', budget_code: 'BG-CAP-2026-01',
      supplier_id: 3, useful_life_years: 10, residual_value: 340000, depreciation_method: 'straight_line',
      current_book_value: 6315000, accumulated_depreciation: 485000, last_depreciation_date: '2026-09-30',
      warranty_provider: 'Kilimanjaro Office Furnishings', warranty_start_date: '2026-01-20', warranty_expiry_date: '2031-01-19',
      warranty_terms: '5-year structural warranty on timber joinery and hardware',
      condition: 'new', status: 'assigned', remarks: 'Dimensions: 2400mm x 1100mm with lockable matching credenza'
    },
    {
      asset_number: 'MoCU/LAB/2026/000001',
      barcode: 'MOCU-LAB-2026-000001',
      qr_code: 'https://mocu.ac.tz/ams/asset/MOCU-LAB-2026-000001',
      name: 'Shimadzu UV-1900i UV-Vis Spectrophotometer',
      description: 'High-resolution double-beam scientific spectrophotometer for cooperative agricultural quality testing',
      category_id: 3, subcategory_id: 10, asset_type: 'Spectrophotometer',
      serial_number: 'A1245580912', model: 'UV-1900i', manufacturer: 'Shimadzu Corporation', brand: 'Shimadzu', part_number: '206-32000-58',
      campus_id: 1, building_id: 5, floor_id: 13, room_id: 9, department_id: 1, custodian_id: 6,
      date_assigned: '2026-02-15', acquisition_method: 'grant', acquisition_date: '2026-02-05',
      purchase_price: 45000000, acquisition_cost: 45000000, currency: 'TZS', purchase_order_no: 'GRANT-COOP-RES-04', invoice_no: 'INV-SCI-9102',
      funding_source: 'Tanzania Commission for Science and Technology (COSTECH) Research Grant', project_program: 'Cooperative Coffee Quality Research', budget_code: 'GR-COSTECH-2025',
      supplier_id: 4, useful_life_years: 8, residual_value: 4500000, depreciation_method: 'straight_line',
      current_book_value: 41609375, accumulated_depreciation: 3390625, last_depreciation_date: '2026-09-30',
      warranty_provider: 'SciTech Instruments East Africa', warranty_start_date: '2026-02-15', warranty_expiry_date: '2028-02-14',
      warranty_terms: '24-month manufacturer warranty with bi-annual calibration certification',
      condition: 'good', status: 'active', remarks: 'Wavelength range 190 to 1100 nm, photometric accuracy +/-0.002 Abs'
    },
    {
      asset_number: 'MoCU/TRANS/2026/000001',
      barcode: 'MOCU-TRANS-2026-000001',
      qr_code: 'https://mocu.ac.tz/ams/asset/MOCU-TRANS-2026-000001',
      name: 'Toyota Hilux Double Cabin 4x4 (Registration SM 4812)',
      description: 'Institutional field research and academic outreach utility vehicle',
      category_id: 5, subcategory_id: 13, asset_type: 'Motor Vehicle 4WD',
      serial_number: 'MR0BA3CD401829104', model: 'Hilux 2.8L GD-6 4x4 MT', manufacturer: 'Toyota Motor Corporation', brand: 'Toyota', part_number: 'GUN126R-DTTHX',
      campus_id: 1, building_id: 1, floor_id: 1, room_id: 3, department_id: 4, custodian_id: 5,
      date_assigned: '2026-01-25', acquisition_method: 'purchase', acquisition_date: '2026-01-18',
      purchase_price: 142000000, acquisition_cost: 142000000, currency: 'TZS', purchase_order_no: 'MoCU-PO-2025-104', invoice_no: 'INV-TOY-22019',
      funding_source: 'Government Development Subvention (MoCU Development Budget)', project_program: 'Transport Logistics Fleet', budget_code: 'BG-FLEET-2025',
      supplier_id: 5, useful_life_years: 5, residual_value: 21300000, depreciation_method: 'reducing_balance',
      current_book_value: 126912500, accumulated_depreciation: 15087500, last_depreciation_date: '2026-09-30',
      warranty_provider: 'Toyota Tanzania Limited', warranty_start_date: '2026-01-25', warranty_expiry_date: '2029-01-24',
      warranty_terms: '3 years or 100,000 kilometres comprehensive bumper-to-bumper warranty',
      condition: 'good', status: 'active', remarks: 'Tanzania Government Special Registration SM 4812. Comprehensive insurance policy.'
    },
    {
      asset_number: 'MoCU/FAC/2026/000001',
      barcode: 'MOCU-FAC-2026-000001',
      qr_code: 'https://mocu.ac.tz/ams/asset/MOCU-FAC-2026-000001',
      name: 'Perkins 150kVA Sound-Attenuated Standby Generator',
      description: 'Automatic mains failure standby power generator set serving Main Admin & ICT Complex',
      category_id: 6, subcategory_id: 14, asset_type: 'Diesel Generator 150kVA',
      serial_number: 'PK-1106A-70TAG2-8812', model: 'P150-5 Perkins Silent', manufacturer: 'Perkins Engines Company Ltd', brand: 'Perkins', part_number: 'FGW-P150E5',
      campus_id: 1, building_id: 2, floor_id: 4, room_id: 10, department_id: 4, custodian_id: 5,
      date_assigned: '2026-01-05', acquisition_method: 'purchase', acquisition_date: '2025-12-20',
      purchase_price: 68500000, acquisition_cost: 68500000, currency: 'TZS', purchase_order_no: 'MoCU-PO-2025-089', invoice_no: 'INV-PERK-3341',
      funding_source: 'MoCU Infrastructure Development Grant', project_program: 'Power Resilience', budget_code: 'BG-FAC-2025-09',
      supplier_id: 6, useful_life_years: 12, residual_value: 3425000, depreciation_method: 'straight_line',
      current_book_value: 64450000, accumulated_depreciation: 4050000, last_depreciation_date: '2026-09-30',
      warranty_provider: 'Perkins Power Systems Tanzania', warranty_start_date: '2026-01-05', warranty_expiry_date: '2028-01-04',
      warranty_terms: '2 years or 2000 operational hours full parts and labor',
      condition: 'good', status: 'active', remarks: 'Connected to Deep Sea DSE7320 auto-start control module and 400A motorized ATS'
    },
    {
      asset_number: 'MoCU/TEACH/2026/000001',
      barcode: 'MOCU-TEACH-2026-000001',
      qr_code: 'https://mocu.ac.tz/ams/asset/MOCU-TEACH-2026-000001',
      name: 'Sony 4K Laser High-Lumen Classroom Projector',
      description: 'Ultra high-definition 6000 lumens laser installation projector for Senate Chamber',
      category_id: 7, subcategory_id: 16, asset_type: 'Laser Projector',
      serial_number: 'SN-VPL-FHZ80-491', model: 'VPL-FHZ80', manufacturer: 'Sony Corporation', brand: 'Sony', part_number: 'VPL-FHZ80/B',
      campus_id: 1, building_id: 3, floor_id: 8, room_id: 7, department_id: 1, custodian_id: 3,
      date_assigned: '2026-02-18', acquisition_method: 'purchase', acquisition_date: '2026-02-10',
      purchase_price: 12500000, acquisition_cost: 12500000, currency: 'TZS', purchase_order_no: 'MoCU-PO-2026-014', invoice_no: 'INV-AV-6612',
      funding_source: 'MoCU Teaching Infrastructure Fund', project_program: 'Auditorium Modernization', budget_code: 'BG-AV-2026-03',
      supplier_id: 2, useful_life_years: 5, residual_value: 1250000, depreciation_method: 'straight_line',
      current_book_value: 11000000, accumulated_depreciation: 1500000, last_depreciation_date: '2026-09-30',
      warranty_provider: 'Sony Professional Solutions EA', warranty_start_date: '2026-02-18', warranty_expiry_date: '2029-02-17',
      warranty_terms: '3 years or 10,000 hours laser light source replacement guarantee',
      condition: 'good', status: 'active', remarks: 'Ceiling mounted with motorized 200-inch tensioned projection screen'
    },
    {
      asset_number: 'MoCU/ICT/2026/000006',
      barcode: 'MOCU-ICT-2026-000006',
      qr_code: 'https://mocu.ac.tz/ams/asset/MOCU-ICT-2026-000006',
      name: 'HP ProDesk 400 G9 Lab Desktop Computer #01',
      description: 'Student workstation in Software Development Lab',
      category_id: 1, subcategory_id: 3, asset_type: 'Desktop Workstation',
      serial_number: 'HP-PD400-01928', model: 'ProDesk 400 G9 MT', manufacturer: 'HP Inc.', brand: 'HP', part_number: 'PD400-G9-i5',
      campus_id: 1, building_id: 2, floor_id: 5, room_id: 5, department_id: 1, custodian_id: 6,
      date_assigned: '2026-02-05', acquisition_method: 'purchase', acquisition_date: '2026-01-20',
      purchase_price: 2400000, acquisition_cost: 2400000, currency: 'TZS', purchase_order_no: 'MoCU-PO-2026-004', invoice_no: 'INV-HP-9011',
      funding_source: 'HEET Project', project_program: 'Lab Upgrades', budget_code: 'BG-ICT-2026-02',
      supplier_id: 1, useful_life_years: 4, residual_value: 240000, depreciation_method: 'straight_line',
      current_book_value: 2040000, accumulated_depreciation: 360000, last_depreciation_date: '2026-09-30',
      warranty_provider: 'HP Service Tanzania', warranty_start_date: '2026-02-05', warranty_expiry_date: '2029-02-04',
      warranty_terms: '3-year standard parts and labor',
      condition: 'good', status: 'active', remarks: 'Intel Core i5-13500, 16GB RAM, 512GB NVMe, 24-inch FHD IPS Display'
    },
    {
      asset_number: 'MoCU/ICT/2026/000007',
      barcode: 'MOCU-ICT-2026-000007',
      qr_code: 'https://mocu.ac.tz/ams/asset/MOCU-ICT-2026-000007',
      name: 'HP ProDesk 400 G9 Lab Desktop Computer #02',
      description: 'Student workstation in Software Development Lab',
      category_id: 1, subcategory_id: 3, asset_type: 'Desktop Workstation',
      serial_number: 'HP-PD400-01929', model: 'ProDesk 400 G9 MT', manufacturer: 'HP Inc.', brand: 'HP', part_number: 'PD400-G9-i5',
      campus_id: 1, building_id: 2, floor_id: 5, room_id: 5, department_id: 1, custodian_id: 6,
      date_assigned: '2026-02-05', acquisition_method: 'purchase', acquisition_date: '2026-01-20',
      purchase_price: 2400000, acquisition_cost: 2400000, currency: 'TZS', purchase_order_no: 'MoCU-PO-2026-004', invoice_no: 'INV-HP-9011',
      funding_source: 'HEET Project', project_program: 'Lab Upgrades', budget_code: 'BG-ICT-2026-02',
      supplier_id: 1, useful_life_years: 4, residual_value: 240000, depreciation_method: 'straight_line',
      current_book_value: 2040000, accumulated_depreciation: 360000, last_depreciation_date: '2026-09-30',
      warranty_provider: 'HP Service Tanzania', warranty_start_date: '2026-02-05', warranty_expiry_date: '2029-02-04',
      warranty_terms: '3-year standard parts and labor',
      condition: 'fair', status: 'active', remarks: 'Screen flickering occasionally, technician scheduled'
    },
    {
      asset_number: 'MoCU/LIB/2026/000001',
      barcode: 'MOCU-LIB-2026-000001',
      qr_code: 'https://mocu.ac.tz/ams/asset/MOCU-LIB-2026-000001',
      name: 'Bibliotheca RFID Dual-Aisle Library Security Gate',
      description: 'RFID tracking gate at main library entrance for book protection and patron traffic count',
      category_id: 4, subcategory_id: 12, asset_type: 'RFID Security Gate',
      serial_number: 'BIB-GATE-881023', model: 'RFID Gate Premium', manufacturer: 'Bibliotheca Ltd', brand: 'Bibliotheca', part_number: 'BG-PREM-2A',
      campus_id: 1, building_id: 4, floor_id: 10, room_id: 8, department_id: 6, custodian_id: 7,
      date_assigned: '2026-01-30', acquisition_method: 'purchase', acquisition_date: '2026-01-14',
      purchase_price: 28500000, acquisition_cost: 28500000, currency: 'TZS', purchase_order_no: 'MoCU-PO-2025-125', invoice_no: 'INV-BIB-004',
      funding_source: 'Library Modernization Fund', project_program: 'Smart Library Project', budget_code: 'BG-LIB-2025-01',
      supplier_id: 2, useful_life_years: 7, residual_value: 1425000, depreciation_method: 'straight_line',
      current_book_value: 25983928, accumulated_depreciation: 2516072, last_depreciation_date: '2026-09-30',
      warranty_provider: 'Bibliotheca EA Technical Support', warranty_start_date: '2026-01-30', warranty_expiry_date: '2027-01-29',
      warranty_terms: '1 year full hardware and firmware remote calibration support',
      condition: 'good', status: 'active', remarks: 'Integrated with Koha Integrated Library System (ILS) via SIP2 protocol'
    },
    {
      asset_number: 'MoCU/FURN/2026/000002',
      barcode: 'MOCU-FURN-2026-000002',
      qr_code: 'https://mocu.ac.tz/ams/asset/MOCU-FURN-2026-000002',
      name: 'Heavy Duty 4-Drawer Steel Fireproof Filing Cabinet',
      description: 'UL Class 350 1-hour fire resistant records cabinet for examination and confidential files',
      category_id: 2, subcategory_id: 9, asset_type: 'Fireproof Cabinet',
      serial_number: 'FP-CAB-2026-08', model: 'FireGuard 4D-100', manufacturer: 'Chubbsafes', brand: 'Chubb', part_number: 'CS-FG-4D',
      campus_id: 1, building_id: 1, floor_id: 1, room_id: 3, department_id: 5, custodian_id: 8,
      date_assigned: '2026-02-12', acquisition_method: 'purchase', acquisition_date: '2026-02-01',
      purchase_price: 3600000, acquisition_cost: 3600000, currency: 'TZS', purchase_order_no: 'MoCU-PO-2026-007', invoice_no: 'INV-KOF-904',
      funding_source: 'General Administration', project_program: 'Records Management', budget_code: 'BG-ADM-2026-02',
      supplier_id: 3, useful_life_years: 10, residual_value: 180000, depreciation_method: 'straight_line',
      current_book_value: 3372000, accumulated_depreciation: 228000, last_depreciation_date: '2026-09-30',
      warranty_provider: 'Kilimanjaro Office Furnishings', warranty_start_date: '2026-02-12', warranty_expiry_date: '2031-02-11',
      warranty_terms: '5-year lock and mechanical mechanism warranty',
      condition: 'good', status: 'active', remarks: 'Dual key lock and combination dial'
    },
    {
      asset_number: 'MoCU/ICT/2026/000008',
      barcode: 'MOCU-ICT-2026-000008',
      qr_code: 'https://mocu.ac.tz/ams/asset/MOCU-ICT-2026-000008',
      name: 'Legacy Dell OptiPlex 3050 Desktop (Scheduled for Disposal)',
      description: 'Older administrative computer replaced under university refresh program',
      category_id: 1, subcategory_id: 3, asset_type: 'Desktop Computer',
      serial_number: 'DP-3050-67128', model: 'OptiPlex 3050 SFF', manufacturer: 'Dell Inc.', brand: 'Dell', part_number: 'OP-3050-i3',
      campus_id: 1, building_id: 1, floor_id: 1, room_id: 10, department_id: 4, custodian_id: 5,
      date_assigned: '2019-03-10', acquisition_method: 'purchase', acquisition_date: '2019-02-28',
      purchase_price: 1800000, acquisition_cost: 1800000, currency: 'TZS', purchase_order_no: 'MoCU-PO-2019-041', invoice_no: 'INV-DEL-2019',
      funding_source: 'University Operating Fund', project_program: 'Old Admin Refresh', budget_code: 'BG-2019-01',
      supplier_id: 1, useful_life_years: 4, residual_value: 100000, depreciation_method: 'straight_line',
      current_book_value: 100000, accumulated_depreciation: 1700000, last_depreciation_date: '2023-02-28',
      warranty_provider: 'Expired', warranty_start_date: '2019-03-10', warranty_expiry_date: '2022-03-09',
      warranty_terms: 'Expired warranty',
      condition: 'obsolete', status: 'pending_disposal', remarks: 'Exceeded useful life. Motherboard capacitor degradation.'
    }
  ];

  const insertAsset = db.getRawDb().prepare(`
    INSERT INTO assets (
      asset_number, barcode, qr_code, name, description,
      category_id, subcategory_id, asset_type, serial_number, model, manufacturer, brand, part_number,
      campus_id, building_id, floor_id, room_id, department_id, custodian_id, date_assigned,
      acquisition_method, acquisition_date, purchase_price, acquisition_cost, currency, purchase_order_no, invoice_no,
      funding_source, project_program, budget_code, supplier_id, useful_life_years, residual_value, depreciation_method,
      current_book_value, accumulated_depreciation, last_depreciation_date, warranty_provider, warranty_start_date, warranty_expiry_date,
      warranty_terms, condition, status, remarks, created_by
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, 1
    )
  `);

  for (const a of assets) {
    insertAsset.run(
      a.asset_number, a.barcode, a.qr_code, a.name, a.description,
      a.category_id, a.subcategory_id, a.asset_type, a.serial_number, a.model, a.manufacturer, a.brand, a.part_number,
      a.campus_id, a.building_id, a.floor_id, a.room_id, a.department_id, a.custodian_id, a.date_assigned,
      a.acquisition_method, a.acquisition_date, a.purchase_price, a.acquisition_cost, a.currency, a.purchase_order_no, a.invoice_no,
      a.funding_source, a.project_program, a.budget_code, a.supplier_id, a.useful_life_years, a.residual_value, a.depreciation_method,
      a.current_book_value, a.accumulated_depreciation, a.last_depreciation_date, a.warranty_provider, a.warranty_start_date, a.warranty_expiry_date,
      a.warranty_terms, a.condition, a.status, a.remarks
    );
  }

  // 14. Asset History Timeline entries
  const historyEntries = [
    [1, 'registration', 'Asset Registered', 'Asset registered into institutional asset database with barcode MOCU-ICT-2026-000001', null, 'active', 1, 'MoCU Super Administrator'],
    [1, 'assignment', 'Assigned to ICT Department', 'Asset assigned to Main Data Center (ICT-01), under custodian Mr. Baraka J. Mushi', null, 'Assigned: Baraka J. Mushi', 1, 'MoCU Super Administrator'],
    [1, 'verification', 'Physical Verification Completed', 'Audited during Q1 Verification. Verified in place, condition Good', 'unverified', 'verified (good)', 2, 'Mr. Peter K. Mvungi'],
    [3, 'registration', 'Asset Registered', 'Asset registered with barcode MOCU-ICT-2026-000003', null, 'active', 1, 'MoCU Super Administrator'],
    [3, 'assignment', 'Assigned to Vice Chancellor', 'Assigned to VC Prof. Alfred S. Mwita for institutional leadership use', null, 'Assigned: Prof. Alfred S. Mwita', 2, 'Mr. Peter K. Mvungi'],
    [8, 'registration', 'Vehicle Registration', 'Toyota Hilux registered with Barcode MOCU-TRANS-2026-000001 and Plate SM 4812', null, 'active', 1, 'MoCU Super Administrator'],
    [15, 'registration', 'Asset Registered', 'Dell OptiPlex 3050 registered', null, 'active', 1, 'MoCU Super Administrator'],
    [15, 'condition_update', 'Condition Marked Obsolete', 'Evaluated by ICT Technical Board: motherboard capacitors degraded, economically unviable to repair', 'good', 'obsolete', 2, 'Mr. Peter K. Mvungi'],
    [15, 'status_update', 'Marked Pending Disposal', 'Submitted to University Asset Disposal Board for public auction or scrap', 'active', 'pending_disposal', 2, 'Mr. Peter K. Mvungi']
  ];
  const insertHist = db.getRawDb().prepare('INSERT INTO asset_history (asset_id, event_type, title, description, from_value, to_value, performed_by, performed_by_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  for (const h of historyEntries) {
    insertHist.run(...h);
  }

  // 15. Verification Campaigns
  const campaigns = [
    ['VC-2026-ANNUAL', '2026 Annual Institutional Asset Verification Campaign', 'Comprehensive institutional physical audit covering all campuses, buildings, faculties and stores for FY 2025/2026', '2026-09-01', '2026-10-31', 1, null, null, 'in_progress', 1],
    ['VC-2026-ICT-AUDIT', 'Q3 ICT Infrastructure Verification Exercise', 'Targeted physical inventory audit of all servers, network switches, lab machines and UPS devices', '2026-07-01', '2026-07-31', 1, 1, 2, 'completed', 2]
  ];
  const insertCamp = db.getRawDb().prepare('INSERT INTO verification_campaigns (campaign_code, title, description, start_date, end_date, campus_id, department_id, building_id, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  for (const cp of campaigns) {
    insertCamp.run(...cp);
  }

  // 16. Asset Verifications
  const verifications = [
    [1, 1, 7, '2026-09-10 10:15:00', 1, 2, 4, 1, 3, 'good', 2, 4, 1, 0, 0, 0, 0, 'verified', 'Asset confirmed in Rack 02, power and uplinks active', null, -3.3348, 37.3402],
    [1, 2, 7, '2026-09-10 10:30:00', 1, 2, 4, 1, 9, 'good', 2, 4, 1, 0, 0, 0, 0, 'verified', 'Catalyst 9300 switch verified operational with clear label', null, -3.3348, 37.3402],
    [1, 3, 7, '2026-09-11 14:00:00', 1, 1, 1, 5, 1, 'good', 1, 1, 5, 0, 0, 0, 0, 'verified', 'Laptop verified in Vice Chancellor office suite', null, -3.3355, 37.3411],
    [1, 6, 7, '2026-09-12 09:20:00', 1, 1, 1, 5, 1, 'new', 1, 1, 5, 0, 0, 0, 0, 'verified', 'Executive Mahogany desk in pristine condition', null, -3.3355, 37.3411],
    [1, 12, 7, '2026-09-14 11:45:00', 1, 2, 5, 1, 6, 'fair', 2, 5, 1, 0, 0, 1, 0, 'mismatched', 'Screen flickering reported on monitor. Opened maintenance ticket', null, -3.3348, 37.3405]
  ];
  const insertVerif = db.getRawDb().prepare(`
    INSERT INTO asset_verifications (
      campaign_id, asset_id, verifier_id, verified_at,
      verified_campus_id, verified_building_id, verified_room_id, verified_department_id, verified_custodian_id,
      verified_condition, expected_building_id, expected_room_id, expected_department_id,
      is_location_mismatch, is_department_mismatch, is_condition_changed, is_unexpected,
      verification_status, remarks, photo_url, gps_lat, gps_lng
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const v of verifications) {
    insertVerif.run(...v);
  }

  // Update assets last_verified_at
  db.run("UPDATE assets SET last_verified_at = '2026-09-10 10:15:00', last_verified_by = 7 WHERE id = 1");
  db.run("UPDATE assets SET last_verified_at = '2026-09-10 10:30:00', last_verified_by = 7 WHERE id = 2");
  db.run("UPDATE assets SET last_verified_at = '2026-09-11 14:00:00', last_verified_by = 7 WHERE id = 3");
  db.run("UPDATE assets SET last_verified_at = '2026-09-12 09:20:00', last_verified_by = 7 WHERE id = 6");
  db.run("UPDATE assets SET last_verified_at = '2026-09-14 11:45:00', last_verified_by = 7 WHERE id = 12");

  // 17. Asset Transfers
  const transfers = [
    [
      'TRF-2026-0001', 5,
      1, 1, 1, 1, 3, 2, 5, 2, 8, 4,
      'Relocation of Kyocera Multifunction Printer from Registry to Finance Directorate for higher volume revenue receipt processing',
      2, 1, 'completed', '2026-02-10', '2026-02-09 16:00:00', '2026-02-10 09:00:00', 'Approved by Asset Administrator and Dean of Finance'
    ]
  ];
  const insertTrf = db.getRawDb().prepare(`
    INSERT INTO asset_transfers (
      transfer_number, asset_id,
      from_campus_id, to_campus_id, from_building_id, to_building_id, from_room_id, to_room_id,
      from_department_id, to_department_id, from_custodian_id, to_custodian_id,
      reason, requested_by, approved_by, status, transfer_date, approval_date, completion_date, comments
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const t of transfers) {
    insertTrf.run(...t);
  }

  // 18. Asset Maintenance
  const maintenance = [
    [
      'MNT-2026-0001', 9, 'routine_service', 'medium',
      'Scheduled 250-hour generator service (oil change, fuel filter replacement, battery test)',
      'Quarterly preventive maintenance per manufacturer schedule',
      'Perkins Power Systems Tanzania Certified Field Team', 1850000,
      '2026-06-15', '2026-06-15', '2026-06-15', 'completed', 5, 2,
      'Filters replaced with genuine Perkins parts. Load test passed successfully under 80% building load.', 'good'
    ],
    [
      'MNT-2026-0002', 12, 'corrective', 'high',
      'Monitor display backlight flickering during student practical sessions',
      'Investigation and repair or replacement of display video board',
      'MoCU ICT Hardware & Maintenance Unit', 150000,
      '2026-09-16', '2026-09-17', null, 'in_progress', 6, 2,
      'Technician checked cable; inverter board replacement ordered under warranty.', 'fair'
    ]
  ];
  const insertMnt = db.getRawDb().prepare(`
    INSERT INTO asset_maintenance (
      maintenance_number, asset_id, maintenance_type, priority,
      issue_reported, description, service_provider, cost,
      scheduled_date, start_date, completed_date, status, requested_by, approved_by,
      technician_notes, condition_after
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const m of maintenance) {
    insertMnt.run(...m);
  }

  // 19. Asset Disposals
  const disposals = [
    [
      'DSP-2026-0001', 15, 'public_auction', 'obsolete',
      'MoCU/DISP/2026/RES-01', 120000, 'Pending Auction Listing', 5, 2, 1,
      '2026-10-25', 'approved', 'Board approved for University Public Auction of obsolete electrical items.'
    ]
  ];
  const insertDisp = db.getRawDb().prepare(`
    INSERT INTO asset_disposals (
      disposal_number, asset_id, disposal_method, reason,
      committee_approval_ref, disposal_value, buyer_recipient, responsible_officer_id,
      requested_by, approved_by, disposal_date, status, remarks
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const dp of disposals) {
    insertDisp.run(...dp);
  }

  // 20. Notifications
  const notifications = [
    [1, null, '2026 Annual Asset Verification Active', 'The 2026 Annual Asset Verification Campaign is currently in progress across all campuses.', 'info', 'verification', 1],
    [2, null, 'Maintenance Pending Completion: Lab Desktop #02', 'Work order MNT-2026-0002 is currently in progress by ICT Maintenance Unit.', 'warning', 'maintenance', 2],
    [1, null, 'Asset Disposal Approved: Dell OptiPlex 3050', 'Disposal ticket DSP-2026-0001 has been approved for the next university auction batch.', 'alert', 'disposal', 1],
    [4, null, 'Kyocera Printer Transfer Acknowledged', 'Transfer TRF-2026-0001 was completed successfully to Finance Department.', 'success', 'transfer', 1]
  ];
  const insertNotif = db.getRawDb().prepare('INSERT INTO notifications (user_id, role_id, title, message, type, entity_type, entity_id) VALUES (?, ?, ?, ?, ?, ?, ?)');
  for (const nf of notifications) {
    insertNotif.run(...nf);
  }

  // 21. Audit Logs
  const auditLogs = [
    [1, 'MoCU Super Administrator', 'SYSTEM_INITIALIZED', 'system', 1, 'MoCU-SYS', null, JSON.stringify({ version: '1.0.0', institution: 'MoCU' }), '127.0.0.1', 'Mozilla/5.0', 'MoCU Enterprise Asset Management System initialized'],
    [1, 'MoCU Super Administrator', 'ASSET_CREATED', 'asset', 1, 'MoCU/ICT/2026/000001', null, JSON.stringify({ name: 'Dell PowerEdge R750 Enterprise Server', cost: 38500000 }), '127.0.0.1', 'Mozilla/5.0', 'Primary AMIS virtualization server created'],
    [2, 'Mr. Peter K. Mvungi (Asset Admin)', 'BARCODE_PRINTED', 'asset', 1, 'MOCU-ICT-2026-000001', null, JSON.stringify({ barcode: 'MOCU-ICT-2026-000001', template: 'Standard 50x30mm' }), '192.168.10.45', 'Chrome/Win10', 'Barcode label generated and printed for server rack affixing'],
    [7, 'Mr. Frank L. Temu (Mobile Verifier)', 'ASSET_VERIFIED', 'verification', 1, 'MoCU/ICT/2026/000001', JSON.stringify({ status: 'unverified' }), JSON.stringify({ status: 'verified', condition: 'good' }), '192.168.20.15', 'Android Mobile Scanner', 'Physical audit scan via mobile application in Data Center ICT-01']
  ];
  const insertAudit = db.getRawDb().prepare('INSERT INTO audit_logs (user_id, user_name, action, entity_type, entity_id, entity_code, old_values, new_values, ip_address, user_agent, details) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  for (const al of auditLogs) {
    insertAudit.run(...al);
  }

  console.log('--- MoCU Database Seed Complete! ---');
  console.log('Seeded: Campuses, Faculties, Departments, Buildings, Rooms, Staff, Roles, Users, Categories, Suppliers, Assets, Histories, Campaigns, Verifications, Transfers, Maintenance, Disposals, Notifications, and Audit Logs.');
}

if (require.main === module) {
  seed().catch(err => {
    console.error('Seed error:', err);
    process.exit(1);
  });
}

module.exports = seed;
