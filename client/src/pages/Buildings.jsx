import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNotify } from '../context/NotificationContext';
import { formatCurrency } from '../utils/formatters';
import {
  Building, MapPin, Plus, DoorOpen, Package, DollarSign,
  CheckCircle2, X, AlertTriangle, Layers, Eye
} from 'lucide-react';

export default function Buildings({ onSelectAsset }) {
  const { can } = useAuth();
  const notify = useNotify();

  const [buildings, setBuildings] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals & Details
  const [selectedBuildingDetail, setSelectedBuildingDetail] = useState(null);
  const [buildingSummary, setBuildingSummary] = useState(null);
  const [buildingAssets, setBuildingAssets] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadBuildings();
  }, []);

  const loadBuildings = async () => {
    setLoading(true);
    try {
      const [bRes, cRes] = await Promise.all([
        api.get('/api/v1/buildings'),
        api.get('/api/v1/campuses')
      ]);
      if (bRes.success) setBuildings(bRes.buildings || []);
      if (cRes.success) setCampuses(cRes.campuses || []);
    } catch (e) {
      notify.error('Failed to load buildings');
    } finally {
      setLoading(false);
    }
  };

  const openBuildingDetail = async (id) => {
    try {
      const [bRes, sRes, aRes] = await Promise.all([
        api.get(`/api/v1/buildings/${id}`),
        api.get(`/api/v1/buildings/${id}/summary`),
        api.get(`/api/v1/buildings/${id}/assets`)
      ]);
      if (bRes.success) setSelectedBuildingDetail(bRes.building);
      if (sRes.success) setBuildingSummary(sRes.stats);
      if (aRes.success) setBuildingAssets(aRes.assets || []);
    } catch (e) {
      notify.error('Failed to load building summary');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            Building Management & Physical Facilities
          </h1>
          <p className="text-xs text-slate-500">
            University administration complexes, academic halls, labs, libraries, and hostels
          </p>
        </div>

        {can('locations:manage') && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Building</span>
          </button>
        )}
      </div>

      {/* Buildings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {buildings.map(bld => (
          <div
            key={bld.id}
            className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition overflow-hidden flex flex-col justify-between"
          >
            <div className="p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded border">
                    {bld.code}
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900 mt-1">{bld.name}</h3>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    <span>{bld.campus_name || 'Moshi Main Campus'}</span>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${bld.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                  {bld.status}
                </span>
              </div>

              <p className="text-xs text-slate-600 line-clamp-2">
                {bld.description || 'Institutional facility housing academic and administrative services.'}
              </p>

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-center">
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <div className="text-xs font-bold text-slate-500">Floors</div>
                  <div className="text-sm font-black text-slate-900">{bld.floors_count}</div>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <div className="text-xs font-bold text-slate-500">Rooms</div>
                  <div className="text-sm font-black text-slate-900">{bld.rooms_count || 0}</div>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <div className="text-xs font-bold text-slate-500">Assets</div>
                  <div className="text-sm font-black text-amber-700">{bld.assets_count || 0}</div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Asset Value</div>
                <div className="text-xs font-black text-slate-900">{formatCurrency(bld.total_asset_value)}</div>
              </div>
              <button
                onClick={() => openBuildingDetail(bld.id)}
                className="px-3 py-1.5 rounded-lg bg-mocu-navy hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              >
                <Eye className="w-3.5 h-3.5 text-amber-400" />
                <span>Building Summary</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Building Details Modal / Summary */}
      {selectedBuildingDetail && buildingSummary && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-scale-up">
            <div className="bg-mocu-navy text-white p-4 flex items-center justify-between border-b border-mocu-navyLight">
              <div>
                <span className="text-[10px] font-mono bg-amber-500 text-slate-950 font-black px-1.5 py-0.5 rounded">
                  {selectedBuildingDetail.code}
                </span>
                <h2 className="text-base font-extrabold text-white mt-1">{selectedBuildingDetail.name}</h2>
                <div className="text-[11px] text-slate-300">
                  {selectedBuildingDetail.campus_name} • {selectedBuildingDetail.floors_count} Floors • {selectedBuildingDetail.rooms?.length || 0} Rooms
                </div>
              </div>
              <button onClick={() => setSelectedBuildingDetail(null)} className="p-1 rounded text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-700">
              {/* Financial & Physical Breakdown */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Total Assets</div>
                  <div className="text-xl font-black text-slate-900">{buildingSummary.total_assets}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Total Asset Value</div>
                  <div className="text-lg font-black text-emerald-800">{formatCurrency(buildingSummary.total_cost)}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Physical Verified</div>
                  <div className="text-xl font-black text-emerald-600">{buildingSummary.verified_count}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Unverified / Pending</div>
                  <div className="text-xl font-black text-amber-600">{buildingSummary.unverified_count}</div>
                </div>
              </div>

              {/* Condition breakdown */}
              <div className="p-4 bg-slate-50 rounded-xl border space-y-2">
                <h4 className="font-bold text-slate-800 uppercase text-[10px] tracking-wider">
                  Condition Breakdown Within {selectedBuildingDetail.name}
                </h4>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
                  <div className="p-2 rounded bg-white border font-bold">Good: {buildingSummary.good_count || 0}</div>
                  <div className="p-2 rounded bg-white border font-bold">New: {buildingSummary.new_count || 0}</div>
                  <div className="p-2 rounded bg-white border font-bold">Fair: {buildingSummary.fair_count || 0}</div>
                  <div className="p-2 rounded bg-white border font-bold">Poor: {buildingSummary.poor_count || 0}</div>
                  <div className="p-2 rounded bg-white border font-bold text-rose-700">Damaged: {buildingSummary.damaged_count || 0}</div>
                  <div className="p-2 rounded bg-white border font-bold text-purple-700">Obsolete: {buildingSummary.obsolete_count || 0}</div>
                </div>
              </div>

              {/* Rooms in building */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  Offices, Laboratories & Rooms in this Building
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {selectedBuildingDetail.rooms?.map(rm => (
                    <div key={rm.id} className="p-3 rounded-lg border border-slate-200 bg-white flex justify-between items-center">
                      <div>
                        <div className="font-bold text-slate-900">{rm.room_name}</div>
                        <div className="text-[11px] font-mono text-slate-500">{rm.room_code} • {rm.location_type}</div>
                        <div className="text-[10px] text-slate-400">Responsible: {rm.responsible_staff_name || 'Staff In-Charge'}</div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          {rm.assets_count || 0} assets
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Assets List */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  Assets Assigned to {selectedBuildingDetail.name} ({buildingAssets.length})
                </h4>
                <div className="divide-y divide-slate-100 border rounded-lg overflow-hidden">
                  {buildingAssets.map(a => (
                    <div key={a.id} className="p-2.5 bg-white hover:bg-slate-50 flex items-center justify-between">
                      <div>
                        <span className="font-mono font-bold text-amber-800">{a.asset_number}: </span>
                        <span className="font-bold text-slate-900">{a.name}</span>
                        <div className="text-[10px] text-slate-400">Room: {a.room_name || 'Unassigned'} • Custodian: {a.custodian_name || 'Dept.'}</div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-slate-900">{formatCurrency(a.acquisition_cost)}</span>
                        <span className="block text-[10px] text-slate-500 capitalize">{a.condition}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Building Modal */}
      {showAddModal && (
        <AddBuildingModal
          campuses={campuses}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            notify.success('Building created successfully!');
            loadBuildings();
          }}
        />
      )}
    </div>
  );
}

function AddBuildingModal({ campuses, onClose, onSuccess }) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [campusId, setCampusId] = useState(campuses[0]?.id || 1);
  const [floorsCount, setFloorsCount] = useState(3);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!code || !name) {
      setError('Building code and name are required.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/api/v1/buildings', {
        code,
        name,
        campus_id: campusId,
        floors_count: floorsCount,
        description
      });
      if (res.success) onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to create building');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
        <div className="flex justify-between items-center border-b pb-2">
          <h3 className="text-sm font-bold text-slate-900">Add New University Building</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400" /></button>
        </div>

        {error && <div className="p-2 bg-rose-50 text-rose-800 text-xs rounded">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Building Code *</label>
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. MCB, ICT-C, LAB-2"
              className="w-full p-2 border rounded font-mono uppercase"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Building Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Main Administration Building"
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Campus</label>
            <select
              value={campusId}
              onChange={(e) => setCampusId(e.target.value)}
              className="w-full p-2 border rounded bg-white"
            >
              {campuses.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Total Floors</label>
            <input
              type="number"
              min="1"
              max="20"
              value={floorsCount}
              onChange={(e) => setFloorsCount(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full p-2 border rounded"
            />
          </div>

          <div className="pt-3 border-t flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-3 py-1.5 border rounded">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-1.5 bg-amber-500 text-slate-950 font-bold rounded">
              {submitting ? 'Creating...' : 'Create Building'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
