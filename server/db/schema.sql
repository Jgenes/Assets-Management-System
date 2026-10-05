-- MOSHI CO-OPERATIVE UNIVERSITY (MoCU) ENTERPRISE ASSET MANAGEMENT SYSTEM
-- Relational Database Schema

-- 1. System Settings
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Campuses
CREATE TABLE IF NOT EXISTS campuses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  location TEXT,
  address TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Faculties / Schools / Directorates
CREATE TABLE IF NOT EXISTS faculties_schools (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campus_id INTEGER REFERENCES campuses(id) ON DELETE SET NULL,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'faculty', -- faculty, school, directorate, institute, centre
  dean_director TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. Departments / Units
CREATE TABLE IF NOT EXISTS departments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  faculty_id INTEGER REFERENCES faculties_schools(id) ON DELETE SET NULL,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  head_of_department TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. Buildings
CREATE TABLE IF NOT EXISTS buildings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campus_id INTEGER REFERENCES campuses(id) ON DELETE SET NULL,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  floors_count INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active', -- active, inactive
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 6. Floors
CREATE TABLE IF NOT EXISTS floors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  building_id INTEGER NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  floor_number INTEGER NOT NULL,
  floor_name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(building_id, floor_number)
);

-- 7. Staff / Custodians
CREATE TABLE IF NOT EXISTS staff (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  staff_id TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  position TEXT,
  title TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 8. Offices / Rooms / Labs / Stores
CREATE TABLE IF NOT EXISTS rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  building_id INTEGER NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  floor_id INTEGER REFERENCES floors(id) ON DELETE SET NULL,
  department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  responsible_staff_id INTEGER REFERENCES staff(id) ON DELETE SET NULL,
  room_code TEXT NOT NULL,
  room_name TEXT NOT NULL,
  location_type TEXT NOT NULL DEFAULT 'office', -- office, laboratory, lecture_room, library, store, workshop, server_room, meeting_room, hostel, staff_room, other
  capacity INTEGER DEFAULT 1,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(building_id, room_code)
);

-- 9. Roles & Permissions
CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  permissions TEXT NOT NULL, -- JSON array of strings
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 10. Users
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role_id INTEGER NOT NULL REFERENCES roles(id),
  department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  staff_id INTEGER REFERENCES staff(id) ON DELETE SET NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  last_login DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 11. Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  tin_number TEXT,
  vat_registered INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 12. Asset Categories
CREATE TABLE IF NOT EXISTS asset_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  depreciation_method TEXT NOT NULL DEFAULT 'straight_line', -- straight_line, declining_balance, none
  useful_life_years INTEGER NOT NULL DEFAULT 5,
  residual_rate REAL NOT NULL DEFAULT 0.10,
  is_capital INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 13. Asset Subcategories
CREATE TABLE IF NOT EXISTS asset_subcategories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL REFERENCES asset_categories(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(category_id, code)
);

-- 14. Asset Master
CREATE TABLE IF NOT EXISTS assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_number TEXT NOT NULL UNIQUE,
  barcode TEXT NOT NULL UNIQUE,
  qr_code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category_id INTEGER NOT NULL REFERENCES asset_categories(id),
  subcategory_id INTEGER REFERENCES asset_subcategories(id),
  asset_type TEXT,
  serial_number TEXT,
  model TEXT,
  manufacturer TEXT,
  brand TEXT,
  part_number TEXT,
  is_capital INTEGER NOT NULL DEFAULT 1,
  is_tangible INTEGER NOT NULL DEFAULT 1,

  -- Location & Custody
  campus_id INTEGER REFERENCES campuses(id),
  building_id INTEGER REFERENCES buildings(id),
  floor_id INTEGER REFERENCES floors(id),
  room_id INTEGER REFERENCES rooms(id),
  department_id INTEGER REFERENCES departments(id),
  custodian_id INTEGER REFERENCES staff(id),
  date_assigned DATE,

  -- Financial
  acquisition_method TEXT NOT NULL DEFAULT 'purchase', -- purchase, donation, transfer, grant, project, lease, other
  acquisition_date DATE,
  purchase_price REAL NOT NULL DEFAULT 0,
  acquisition_cost REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'TZS',
  purchase_order_no TEXT,
  invoice_no TEXT,
  funding_source TEXT,
  project_program TEXT,
  budget_code TEXT,
  supplier_id INTEGER REFERENCES suppliers(id),
  useful_life_years INTEGER DEFAULT 5,
  residual_value REAL NOT NULL DEFAULT 0,
  depreciation_method TEXT NOT NULL DEFAULT 'straight_line',
  current_book_value REAL NOT NULL DEFAULT 0,
  accumulated_depreciation REAL NOT NULL DEFAULT 0,
  last_depreciation_date DATE,

  -- Warranty & Insurance
  warranty_provider TEXT,
  warranty_start_date DATE,
  warranty_expiry_date DATE,
  warranty_terms TEXT,
  insurance_policy_no TEXT,
  insurance_company TEXT,
  insurance_expiry_date DATE,

  -- Condition & Status
  condition TEXT NOT NULL DEFAULT 'good', -- new, good, fair, poor, damaged, obsolete, under_repair, missing, lost, stolen, disposed
  status TEXT NOT NULL DEFAULT 'active', -- active, in_store, assigned, under_maintenance, missing, lost, stolen, damaged, pending_disposal, disposed, transferred, retired
  last_verified_at DATETIME,
  last_verified_by INTEGER REFERENCES users(id),
  next_verification_date DATE,
  image_url TEXT,
  remarks TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 15. Asset History Timeline
