import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useNotify } from '../context/NotificationContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  FileText, Download, Printer, Filter, Table, RefreshCw,
  Building, Briefcase, Calendar, Search
} from 'lucide-react';

export const REPORT_LIST = [
  { id: 'asset_register', label: '1. Asset Register', desc: 'Complete institutional asset master inventory' },
  { id: 'department_register', label: '2. Department Asset Register', desc: 'Assets grouped by academic & administrative departments' },
  { id: 'building_register', label: '3. Building Asset Register', desc: 'Facility asset counts, values and floor breakdowns' },
  { id: 'room_register', label: '4. Office/Room Asset Register', desc: 'Asset distribution by room, lab, and office' },
  { id: 'custodian_register', label: '5. Custodian Asset Register', desc: 'Staff custody allocations and sign-off values' },
  { id: 'category_report', label: '6. Asset Category Report', desc: 'Classification summary, useful lives and capital values' },
  { id: 'condition_report', label: '7. Asset Condition Report', desc: 'Breakdown by physical condition (good, fair, damaged, obsolete)' },
  { id: 'missing_assets', label: '8. Missing Asset Report', desc: 'Assets expected in audit scope but not physically verified' },
  { id: 'verification_report', label: '9. Verification Audit Report', desc: 'Detailed log of physical scans with location mismatch flags' },
  { id: 'unverified_report', label: '10. Unverified Asset Report', desc: 'Assets pending verification or overdue for audit' },
  { id: 'transfer_report', label: '11. Asset Transfer Report', desc: 'Historical relocation approvals and custody handovers' },
  { id: 'maintenance_report', label: '12. Maintenance & Repair Report', desc: 'Work order tickets, technician notes and repair expenditures' },
  { id: 'warranty_report', label: '13. Warranty Expiry Report', desc: 'Manufacturer warranties, remaining days and 30-day alerts' },
  { id: 'acquisition_report', label: '14. Acquisition & Procurement Report', desc: 'Purchases, POs, invoices, grants, and vendor contracts' },
  { id: 'disposal_report', label: '15. Disposal Register Report', desc: 'Authorized public auctions, scrapping, and board write-offs' },
  { id: 'depreciation_report', label: '16. Depreciation & Valuation Report', desc: 'Carrying values, accumulated depreciation and net book values' },
  { id: 'audit_trail_report', label: '17. Institutional Audit Trail Report', desc: 'Immutable timeline of user operations and system events' }
];

