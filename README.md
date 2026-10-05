# Moshi Co-operative University (MoCU) — Enterprise Asset Management System (AMS)

![MoCU AMS Banner](https://img.shields.io/badge/MoCU-Asset%20Management%20System-0A2540?style=for-the-badge&logo=shield)
![Node](https://img.shields.io/badge/Node.js-v22-339933?style=for-the-badge&logo=nodedotjs)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)
![Tailwind](https://img.shields.io/badge/TailwindCSS-v3.4-38B2AC?style=for-the-badge&logo=tailwind-css)
![Vite](https://img.shields.io/badge/Vite-v6-646CFF?style=for-the-badge&logo=vite)
![SQLite](https://img.shields.io/badge/SQLite-WAL%20Sync-003B57?style=for-the-badge&logo=sqlite)
![License](https://img.shields.io/badge/License-Institutional%20Enterprise-D97706?style=for-the-badge)

A production-ready, auditable, enterprise-grade Asset Management System custom-engineered for **Moshi Co-operative University (MoCU)** in Moshi, Kilimanjaro, Tanzania. The system manages the full institutional lifecycle of physical, ICT, laboratory, agricultural, transport, and facility infrastructure across multiple campuses, faculties, directorates, and staff custodians.

---

## Table of Contents

1. [Executive Summary & Institutional Context](#1-executive-summary--institutional-context)
2. [Key System Highlights](#2-key-system-highlights)
3. [Architecture & Technology Stack](#3-architecture--technology-stack)
4. [Multi-Campus & Multi-Tier Location Hierarchy](#4-multi-campus--multi-tier-location-hierarchy)
5. [Role-Based Access Control (RBAC) & Institutional Personas](#5-role-based-access-control-rbac--institutional-personas)
6. [Complete Asset Lifecycle Workflows](#6-complete-asset-lifecycle-workflows)
   - 6.1 [Asset Registration & Automatic Sequence Numbering](#61-asset-registration--automatic-sequence-numbering)
   - 6.2 [Barcode & QR Code Generation & Label Printing](#62-barcode--qr-code-generation--label-printing)
   - 6.3 [Mobile Scanner & Offline Verification Engine](#63-mobile-scanner--offline-verification-engine)
   - 6.4 [Physical Verification Campaigns & Mismatch Detection](#64-physical-verification-campaigns--mismatch-detection)
   - 6.5 [Inter-Departmental Asset Transfers & Approvals](#65-inter-departmental-asset-transfers--approvals)
   - 6.6 [Maintenance, Servicing & Work Order Management](#66-maintenance-servicing--work-order-management)
   - 6.7 [Warranty & Service Level Contract Tracking](#67-warranty--service-level-contract-tracking)
   - 6.8 [IPSAS-Compliant Depreciation & Carrying Values](#68-ipsas-compliant-depreciation--carrying-values)
   - 6.9 [Controlled Asset Disposal & Permanent Archive](#69-controlled-asset-disposal--permanent-archive)
   - 6.10 [Staff Custody Registers & Formal Sign-Off Handover](#610-staff-custody-registers--formal-sign-off-handover)
7. [The 17 Official Institutional Reports](#7-the-17-official-institutional-reports)
8. [Bulk Data Import & Institutional Catalogue Export](#8-bulk-data-import--institutional-catalogue-export)
9. [Immutable Audit Trail & Regulatory Compliance](#9-immutable-audit-trail--regulatory-compliance)
10. [RESTful API Reference](#10-restful-api-reference)
11. [Default Institutional Credentials](#11-default-institutional-credentials)
12. [Installation, Setup & Automated Verification](#12-installation-setup--automated-verification)

---

## 1. Executive Summary & Institutional Context

As a premier public university established under the Universities Act No. 7 of 2005, Moshi Co-operative University (MoCU) operates across geographically distributed campuses including the Main Campus in Moshi, Kilimanjaro and the Kizumbi Institute of Co-operative and Business Education (KICoB) in Shinyanga.

The MoCU Asset Management System (AMS) provides total visibility, auditability, physical accountability, and statutory financial compliance for all university assets. Built to comply with public procurement guidelines (PPRA), national audit requirements (CAG), and International Public Sector Accounting Standards (IPSAS 17 - Property, Plant, and Equipment), the system prevents ghost assets, detects unauthorized asset relocations, tracks manufacturer warranties, and eliminates audit queries.

---

## 2. Key System Highlights

- **Complete Dual-Interface Experience**: Rich responsive Web Desktop Management Portal + Dedicated Mobile Scanner PWA optimized for handheld field tablets and smartphones.
- **Offline Scanner Resilience**: Verification scans cache to client `localStorage` with offline indicators and automatically batch-resync with location conflict detection when network connectivity resumes.
- **Location Mismatch Engine**: Instant real-time comparison during physical barcode scanning; flags mismatched rooms, buildings, and custodians with prompt to log discrepancy or initiate official transfer.
- **Customizable Barcode & QR Labels**: Generates vector Code 128 barcodes and 2D QR codes with MoCU institutional headers, serial numbers, room codes, and print-ready multi-column Avery-compatible sheets.
- **Multi-Role Governance**: 11 institutional roles mapped to university statutory responsibilities (Vice Chancellor, Bursar, Internal Auditor, Estates, ICT, Asset Officer, etc.).
- **17 Statutory Institutional Reports**: Master registers, department registers, custodian cards, missing asset exception sheets, warranty expiry watches, and disposal resolutions exportable to **Excel (.xlsx)**, **CSV**, and **Printable PDF**.
- **IPSAS 17 Straight-Line & Reducing Balance Schedules**: Automatic calculation of annual depreciation, accumulated write-downs, and net book values with batch year-end execution.

---

## 3. Architecture & Technology Stack

```
┌─────────────────────────────────────────────────────────────────────────┐
│              Moshi Co-operative University (MoCU) AMS                   │
├─────────────────────────────────────────────────────────────────────────┤
│  Frontend Client (React 18 + Vite + Tailwind CSS + Lucide Icons)        │
│  ├── Responsive Desktop Management Console                              │
│  ├── Dedicated Mobile Scanner View (HTML5-QRCode + Camera Feed)         │
│  ├── Offline Sync Worker & LocalStorage Queue                           │
│  └── Barcode / QR Vector Rendering (JsBarcode + SVG QR)                 │
├─────────────────────────────────────────────────────────────────────────┤
│  REST API Layer (Express.js on Node.js v22)                             │
│  ├── JWT Authentication & Role-Based Access Control (RBAC)             │
│  ├── Central Transaction Coordinator & Exception Handler                │
│  ├── ExcelJS Report Export Engine & CSV Transformer                     │
│  └── Audit Logging Interceptor                                          │
├─────────────────────────────────────────────────────────────────────────┤
│  Database Layer (Node.js 22 Native SQLite with WAL Journaling)          │
│  ├── Relational Integrity (Foreign Keys ON, Cascades, Indexes)          │
│  ├── ACID Transactions & Sequence Generators                            │
│  └── Complete Seed Data Representing All MoCU Campuses & Buildings      │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Multi-Campus & Multi-Tier Location Hierarchy

The system models the physical university geography through a four-tier spatial taxonomy:

```
[Campus] ──> [Building] ──> [Floor] ──> [Room / Office / Laboratory]
```

### Pre-Configured MoCU Locations:
1. **Main Campus (Moshi, Kilimanjaro)**
   - **MCB** — Main Administration Building (Ground, 1st, 2nd, 3rd Floor)
     - `ADM-201`: Vice Chancellor Executive Office
     - `ADM-102`: Finance Directorate & Bursar
     - `ADM-G05`: Asset Management & Central Registry
   - **ICT-C** — ICT Complex & Innovation Hub
     - `ICT-101`: Enterprise Data Center & Server Room
     - `ICT-204`: Computer Lab 1 (High Performance Workstations)
   - **CHALL** — Co-operative Great Hall & Conference Complex
   - **LIB** — University Central Library
     - `LIB-G01`: Main Reading & Circulation Hall
   - **LAB** — Science & Agricultural Laboratory Complex
     - `LAB-102`: Soil Science & Co-op Research Lab
2. **Kizumbi Institute of Co-operative and Business Education (KICoB - Shinyanga)**
   - **KICOB-AB** — Kizumbi Academic Block
     - `KIC-101`: Kizumbi Director Office

---

## 5. Role-Based Access Control (RBAC) & Institutional Personas

The system enforces strict principle-of-least-privilege RBAC with 11 pre-configured institutional roles:

| Role Code | Role Name | Primary Responsibility & Privileges |
| :--- | :--- | :--- |
| `super_admin` | Institutional Super Admin | Full administrative control, system settings, user account provisioning |
| `bursar` | University Bursar / CFO | Financial reporting, asset capitalization, depreciation, disposal approval |
| `asset_officer` | Central Asset Officer | Asset registration, transfers, verifications, barcode printing, custody |
| `internal_auditor`| Internal University Auditor | Read-only compliance, physical audit verification, missing asset audit, logs |
| `estates_director`| Director of Estates | Building management, room registers, physical space planning |
| `ict_director` | Director of ICT | ICT hardware and server assets, warranty agreements, network devices |
| `hod` | Head of Department | Departmental asset overview, transfer approvals, custodian sign-offs |
| `storekeeper` | Central Storekeeper | Asset intake, procurement tagging, initial storage assignment |
| `field_verifier` | Field Verification Officer | Mobile scanner audit campaigns, barcode scanning, condition reporting |
| `maintenance_tech`| Maintenance Technician | Work order execution, repairs, service records, condition updates |
| `custodian` | Staff Custodian | Personal custody card view, asset acknowledgement, transfer request |

---

## 6. Complete Asset Lifecycle Workflows

### 6.1 Asset Registration & Automatic Sequence Numbering
When a new asset is registered (or bulk imported), the system assigns an institutional asset number following the university standard formula:
```
MoCU / {CATEGORY_CODE} / {YEAR} / {SEQUENTIAL_NUMBER}
Example: MoCU/ICT/2026/000001
```
The asset record captures:
- Name, Category, Subcategory, Asset Type
- Brand, Model, Serial Number, Physical Condition
- Campus, Building, Floor, Room, Department, Staff Custodian
- Procurement Method, Vendor, PO Number, Invoice Number, Purchase Price, Currency, Funding Source
- Useful Life (Years), Residual Rate, Initial Depreciation Convention

### 6.2 Barcode & QR Code Generation & Label Printing
Every registered asset automatically generates:
- **Code 128 1D Barcode**: Standard high-density alphanumeric symbology.
- **2D QR Code**: Encodes direct digital lookup URL (`https://mocu.ac.tz/ams/asset/{BARCODE}`).
- **Printable Asset Tags**: Available in 4 layout dimensions (Standard 70×36mm, Compact 50×25mm, Large Asset 100×50mm, and Avery Sheet Layout). Each tag displays:
  - Official Institutional Header: `MOSHI CO-OPERATIVE UNIVERSITY`
  - High-contrast Barcode & Human-Readable Code
  - Asset Name & Category
  - Assigned Building & Room Code
  - Property Notice: `PROPERTY OF MoCU - DO NOT REMOVE`

### 6.3 Mobile Scanner & Offline Verification Engine
Field audit teams scanning assets across campus buildings and remote institutes utilize the **Mobile Scanner PWA**:
- High-performance camera scanner powered by `html5-qrcode` supporting real-time camera switching, flash/torch control, and audio/haptic beep feedback.
- Manual keyboard/Bluetooth gun scanner entry for degraded tags.
- **Offline Resilience**: When internet access is interrupted inside basements or remote facilities, scans are held in an IndexedDB/localStorage queue with pending counter.
- **Instant Location Mismatch Warning**: If an asset assigned to `MCB / ADM-201` is scanned inside `ICT-C / ICT-204`, the scanner immediately displays an alert highlighting:
  - Expected Room vs. Scanned Room
  - Expected Custodian vs. Present Custodian
  - Instant action buttons: `Record Mismatch Only` or `Initiate Transfer Request`.

### 6.4 Physical Verification Campaigns & Mismatch Detection
Asset officers can schedule and monitor university-wide or department-specific verification campaigns:
- Audit scope by Campus, Building, or Category.
- Real-time progress gauges tracking verified vs. unverified assets.
- **Missing Asset Detection**: Filter all unverified assets within the campaign scope and generate the statutory **Missing Asset Report** for internal audit review.

### 6.5 Inter-Departmental Asset Transfers & Approvals
Formal relocation of equipment between offices or faculties requires a controlled workflow:
1. **Request**: Initiating department selects asset, new building, new room, and proposed custodian.
2. **Review & Approval**: Asset Officer or Bursar reviews the justification.
3. **Execution**: System automatically updates the asset's active location and custodian, logs an immutable audit event, and appends the relocation to the asset's permanent history.

### 6.6 Maintenance, Servicing & Work Order Management
Track corrective breakdowns and preventive servicing:
- Work orders specify ticket number, priority, reported fault, technician, and estimated downtime.
- On completion, technician logs repair actions, total parts/labor cost, invoice reference, and updates the asset's physical condition (e.g. from `damaged` to `good`).

### 6.7 Warranty & Service Level Contract Tracking
- Monitor manufacturer warranties, vendor service contracts, and SLA expiry dates.
- Automated **30-Day Expiration Watchlist** alerts ICT and procurement officers before coverage lapses.

### 6.8 IPSAS-Compliant Depreciation & Carrying Values
Compliant with IPSAS 17 Property, Plant, and Equipment:
- Straight-line formula:
  $$\text{Annual Depreciation} = \frac{\text{Acquisition Cost} - \text{Residual Value}}{\text{Useful Life in Years}}$$
- Reducing balance formula:
  $$\text{Depreciation Rate} = 1 - \left(\frac{\text{Residual Value}}{\text{Acquisition Cost}}\right)^{\frac{1}{\text{Useful Life}}}$$
- Year-end batch execution commits official financial ledger records for statutory balance sheet preparation.

### 6.9 Controlled Asset Disposal & Permanent Archive
Assets that reach obsolescence, irreparable damage, or end of economic life undergo university board disposal:
- Disposal methods: `Public Auction`, `Scrap / Recycled`, `Donation`, or `Board Write-Off`.
- Requires Board Resolution Reference, Disposal Value (TZS), and Justification.
- Disposed assets are archived with status `disposed` but permanently retained for historical audit inspection.

### 6.10 Staff Custody Registers & Formal Sign-Off Handover
Individual academic and administrative staff members have digital custody profiles:
- Lists all laptops, printers, laboratory instruments, and furniture assigned to the employee.
- **Printable Custodian Asset Register**: Generates formal university custody handover documents featuring institutional declaration:
  > *"I hereby acknowledge receipt and physical custody of the institutional assets listed above. I undertake to exercise due care and report any damage, loss, or relocation."*
  Includes signature and date fields for employee and approving head of department.

---

## 7. The 17 Official Institutional Reports

The platform includes 17 purpose-built institutional reports accessible via the Reporting Center, exportable to **Excel (.xlsx)**, **CSV**, and **Printable PDF**:

1. **Asset Register**: Comprehensive master inventory of all university capital and recurrent assets.
2. **Department Asset Register**: Asset quantities, carrying values, and condition tallies grouped by department.
3. **Building Asset Register**: Facility assets and floor distributions across MoCU campuses.
4. **Office/Room Asset Register**: Granular room-by-room inventory for annual office audits.
5. **Custodian Asset Register**: Assets allocated per staff member with custody sign-off totals.
6. **Asset Category Report**: Categorization breakdown with useful lives and depreciation schedules.
7. **Asset Condition Report**: Physical condition distribution (New, Good, Fair, Damaged, Poor, Obsolete).
8. **Missing Asset Report**: Statutory discrepancy report of assets unverified during physical audits.
9. **Verification Audit Report**: Log of physical scans, scanner timestamps, verifier names, and mismatch flags.
10. **Unverified Asset Report**: Overdue assets requiring field inspection.
11. **Asset Transfer Report**: Relocation logs, transfer authorizations, and custody changes.
12. **Maintenance & Repair Report**: Work orders, maintenance expenditures, and technician notes.
13. **Warranty Expiry Report**: Active warranties, expiring policies, and vendor support contacts.
14. **Acquisition & Procurement Report**: Capital purchases, PO references, invoice records, and funding sources.
15. **Disposal Register Report**: Authorized public auctions, scrap sales, and Board write-offs.
16. **Depreciation & Valuation Report**: Historical cost, accumulated depreciation, and net book carrying values.
17. **Institutional Audit Trail Report**: Immutable chronological timeline of all user actions and system changes.

---

## 8. Bulk Data Import & Institutional Catalogue Export

- **Standardized MoCU CSV Template**: Pre-formatted column headers (`Asset Name`, `Category Code`, `Serial Number`, `Building Code`, `Room Code`, `Department Code`, `Custodian Staff ID`, `Cost`).
- **Pre-Flight Validation Engine**: Validates every row against existing database records; detects duplicate serial numbers; checks foreign key validity for buildings, rooms, and departments.
- **Visual Preview Table**: Highlights valid rows in emerald and erroneous rows in rose with exact line-by-line correction guidance before anything is written to the database.
- **Full Catalogue Export**: One-click download of the complete institutional registry in formatted Excel (`.xlsx`) or CSV.

---

## 9. Immutable Audit Trail & Regulatory Compliance

Every state-altering operation is logged to the `audit_logs` table:
- **Timestamp & Operator**: Exact ISO-8601 UTC timestamp, user ID, full name, and role.
- **Action & Entity**: Standardized action code (`ASSET_CREATED`, `ASSET_VERIFIED`, `TRANSFER_APPROVED`, etc.).
- **Differential State Tracking**: Captures JSON diffs of `old_values` and `new_values` for forensic verification.
- **Network Metadata**: Client IP address and User Agent string.

---

## 10. RESTful API Reference

All API routes are prefixed with `/api/v1` and authenticated using JWT Bearer tokens:

```http
Authorization: Bearer <JWT_TOKEN>
```

### Key API Endpoints:

| Category | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **Auth** | `POST` | `/api/v1/auth/login` | Authenticate institutional credentials |
| | `GET` | `/api/v1/auth/me` | Fetch authenticated profile and permissions |
| **Assets** | `GET` | `/api/v1/assets` | Query assets with filters, pagination, and search |
| | `POST` | `/api/v1/assets` | Register new asset and auto-generate barcode |
| | `GET` | `/api/v1/assets/:id` | Full asset detail including history, maintenance, and transfers |
| | `GET` | `/api/v1/assets/barcode/:code` | Rapid lookup by barcode string or QR code |
| **Verifications** | `POST` | `/api/v1/verifications/scan` | Submit physical scan; checks location match |
| | `GET` | `/api/v1/verifications/campaigns` | List active and archived verification campaigns |
| | `POST` | `/api/v1/verifications/campaigns` | Create new physical audit campaign |
| **Transfers** | `GET` | `/api/v1/transfers` | List transfer requests and histories |
| | `POST` | `/api/v1/transfers` | Submit inter-departmental transfer request |
| | `PUT` | `/api/v1/transfers/:id/status` | Approve or reject transfer request |
| **Maintenance** | `GET` | `/api/v1/maintenance` | List work orders with status filter |
| | `POST` | `/api/v1/maintenance` | Create maintenance ticket |
| | `PUT` | `/api/v1/maintenance/:id/complete` | Complete repair and update asset condition |
| **Depreciation** | `GET` | `/api/v1/depreciation/summary` | Carrying value and accumulated depreciation summary |
| | `POST` | `/api/v1/depreciation/run` | Execute financial year depreciation batch |
| **Reports** | `GET` | `/api/v1/reports/:type` | Generate dataset for any of the 17 reports |
| | `GET` | `/api/v1/reports/:type/export` | Export report as Excel (`.xlsx`) or `.csv` |
| **Bulk Import** | `POST` | `/api/v1/import/preview` | Upload CSV for pre-flight schema validation |
| | `POST` | `/api/v1/import/commit` | Commit validated rows to the database |

---

## 11. Default Institutional Credentials

For demonstration, audit evaluation, and initial setup, the following pre-seeded accounts are active:

| Role | Username | Password | Full Name | Department / Office |
| :--- | :--- | :--- | :--- | :--- |
| **Institutional Super Admin** | `admin` | `Admin@123` | Dr. E. Ndunguru | Directorate of Asset Management |
| **University Bursar (CFO)** | `bursar` | `Bursar@123` | CPA Mary Lyimo | Finance & Accounts Directorate |
| **Central Asset Officer** | `asset_officer` | `Asset@123` | Jackson Mtui | Directorate of Asset Management |
| **Internal Auditor** | `auditor` | `Auditor@123` | CPA David Kimaro | Internal Audit Directorate |
| **Director of Estates** | `estates` | `Estates@123` | Eng. Peter Temu | Estates & Works Directorate |
| **Director of ICT** | `ict_director`| `Ict@123` | Dr. Flora Mndeme | Directorate of ICT (DICT) |
| **Head of Department (HOD)**| `hod_cs` | `Hod@123` | Dr. J. Shirima | Dept of Computer Science & ICT |
| **Central Storekeeper** | `storekeeper` | `Store@123` | Grace Shirima | University Central Stores |
| **Field Verification Officer**| `verifier` | `Verifier@123` | Emmanuel Mallya | Internal Audit Field Team |
| **Maintenance Technician** | `technician` | `Tech@123` | Thomas Mushi | Estates & Works Directorate |
| **Staff Custodian** | `staff_user` | `Staff@123` | Alfred Mwita | Dept of Computer Science & ICT |

---

## 12. Installation, Setup & Automated Verification

### Prerequisites
- Node.js v22.x or later (utilizes native Node.js SQLite with zero native compilation dependencies)
- npm v10.x or later

### Setup & Launch
```bash
# 1. Clone repository
git clone https://github.com/Jgenes/Assets-Management-System.git
cd Assets-Management-System

# 2. Install dependencies
npm install

# 3. Seed database with institutional MoCU data
npm run seed

# 4. Build frontend client
npm run build

# 5. Start unified enterprise server (Frontend + REST API on port 3000)
npm start
```
The application will be live at `http://localhost:3000` (or the configured preview port).

### Running Automated Test Suites
The system includes comprehensive automated end-to-end and unit test suites:
```bash
npm test
```
The test command verifies:
1. `tests/lifecycle.test.js`: Authentication, campus drilldown, barcode lookup, asset registration, physical scan mismatch detection, transfer request & approval, maintenance completion, and disposal archiving.
2. `tests/reports.test.js`: Validates all 17 institutional reports, Excel XLSX creation, and CSV generation.
3. `tests/depreciation.test.js`: Validates straight-line and reducing balance calculations, net book values, and year-end depreciation batches.
4. `tests/importExport.test.js`: Validates CSV pre-flight schema parsing, duplicate serial number detection, and transactional bulk asset insertion.

---

*Designed and engineered for Moshi Co-operative University (MoCU) — Preserving public institutional accountability, physical security, and asset governance.*