CREATE TABLE IF NOT EXISTS asset_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- registration, assignment, transfer, verification, maintenance_request, maintenance_completed, condition_update, status_update, depreciation, disposal_request, disposal_approved, disposed, audit
  title TEXT NOT NULL,
  description TEXT,
  from_value TEXT,
  to_value TEXT,
  performed_by INTEGER REFERENCES users(id),
  performed_by_name TEXT,
  event_date DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 16. Asset Transfers
CREATE TABLE IF NOT EXISTS asset_transfers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transfer_number TEXT NOT NULL UNIQUE,
  asset_id INTEGER NOT NULL REFERENCES assets(id),
  from_campus_id INTEGER REFERENCES campuses(id),
  to_campus_id INTEGER REFERENCES campuses(id),
  from_building_id INTEGER REFERENCES buildings(id),
  to_building_id INTEGER REFERENCES buildings(id),
  from_room_id INTEGER REFERENCES rooms(id),
  to_room_id INTEGER REFERENCES rooms(id),
  from_department_id INTEGER REFERENCES departments(id),
  to_department_id INTEGER REFERENCES departments(id),
  from_custodian_id INTEGER REFERENCES staff(id),
  to_custodian_id INTEGER REFERENCES staff(id),
  reason TEXT NOT NULL,
  requested_by INTEGER NOT NULL REFERENCES users(id),
  approved_by INTEGER REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending_approval', -- pending_approval, approved, rejected, completed, cancelled
  transfer_date DATE NOT NULL,
  approval_date DATETIME,
  completion_date DATETIME,
  comments TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 17. Verification Campaigns
CREATE TABLE IF NOT EXISTS verification_campaigns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  campus_id INTEGER REFERENCES campuses(id),
  department_id INTEGER REFERENCES departments(id),
  building_id INTEGER REFERENCES buildings(id),
  status TEXT NOT NULL DEFAULT 'in_progress', -- scheduled, in_progress, completed, cancelled
  created_by INTEGER REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 18. Asset Verifications
CREATE TABLE IF NOT EXISTS asset_verifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id INTEGER REFERENCES verification_campaigns(id),
  asset_id INTEGER NOT NULL REFERENCES assets(id),
  verifier_id INTEGER REFERENCES users(id),
  verified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  verified_campus_id INTEGER REFERENCES campuses(id),
  verified_building_id INTEGER REFERENCES buildings(id),
  verified_room_id INTEGER REFERENCES rooms(id),
  verified_department_id INTEGER REFERENCES departments(id),
  verified_custodian_id INTEGER REFERENCES staff(id),
  verified_condition TEXT NOT NULL,
  expected_building_id INTEGER REFERENCES buildings(id),
  expected_room_id INTEGER REFERENCES rooms(id),
  expected_department_id INTEGER REFERENCES departments(id),
  is_location_mismatch INTEGER NOT NULL DEFAULT 0,
  is_department_mismatch INTEGER NOT NULL DEFAULT 0,
  is_condition_changed INTEGER NOT NULL DEFAULT 0,
  is_unexpected INTEGER NOT NULL DEFAULT 0,
  verification_status TEXT NOT NULL DEFAULT 'verified', -- verified, mismatched, damaged, missing, unregistered
  remarks TEXT,
  photo_url TEXT,
  gps_lat REAL,
  gps_lng REAL
);