export default function Reports() {
  const notify = useNotify();

  const [selectedReport, setSelectedReport] = useState('asset_register');
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [buildings, setBuildings] = useState([]);

  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState('');

  // Load Dropdowns
  useEffect(() => {
    async function loadRefs() {
      try {
        const [cRes, dRes, bRes] = await Promise.all([
          api.get('/api/v1/categories'),
          api.get('/api/v1/departments'),
          api.get('/api/v1/buildings')
        ]);
        if (cRes.success) setCategories(cRes.categories || []);
        if (dRes.success) setDepartments(dRes.departments || []);
        if (bRes.success) setBuildings(bRes.buildings || []);
      } catch (e) {
        console.error(e);
      }
    }
    loadRefs();
  }, []);

  // Fetch Report Data
  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedCategory) params.category_id = selectedCategory;
      if (selectedDepartment) params.department_id = selectedDepartment;
      if (selectedBuilding) params.building_id = selectedBuilding;

      const res = await api.get(`/api/v1/reports/${selectedReport}`, params);
      if (res.success) {
        setReportData(res.data || []);
      }
    } catch (err) {
      notify.error(err.message || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [selectedReport, selectedCategory, selectedDepartment, selectedBuilding]);

  const handleExport = (format) => {
    const token = localStorage.getItem('mocu_token') || '';
    const q = new URLSearchParams({
      format,
      category_id: selectedCategory || '',
      department_id: selectedDepartment || '',
      building_id: selectedBuilding || '',
      token
    }).toString();

    const url = `/api/v1/reports/${selectedReport}/export?${q}`;
    window.open(url, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  const currentReportObj = REPORT_LIST.find(r => r.id === selectedReport) || REPORT_LIST[0];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            Institutional Reporting & Compliance Center
          </h1>
          <p className="text-xs text-slate-500">
            17 official university statutory and operational reports exportable to Excel, CSV & Printable PDF
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('xlsx')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold shadow-sm transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Excel (.xlsx)</span>
          </button>

          <button
            onClick={() => handleExport('csv')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold shadow-sm transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-sm transition"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left Selector, Right Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left: 17 Reports List */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden no-print">
          <div className="p-3 bg-slate-900 text-white font-bold text-xs flex items-center justify-between">
            <span>Official Institutional Reports</span>
            <span className="text-[10px] bg-amber-500 text-slate-950 px-1.5 py-0.2 rounded font-mono">17</span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto text-xs">
            {REPORT_LIST.map(rep => {
              const isActive = selectedReport === rep.id;
              return (
                <button
                  key={rep.id}
                  onClick={() => setSelectedReport(rep.id)}
                  className={`w-full text-left p-3 transition flex items-start gap-2.5 ${
                    isActive
                      ? 'bg-amber-50 text-amber-950 font-bold border-l-4 border-amber-500'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <FileText className={`w-4 h-4 shrink-0 mt-0.5 ${isActive ? 'text-amber-600' : 'text-slate-400'}`} />
                  <div>
                    <div className="leading-tight">{rep.label}</div>
                    <div className="text-[10px] text-slate-400 font-normal line-clamp-1 mt-0.5">{rep.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Active Report Viewer & Filter */}
        <div className="lg:col-span-3 space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-2 text-xs items-center no-print">
            <span className="font-bold text-slate-600 uppercase text-[10px]">Filters:</span>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="p-1.5 border border-slate-300 rounded-lg bg-white"
            >
              <option value="">Category (All)</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="p-1.5 border border-slate-300 rounded-lg bg-white"
            >
              <option value="">Department (All)</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>

            <select
              value={selectedBuilding}
              onChange={(e) => setSelectedBuilding(e.target.value)}
              className="p-1.5 border border-slate-300 rounded-lg bg-white"
            >
              <option value="">Building (All)</option>
              {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>

            <span className="ml-auto text-slate-500 text-[11px] font-semibold">
              {reportData.length} records in report
            </span>
          </div>

          {/* Printable Report Document Card */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6 printable-area">
            {/* Header Block on Report */}
            <div className="border-b-2 border-slate-900 pb-4 text-center space-y-1">
              <div className="text-sm font-black text-slate-900 tracking-wider uppercase">
                MOSHI CO-OPERATIVE UNIVERSITY (MoCU)
              </div>
              <h2 className="text-base font-extrabold text-amber-800 uppercase tracking-tight">
                {currentReportObj.label.replace(/^[0-9]+\.\s*/, '')}
              </h2>
              <p className="text-xs text-slate-500">{currentReportObj.desc}</p>
              <div className="text-[11px] text-slate-400 pt-1">
                Generated: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })} • Institutional AMS Platform
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              {loading ? (
                <div className="text-center p-12 text-slate-500">
                  <div className="w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <span>Aggregating institutional report data...</span>
                </div>
              ) : reportData.length === 0 ? (
                <div className="text-center p-12 text-slate-400">
                  No records found matching the report criteria.
                </div>
              ) : (
                <table className="w-full text-left text-xs divide-y divide-slate-200">
                  <thead className="bg-slate-50 font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-2.5">#</th>
                      {Object.keys(reportData[0]).map(key => (
                        <th key={key} className="p-2.5 whitespace-nowrap">
                          {key.replace(/_/g, ' ')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {reportData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition">
                        <td className="p-2.5 font-bold text-slate-400">{idx + 1}</td>
                        {Object.entries(row).map(([key, val], cellIdx) => {
                          const isCurrency = key.includes('cost') || key.includes('value') || key.includes('price');
                          const isDate = key.includes('date');
                          return (
                            <td key={cellIdx} className={`p-2.5 whitespace-nowrap ${isCurrency ? 'text-right font-mono font-semibold' : ''}`}>
                              {isCurrency
                                ? formatCurrency(val)
                                : isDate
                                ? formatDate(val)
                                : val !== null && val !== undefined
                                ? String(val)
                                : '—'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Official Institutional Sign-Off Block */}
            <div className="pt-8 border-t border-slate-300 grid grid-cols-2 gap-8 text-xs text-slate-600">
              <div className="space-y-4">
                <div className="font-bold text-slate-900">PREPARED BY (ASSET OFFICER):</div>
                <div className="border-b border-slate-400 h-6"></div>
                <div>Name: ______________________ Date: ___________</div>
              </div>
              <div className="space-y-4">
                <div className="font-bold text-slate-900">VERIFIED BY (INTERNAL AUDITOR / BURSAR):</div>
                <div className="border-b border-slate-400 h-6"></div>
                <div>Name: ______________________ Date: ___________</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
