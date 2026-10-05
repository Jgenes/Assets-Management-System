import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNotify } from '../context/NotificationContext';
import { formatCurrency, formatDate, getConditionBadge, getStatusBadge } from '../utils/formatters';
import BarcodeRenderer from '../components/barcode/BarcodeRenderer';
import QrRenderer from '../components/barcode/QrRenderer';
import AssetLabel from '../components/barcode/AssetLabel';
import {
  Search, Filter, Plus, Printer, Eye, ArrowRightLeft,
  Wrench, Trash2, Download, Upload, X, Check, Calendar,
  Building, MapPin, User, DollarSign, ShieldAlert, FileText,
  Clock, History, CheckCircle2, AlertTriangle, Paperclip
} from 'lucide-react';

export default function AssetsList({ initialSelectedAssetId, onOpenMobileScanner }) {
  const { user, can } = useAuth();
  const notify = useNotify();

  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [selectedCondition, setSelectedCondition] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Dropdown reference data
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  // Selected row IDs for batch actions
  const [selectedAssetIds, setSelectedAssetIds] = useState(new Set());

  // Modals & Drawers
  const [selectedAssetDetail, setSelectedAssetDetail] = useState(null);
  const [activeDetailTab, setActiveDetailTab] = useState('overview');
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showPrintLabelModal, setShowPrintLabelModal] = useState(false);
  const [labelPrintAssets, setLabelPrintAssets] = useState([]);
  const [labelSize, setLabelSize] = useState('standard');

  // Load Reference Data
  useEffect(() => {
    async function loadRefs() {
      try {
        const [catsRes, deptsRes, bldsRes, staffRes, supsRes] = await Promise.all([
          api.get('/api/v1/categories'),
          api.get('/api/v1/departments'),
          api.get('/api/v1/buildings'),
          api.get('/api/v1/staff'),
          api.get('/api/v1/suppliers')
        ]);
        if (catsRes.success) setCategories(catsRes.categories || []);
        if (deptsRes.success) setDepartments(deptsRes.departments || []);
        if (bldsRes.success) setBuildings(bldsRes.buildings || []);
        if (staffRes.success) setStaffList(staffRes.staff || []);
        if (supsRes.success) setSuppliers(supsRes.suppliers || []);
      } catch (e) {
        console.error('Error loading reference dropdowns:', e);
      }
    }
    loadRefs();
  }, []);

  // Fetch Assets with filters & pagination
  const fetchAssets = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        search,
        category_id: selectedCategory,
        department_id: selectedDepartment,
        building_id: selectedBuilding,
        condition: selectedCondition,
        status: selectedStatus
      };
      const res = await api.get('/api/v1/assets', params);
      if (res.success) {
        setAssets(res.data || []);
        setTotalCount(res.pagination?.total || 0);
      }
    } catch (err) {
      notify.error(err.message || 'Failed to fetch assets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, [page, limit, selectedCategory, selectedDepartment, selectedBuilding, selectedCondition, selectedStatus]);

  // Open asset detail if requested via initial prop
  useEffect(() => {
    if (initialSelectedAssetId) {
      openAssetDetail(initialSelectedAssetId);
    }
  }, [initialSelectedAssetId]);

  const openAssetDetail = async (id) => {
    try {
      const res = await api.get(`/api/v1/assets/${id}`);
      if (res.success) {
        setSelectedAssetDetail(res.asset);
        setActiveDetailTab('overview');
      }
    } catch (err) {
      notify.error(err.message || 'Failed to load asset details.');
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedAssetIds(new Set(assets.map(a => a.id)));
    } else {
      setSelectedAssetIds(new Set());
    }
  };

  const handleToggleSelect = (id) => {
    const next = new Set(selectedAssetIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedAssetIds(next);
  };

  const handlePrintBatch = () => {
    const selected = assets.filter(a => selectedAssetIds.has(a.id));
    if (selected.length === 0) {
      notify.warning('Please select at least one asset to print labels.');
      return;
    }
    setLabelPrintAssets(selected);
    setShowPrintLabelModal(true);
  };

  const handlePrintSingle = (asset) => {
    setLabelPrintAssets([asset]);
    setShowPrintLabelModal(true);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            Institutional Asset Master Register
          </h1>
          <p className="text-xs text-slate-500">
            {totalCount} registered physical and digital assets across Moshi Co-operative University
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selectedAssetIds.size > 0 && (
            <button
              onClick={handlePrintBatch}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 shadow transition"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Print {selectedAssetIds.size} Labels</span>
            </button>
          )}

          <button
            onClick={() => setShowRegisterModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Register New Asset</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-2.5">
          {/* Search Box */}
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchAssets()}
              placeholder="Search asset, barcode, serial, model..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
            className="px-2.5 py-2 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white focus:ring-2 focus:ring-amber-500 outline-none"
          >
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Department Filter */}
          <select
            value={selectedDepartment}
            onChange={(e) => { setSelectedDepartment(e.target.value); setPage(1); }}
            className="px-2.5 py-2 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white focus:ring-2 focus:ring-amber-500 outline-none"
          >
            <option value="">All Departments</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          {/* Building Filter */}
          <select
            value={selectedBuilding}
            onChange={(e) => { setSelectedBuilding(e.target.value); setPage(1); }}
            className="px-2.5 py-2 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white focus:ring-2 focus:ring-amber-500 outline-none"
          >
            <option value="">All Buildings</option>
            {buildings.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>

          {/* Condition Filter */}
          <select
            value={selectedCondition}
            onChange={(e) => { setSelectedCondition(e.target.value); setPage(1); }}
            className="px-2.5 py-2 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white focus:ring-2 focus:ring-amber-500 outline-none"
          >
            <option value="">All Conditions</option>
            <option value="new">New</option>
            <option value="good">Good</option>
            <option value="fair">Fair</option>
            <option value="poor">Poor</option>
            <option value="damaged">Damaged</option>
            <option value="obsolete">Obsolete</option>
            <option value="under_repair">Under Repair</option>
          </select>
        </div>

        {/* Clear filter / status count tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1 text-slate-500">
            <span className="font-semibold text-slate-800">{totalCount}</span> assets found matching criteria
          </div>

          {(search || selectedCategory || selectedDepartment || selectedBuilding || selectedCondition || selectedStatus) && (
            <button
              onClick={() => {
                setSearch('');
                setSelectedCategory('');
                setSelectedDepartment('');
                setSelectedBuilding('');
                setSelectedCondition('');
                setSelectedStatus('');
                setPage(1);
              }}
              className="text-xs font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Asset Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs divide-y divide-slate-200">
            <thead className="bg-slate-50 font-bold text-slate-600 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3 w-8">
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={assets.length > 0 && selectedAssetIds.size === assets.length}
                    className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                  />
                </th>
                <th className="p-3">Asset Number & Barcode</th>
                <th className="p-3">Asset Name & Model</th>
                <th className="p-3">Category</th>
                <th className="p-3">Location & Custodian</th>
                <th className="p-3">Condition</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Cost / Book Value</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500">
                    <div className="flex justify-center items-center gap-2">
                      <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading university asset register...</span>
                    </div>
                  </td>
                </tr>
              ) : assets.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500">
                    No assets found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                assets.map(asset => {
                  const cond = getConditionBadge(asset.condition);
                  const stat = getStatusBadge(asset.status);
                  const isSelected = selectedAssetIds.has(asset.id);

                  return (
                    <tr
                      key={asset.id}
                      className={`hover:bg-slate-50/80 transition ${isSelected ? 'bg-amber-50/50' : ''}`}
                    >
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(asset.id)}
                          className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                        />
                      </td>

                      <td className="p-3">
                        <div className="font-mono font-bold text-slate-900">{asset.asset_number}</div>
                        <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1 mt-0.5">
                          <span className="bg-slate-100 px-1 rounded font-semibold text-slate-700">{asset.barcode}</span>
                        </div>
                      </td>

                      <td className="p-3 max-w-xs">
                        <div className="font-bold text-slate-900 truncate">{asset.name}</div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {asset.model || asset.brand || asset.manufacturer ? `${asset.brand || ''} ${asset.model || ''}` : 'Standard equipment'}
                          {asset.serial_number && <span className="font-mono ml-1 text-slate-600">• SN: {asset.serial_number}</span>}
                        </div>
                      </td>

                      <td className="p-3 whitespace-nowrap">
                        <span className="font-semibold text-slate-800">{asset.category_name}</span>
                        {asset.asset_type && (
                          <span className="block text-[10px] text-slate-500">{asset.asset_type}</span>
                        )}
                      </td>

                      <td className="p-3">
                        <div className="font-medium text-slate-800 flex items-center gap-1">
                          <Building className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[150px]">{asset.building_name || 'Unassigned'}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <User className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[150px]">{asset.custodian_name || 'Dept. Pool'}</span>
                        </div>
                      </td>

                      <td className="p-3 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${cond.bg} ${cond.text} ${cond.border}`}>
                          {cond.label}
                        </span>
                      </td>

                      <td className="p-3 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${stat.bg} ${stat.text} ${stat.border}`}>
                          {stat.label}
                        </span>
                      </td>

                      <td className="p-3 text-right whitespace-nowrap">
                        <div className="font-bold text-slate-900">{formatCurrency(asset.acquisition_cost)}</div>
                        <div className="text-[10px] text-slate-500">Book: {formatCurrency(asset.current_book_value)}</div>
                      </td>

                      <td className="p-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openAssetDetail(asset.id)}
                            className="p-1 rounded hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition"
                            title="View Full Asset Master Record & Timeline"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handlePrintSingle(asset)}
                            className="p-1 rounded hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition"
                            title="Print Barcode & QR Label"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600 gap-2">
          <div>
            Showing <span className="font-bold">{assets.length}</span> of <span className="font-bold">{totalCount}</span> assets
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-2.5 py-1 rounded bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="font-bold px-2">Page {page} of {Math.max(1, Math.ceil(totalCount / limit))}</span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page * limit >= totalCount}
              className="px-2.5 py-1 rounded bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Asset Detail Drawer / Modal */}
      {selectedAssetDetail && (
        <AssetDetailModal
          asset={selectedAssetDetail}
          activeTab={activeDetailTab}
          setActiveTab={setActiveDetailTab}
          onClose={() => setSelectedAssetDetail(null)}
          onPrintLabel={() => handlePrintSingle(selectedAssetDetail)}
          onRefresh={() => openAssetDetail(selectedAssetDetail.id)}
        />
      )}

      {/* Register Asset Modal */}
      {showRegisterModal && (
        <RegisterAssetModal
          categories={categories}
          departments={departments}
          buildings={buildings}
          staffList={staffList}
          suppliers={suppliers}
          onClose={() => setShowRegisterModal(false)}
          onSuccess={(newAsset) => {
            setShowRegisterModal(false);
            notify.success(`Asset ${newAsset.asset_number} registered successfully!`);
            fetchAssets();
            openAssetDetail(newAsset.id);
          }}
        />
      )}

      {/* Barcode & Label Print Modal */}
      {showPrintLabelModal && (
        <PrintLabelsModal
          assets={labelPrintAssets}
          size={labelSize}
          setSize={setLabelSize}
          onClose={() => setShowPrintLabelModal(false)}
        />
      )}
    </div>
  );
}

// -------------------------------------------------------------
// Subcomponent: Asset Detail Modal / Drawer with complete tabs
// -------------------------------------------------------------
function AssetDetailModal({ asset, activeTab, setActiveTab, onClose, onPrintLabel, onRefresh }) {
  const notify = useNotify();
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', file.type.startsWith('image/') ? 'photo' : 'other');

    setUploading(true);
    try {
      const res = await api.upload(`/api/v1/assets/${asset.id}/documents`, formData);
      if (res.success) {
        notify.success('File attached successfully!');
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      notify.error(err.message || 'File upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Master Overview', icon: FileText },
    { id: 'barcode', label: 'Barcode & QR', icon: Printer },
    { id: 'history', label: `Lifecycle Timeline (${asset.history?.length || 0})`, icon: History },
    { id: 'verifications', label: `Verifications (${asset.verifications?.length || 0})`, icon: CheckCircle2 },
    { id: 'transfers', label: `Transfers (${asset.transfers?.length || 0})`, icon: ArrowRightLeft },
    { id: 'maintenance', label: `Maintenance (${asset.maintenance?.length || 0})`, icon: Wrench },
    { id: 'documents', label: `Documents (${asset.documents?.length || 0})`, icon: Paperclip },
    { id: 'depreciation', label: 'Depreciation', icon: DollarSign }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-end transition-opacity">
      <div className="w-full max-w-3xl bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-slide-left">
        {/* Drawer Header */}
        <div className="bg-mocu-navy text-white p-4 flex items-center justify-between border-b border-mocu-navyLight shrink-0">
          <div className="min-w-0 pr-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono bg-amber-500 text-slate-950 font-black px-1.5 py-0.5 rounded">
                {asset.asset_number}
              </span>
              <span className="text-[10px] text-slate-300 font-mono">{asset.barcode}</span>
            </div>
            <h2 className="text-base font-extrabold text-white truncate mt-1">{asset.name}</h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onPrintLabel}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-400 transition"
              title="Print Asset Label"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-100 border-b border-slate-200 px-3 flex gap-1 overflow-x-auto shrink-0 scrollbar-none">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2.5 px-3 text-xs font-bold whitespace-nowrap border-b-2 flex items-center gap-1.5 transition ${
                  isActive
                    ? 'border-amber-500 text-slate-900 bg-white shadow-sm'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 text-xs text-slate-700 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Image banner if photo attached */}
              {asset.image_url && (
                <div className="rounded-xl overflow-hidden border border-slate-200 max-h-56 bg-slate-100 flex items-center justify-center">
                  <img src={asset.image_url} alt={asset.name} className="object-cover max-h-56 w-full" />
                </div>
              )}

              {/* Classification Grid */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b pb-1">
                  Institutional Classification & Identity
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Asset Number</span>
                    <span className="font-mono font-bold text-slate-900">{asset.asset_number}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Barcode</span>
                    <span className="font-mono font-bold text-slate-900">{asset.barcode}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Serial Number</span>
                    <span className="font-mono text-slate-800">{asset.serial_number || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Category</span>
                    <span className="font-semibold text-slate-800">{asset.category_name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Model & Brand</span>
                    <span className="text-slate-800">{asset.brand} {asset.model || ''}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Manufacturer</span>
                    <span className="text-slate-800">{asset.manufacturer || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Current Location & Responsibility */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b pb-1">
                  Location, Department & Custody
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Campus</span>
                    <span className="font-semibold text-slate-900">{asset.campus_name || 'Moshi Main Campus'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Building</span>
                    <span className="font-semibold text-slate-900">{asset.building_name || 'Unassigned'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Room / Office</span>
                    <span className="font-semibold text-slate-900">
                      {asset.room_name ? `${asset.room_name} (${asset.room_code})` : 'Unassigned'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Department</span>
                    <span className="font-semibold text-slate-900">{asset.department_name || 'Central Pool'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Responsible Custodian</span>
                    <span className="font-bold text-amber-900">{asset.custodian_name || 'Department Custody'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Date Assigned</span>
                    <span className="text-slate-800">{formatDate(asset.date_assigned)}</span>
                  </div>
                </div>
              </div>

              {/* Financial & Procurement Info */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b pb-1">
                  Financial, Procurement & Valuation
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Acquisition Cost</span>
                    <span className="font-black text-slate-900 text-sm">{formatCurrency(asset.acquisition_cost, asset.currency)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Current Net Book Value</span>
                    <span className="font-black text-emerald-800 text-sm">{formatCurrency(asset.current_book_value, asset.currency)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Residual Value</span>
                    <span className="text-slate-800">{formatCurrency(asset.residual_value, asset.currency)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Funding Source</span>
                    <span className="text-slate-800">{asset.funding_source || 'University Budget'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Purchase Order #</span>
                    <span className="font-mono text-slate-800">{asset.purchase_order_no || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Invoice #</span>
                    <span className="font-mono text-slate-800">{asset.invoice_no || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Supplier</span>
                    <span className="font-semibold text-slate-800">{asset.supplier_name || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Acquisition Date</span>
                    <span className="text-slate-800">{formatDate(asset.acquisition_date)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Useful Life</span>
                    <span className="text-slate-800">{asset.useful_life_years || 5} Years</span>
                  </div>
                </div>
              </div>

              {/* Warranty & Condition */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b pb-1">
                  Condition & Warranty Status
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Physical Condition</span>
                    <span className="font-bold text-slate-900 capitalize">{asset.condition}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Operational Status</span>
                    <span className="font-bold text-slate-900 capitalize">{asset.status?.replace('_', ' ')}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Last Verified Date</span>
                    <span className="text-slate-800">{formatDate(asset.last_verified_at) || 'Unverified'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Warranty Provider</span>
                    <span className="text-slate-800">{asset.warranty_provider || 'None'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Warranty Expiry</span>
                    <span className="font-bold text-slate-900">{formatDate(asset.warranty_expiry_date) || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BARCODE & QR */}
          {activeTab === 'barcode' && (
            <div className="space-y-6 flex flex-col items-center">
              <div className="text-center max-w-md">
                <h3 className="text-sm font-bold text-slate-900">Official Barcode & QR Label</h3>
                <p className="text-[11px] text-slate-500 mt-1">
                  Scannable using dedicated mobile scanner or standard laser/2D scanner guns
                </p>
              </div>

              {/* Rendered Label Preview */}
              <div className="p-4 bg-slate-100 rounded-xl border border-slate-200">
                <AssetLabel asset={asset} size="detailed" />
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={onPrintLabel}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-mocu-navy text-white text-xs font-bold hover:bg-slate-800 transition"
                >
                  <Printer className="w-4 h-4 text-amber-400" />
                  <span>Print Single Label</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: LIFECYCLE TIMELINE */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Chronological Institutional Asset Timeline
              </h3>
              <div className="relative pl-6 border-l-2 border-slate-200 space-y-6 my-4">
                {asset.history?.map((h, i) => (
                  <div key={h.id || i} className="relative">
                    <div className="absolute -left-[31px] top-0 w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-white shadow"></div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{h.title}</span>
                        <span className="text-[10px] text-slate-400">{formatDateTime(h.event_date)}</span>
                      </div>
                      <div className="text-[11px] text-slate-600 mt-1">{h.description}</div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 pt-1 border-t border-slate-200">
                        <span>Actor: {h.performed_by_name || 'System'}</span>
                        {h.to_value && <span className="font-mono bg-white px-1 rounded border">Value: {h.to_value}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: VERIFICATIONS */}
          {activeTab === 'verifications' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Physical Inventory Verification History
              </h3>
              {asset.verifications?.length === 0 ? (
                <div className="p-6 text-center text-slate-400 border border-dashed rounded-lg">
                  No physical verification records yet for this asset.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border rounded-lg overflow-hidden">
                  {asset.verifications?.map(v => (
                    <div key={v.id} className="p-3 bg-white hover:bg-slate-50 transition">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            v.verification_status === 'verified'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {v.verification_status.toUpperCase()}
                          </span>
                          <span className="font-bold text-slate-900">
                            Condition: {v.verified_condition}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400">{formatDateTime(v.verified_at)}</span>
                      </div>
                      <div className="text-[11px] text-slate-600 mt-1">
                        Location: {v.building_name || 'Building'} • {v.room_name || 'Room'}
                      </div>
                      {v.remarks && <div className="text-[11px] text-slate-500 italic mt-0.5">Remarks: {v.remarks}</div>}
                      <div className="text-[10px] text-slate-400 mt-1">Verifier: {v.verifier_name}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: TRANSFERS */}
          {activeTab === 'transfers' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Relocation & Custody Transfers
              </h3>
              {asset.transfers?.length === 0 ? (
                <div className="p-6 text-center text-slate-400 border border-dashed rounded-lg">
                  No transfer records for this asset.
                </div>
              ) : (
                <div className="space-y-3">
                  {asset.transfers?.map(t => (
                    <div key={t.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex justify-between items-center">
                        <span className="font-mono font-bold text-slate-900">{t.transfer_number}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 uppercase">
                          {t.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-700 mt-1">
                        <span className="font-semibold">Reason:</span> {t.reason}
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-200 text-[10px] text-slate-600">
                        <div>From: {t.from_building || 'Building'} ({t.from_dept})</div>
                        <div>To: {t.to_building || 'Building'} ({t.to_dept})</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: MAINTENANCE */}
          {activeTab === 'maintenance' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Maintenance & Repair Work Orders
              </h3>
              {asset.maintenance?.length === 0 ? (
                <div className="p-6 text-center text-slate-400 border border-dashed rounded-lg">
                  No maintenance work orders for this asset.
                </div>
              ) : (
                <div className="space-y-3">
                  {asset.maintenance?.map(m => (
                    <div key={m.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex justify-between items-center">
                        <span className="font-mono font-bold text-slate-900">{m.maintenance_number}</span>
                        <span className="font-bold text-[10px] uppercase bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded">
                          {m.status}
                        </span>
                      </div>
                      <div className="font-semibold text-slate-800 text-[11px] mt-1">{m.issue_reported}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Provider: {m.service_provider || 'MoCU Estates/ICT'}</div>
                      <div className="flex justify-between items-center text-[10px] text-slate-600 mt-2 pt-1 border-t border-slate-200">
                        <span>Cost: {formatCurrency(m.cost)}</span>
                        <span>Date: {formatDate(m.scheduled_date || m.created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 7: DOCUMENTS & ATTACHMENTS */}
          {activeTab === 'documents' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Attached Invoices, Warranties & Photos
                </h3>
                <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-mocu-navy hover:bg-slate-800 text-white text-xs font-bold cursor-pointer transition">
                  <Upload className="w-3.5 h-3.5 text-amber-400" />
                  <span>{uploading ? 'Uploading...' : 'Attach File'}</span>
                  <input type="file" onChange={handleFileUpload} className="hidden" disabled={uploading} />
                </label>
              </div>

              {asset.documents?.length === 0 ? (
                <div className="p-6 text-center text-slate-400 border border-dashed rounded-lg">
                  No documents attached yet. Click 'Attach File' to upload invoices, delivery notes, or inspection photos.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border rounded-lg overflow-hidden">
                  {asset.documents?.map(doc => (
                    <div key={doc.id} className="p-3 bg-white hover:bg-slate-50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                        <div>
                          <div className="font-bold text-slate-900">{doc.file_name}</div>
                          <div className="text-[10px] text-slate-400">{doc.document_type} • Uploaded by {doc.uploaded_by_name}</div>
                        </div>
                      </div>
                      <a
                        href={doc.file_path}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-amber-700 hover:underline font-bold"
                      >
                        View / Download
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 8: DEPRECIATION SCHEDULE */}
          {activeTab === 'depreciation' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Calculated Depreciation Schedule ({asset.depreciation_method || 'Straight-Line'})
              </h3>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs divide-y divide-slate-200">
                  <thead className="bg-slate-50 font-bold text-slate-600">
                    <tr>
                      <th className="p-2.5">Financial Year</th>
                      <th className="p-2.5 text-right">Opening Value</th>
                      <th className="p-2.5 text-right">Depreciation</th>
                      <th className="p-2.5 text-right">Closing Value</th>
                      <th className="p-2.5 text-right">Accumulated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {asset.depreciationSchedule?.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="p-2.5 font-semibold">{row.financial_year}</td>
                        <td className="p-2.5 text-right">{formatCurrency(row.opening_value)}</td>
                        <td className="p-2.5 text-right text-rose-700 font-semibold">{formatCurrency(row.depreciation)}</td>
                        <td className="p-2.5 text-right font-bold text-emerald-800">{formatCurrency(row.closing_value)}</td>
                        <td className="p-2.5 text-right text-slate-500">{formatCurrency(row.accumulated)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// Subcomponent: Register New Asset Modal
// -------------------------------------------------------------
function RegisterAssetModal({ categories, departments, buildings, staffList, suppliers, onClose, onSuccess }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    category_id: categories[0]?.id || 1,
    asset_type: '',
    serial_number: '',
    model: '',
    manufacturer: '',
    brand: '',
    campus_id: 1,
    building_id: buildings[0]?.id || 1,
    room_id: '',
    department_id: departments[0]?.id || 1,
    custodian_id: '',
    acquisition_cost: '',
    currency: 'TZS',
    funding_source: 'MoCU Operating Fund',
    purchase_order_no: '',
    invoice_no: '',
    supplier_id: '',
    useful_life_years: 5,
    warranty_provider: '',
    warranty_expiry_date: '',
    condition: 'new',
    status: 'active',
    remarks: ''
  });

  const [buildingRooms, setBuildingRooms] = useState([]);

  useEffect(() => {
    if (formData.building_id) {
      api.get(`/api/v1/rooms?building_id=${formData.building_id}`)
        .then(res => {
          if (res.success) setBuildingRooms(res.rooms || []);
        })
        .catch(console.error);
    }
  }, [formData.building_id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!formData.name.trim()) {
      setError('Asset name is required.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/api/v1/assets', formData);
      if (res.success) {
        onSuccess(res.asset);
      }
    } catch (err) {
      setError(err.message || 'Asset registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-scale-up">
        <div className="bg-mocu-navy text-white p-4 flex items-center justify-between border-b border-mocu-navyLight">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wide">Register New Institutional Asset</h2>
            <p className="text-[11px] text-amber-300">Automatic Asset ID & Code 128 Barcode will be generated</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg font-semibold">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">Asset Name *</label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Dell Latitude 5540 Enterprise Laptop"
                className="w-full p-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Asset Category *</label>
              <select
                name="category_id"
                value={formData.category_id}
                onChange={handleChange}
                className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Asset Type / Classification</label>
              <input
                type="text"
                name="asset_type"
                value={formData.asset_type}
                onChange={handleChange}
                placeholder="e.g. Laptop, Server, Desk, Vehicle"
                className="w-full p-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Serial Number</label>
              <input
                type="text"
                name="serial_number"
                value={formData.serial_number}
                onChange={handleChange}
                placeholder="Manufacturer serial no."
                className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Model & Brand</label>
              <input
                type="text"
                name="model"
                value={formData.model}
                onChange={handleChange}
                placeholder="e.g. Latitude 5540 / Dell"
                className="w-full p-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            {/* Location & Responsibility */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Building</label>
              <select
                name="building_id"
                value={formData.building_id}
                onChange={handleChange}
                className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
              >
                {buildings.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Room / Office</label>
              <select
                name="room_id"
                value={formData.room_id}
                onChange={handleChange}
                className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
              >
                <option value="">Select Room...</option>
                {buildingRooms.map(r => (
                  <option key={r.id} value={r.id}>{r.room_name} ({r.room_code})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Department</label>
              <select
                name="department_id"
                value={formData.department_id}
                onChange={handleChange}
                className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
              >
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Custodian Staff</label>
              <select
                name="custodian_id"
                value={formData.custodian_id}
                onChange={handleChange}
                className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
              >
                <option value="">Select Custodian...</option>
                {staffList.map(s => (
                  <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.staff_id})</option>
                ))}
              </select>
            </div>

            {/* Financial */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Acquisition Cost (TZS)</label>
              <input
                type="number"
                name="acquisition_cost"
                value={formData.acquisition_cost}
                onChange={handleChange}
                placeholder="e.g. 3500000"
                className="w-full p-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Supplier</label>
              <select
                name="supplier_id"
                value={formData.supplier_id}
                onChange={handleChange}
                className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
              >
                <option value="">Select Vendor...</option>
                {suppliers.map(sp => (
                  <option key={sp.id} value={sp.id}>{sp.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Initial Condition</label>
              <select
                name="condition"
                value={formData.condition}
                onChange={handleChange}
                className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
              >
                <option value="new">New</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Warranty Expiry Date</label>
              <input
                type="date"
                name="warranty_expiry_date"
                value={formData.warranty_expiry_date}
                onChange={handleChange}
                className="w-full p-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg font-bold shadow disabled:opacity-50"
            >
              {submitting ? 'Generating Barcode & Registering...' : 'Register Asset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// Subcomponent: Barcode & Label Print Modal
// -------------------------------------------------------------
function PrintLabelsModal({ assets, size, setSize, onClose }) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-scale-up">
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800 no-print">
          <div>
            <h2 className="text-sm font-bold flex items-center gap-2">
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Asset Barcode Label Printing Studio</span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Ready to print {assets.length} official MoCU asset label{assets.length > 1 ? 's' : ''}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg text-xs">
              <button
                onClick={() => setSize('compact')}
                className={`px-2 py-1 rounded ${size === 'compact' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300'}`}
              >
                Compact (40x20mm)
              </button>
              <button
                onClick={() => setSize('standard')}
                className={`px-2 py-1 rounded ${size === 'standard' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300'}`}
              >
                Standard (50x30mm)
              </button>
              <button
                onClick={() => setSize('detailed')}
                className={`px-2 py-1 rounded ${size === 'detailed' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300'}`}
              >
                Detailed (70x45mm)
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-lg shadow transition flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Labels</span>
            </button>

            <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Labels Canvas */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100 flex flex-wrap gap-4 justify-center printable-area">
          {assets.map(asset => (
            <AssetLabel key={asset.id} asset={asset} size={size} />
          ))}
        </div>
      </div>
    </div>
  );
}