-- 19. Asset Maintenance & Repairs
CREATE TABLE IF NOT EXISTS asset_maintenance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  maintenance_number TEXT NOT NULL UNIQUE,
  asset_id INTEGER NOT NULL REFERENCES assets(id),
  maintenance_type TEXT NOT NULL, -- preventive, corrective, routine_service, emergency_repair, warranty_claim
  priority TEXT NOT NULL DEFAULT 'medium', -- low, medium, high, critical
  issue_reported TEXT NOT NULL,
  description TEXT,
  service_provider TEXT,
  cost REAL NOT NULL DEFAULT 0,
  scheduled_date DATE,
  start_date DATE,
  completed_date DATE,
  status TEXT NOT NULL DEFAULT 'requested', -- requested, assessed, approved, in_progress, completed, cancelled
  requested_by INTEGER REFERENCES users(id),
  approved_by INTEGER REFERENCES users(id),
  technician_notes TEXT,
  condition_after TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 20. Asset Disposals
CREATE TABLE IF NOT EXISTS asset_disposals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  disposal_number TEXT NOT NULL UNIQUE,
  asset_id INTEGER NOT NULL REFERENCES assets(id),
  disposal_method TEXT NOT NULL, -- public_auction, scrap, donation, destruction, lost_writeoff
  reason TEXT NOT NULL, -- obsolete, beyond_economic_repair, damaged, surplus, lost, stolen, other
  committee_approval_ref TEXT,
  disposal_value REAL NOT NULL DEFAULT 0,
  buyer_recipient TEXT,
  responsible_officer_id INTEGER REFERENCES staff(id),
  requested_by INTEGER REFERENCES users(id),
  approved_by INTEGER REFERENCES users(id),
  disposal_date DATE,
  status TEXT NOT NULL DEFAULT 'pending_assessment', -- pending_assessment, approved, disposed, rejected
  remarks TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 21. Depreciation Records
CREATE TABLE IF NOT EXISTS depreciation_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  financial_year TEXT NOT NULL,
  period_date DATE NOT NULL,
  depreciation_method TEXT NOT NULL,
  opening_value REAL NOT NULL,
  depreciation_amount REAL NOT NULL,
  closing_value REAL NOT NULL,
  calculated_by INTEGER REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 22. Asset Documents & Attachments
CREATE TABLE IF NOT EXISTS asset_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_id INTEGER REFERENCES assets(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL, -- invoice, purchase_order, warranty, delivery_note, disposal_approval, maintenance_report, transfer_form, inspection_report, photo, other
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by INTEGER REFERENCES users(id),
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 23. In-App Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info', -- info, warning, alert, success
  entity_type TEXT, -- asset, transfer, maintenance, disposal, verification, warranty
  entity_id INTEGER,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 24. Audit Trail
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  user_name TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id INTEGER,
  entity_code TEXT,
  old_values TEXT, -- JSON
  new_values TEXT, -- JSON
  ip_address TEXT,
  user_agent TEXT,
  details TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for High Performance
CREATE INDEX IF NOT EXISTS idx_assets_barcode ON assets(barcode);
CREATE INDEX IF NOT EXISTS idx_assets_asset_number ON assets(asset_number);
CREATE INDEX IF NOT EXISTS idx_assets_dept ON assets(department_id);
CREATE INDEX IF NOT EXISTS idx_assets_building ON assets(building_id);
CREATE INDEX IF NOT EXISTS idx_assets_room ON assets(room_id);
CREATE INDEX IF NOT EXISTS idx_assets_custodian ON assets(custodian_id);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_condition ON assets(condition);
CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(category_id);
CREATE INDEX IF NOT EXISTS idx_verif_asset ON asset_verifications(asset_id);
CREATE INDEX IF NOT EXISTS idx_verif_campaign ON asset_verifications(campaign_id);
CREATE INDEX IF NOT EXISTS idx_transfers_asset ON asset_transfers(asset_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_asset ON asset_maintenance(asset_id);
CREATE INDEX IF NOT EXISTS idx_history_asset ON asset_history(asset_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
