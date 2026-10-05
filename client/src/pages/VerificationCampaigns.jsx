import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNotify } from '../context/NotificationContext';
import { formatDate, getConditionBadge } from '../utils/formatters';
import {
  CheckCircle2, AlertTriangle, AlertCircle, Plus,
  Smartphone, Calendar, Building, MapPin, Eye, X, RefreshCw
} from 'lucide-react';

export default function VerificationCampaigns({ onOpenMobileScanner }) {
  const { can } = useAuth();
  const notify = useNotify();

  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  // Missing Assets Drawer
  const [selectedCampaignForMissing, setSelectedCampaignForMissing] = useState(null);
  const [missingAssets, setMissingAssets] = useState([]);
  const [loadingMissing, setLoadingMissing] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [campuses, setCampuses] = useState([]);
  const [departments, setDepartments] = useState([]);

  const loadCampaigns = async () => {
    setLoading(true);
    try {
      const [cRes, campRes, deptRes] = await Promise.all([
        api.get('/api/v1/verifications/campaigns'),
        api.get('/api/v1/campuses'),
        api.get('/api/v1/departments')
      ]);
      if (cRes.success) setCampaigns(cRes.campaigns || []);
      if (campRes.success) setCampuses(campRes.campuses || []);
      if (deptRes.success) setDepartments(deptRes.departments || []);
    } catch (e) {
      notify.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  const openMissingAssets = async (campaign) => {
    setSelectedCampaignForMissing(campaign);
    setLoadingMissing(true);
    try {
      const res = await api.get(`/api/v1/verifications/campaigns/${campaign.id}/missing`);
      if (res.success) {
        setMissingAssets(res.assets || []);
      }
    } catch (e) {
      notify.error('Failed to load missing assets');
    } finally {
      setLoadingMissing(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            Asset Verification Campaigns & Physical Audits
          </h1>
          <p className="text-xs text-slate-500">
            Periodic institutional physical inventory audits, missing asset detection, and location mismatch reconciliation
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenMobileScanner}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold shadow-sm transition"
          >
            <Smartphone className="w-4 h-4" />
            <span>Launch Mobile Scanner</span>
          </button>

          {can('verification:manage') && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Create Campaign</span>
            </button>
          )}
        </div>
      </div>

      {/* Campaigns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {campaigns.map(camp => {
          const st = camp.stats || {};
          const isCompleted = camp.status === 'completed';

          return (
            <div
              key={camp.id}
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4 hover:shadow-md transition flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded border border-amber-300">
                    {camp.campaign_code}
                  </span>
                  <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                    isCompleted ? 'bg-slate-100 text-slate-600' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {camp.status?.replace('_', ' ')}
                  </span>
                </div>

                <h3 className="text-base font-extrabold text-slate-900 leading-tight">{camp.title}</h3>
                <p className="text-xs text-slate-600 line-clamp-2">{camp.description || 'Physical audit exercise'}</p>

                <div className="text-[11px] text-slate-500 flex items-center gap-3 pt-1">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{formatDate(camp.start_date)} - {formatDate(camp.end_date)}</span>
                  </span>
                  <span>•</span>
                  <span>Scope: {camp.department_name || camp.campus_name || 'All Campuses & Units'}</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1.5 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-700">Verification Progress</span>
                  <span className="text-amber-600 font-black">{st.completionPct || 0}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-amber-500 to-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${st.completionPct || 0}%` }}
                  ></div>
                </div>
              </div>

              {/* Real-time stats grid */}
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2 rounded bg-slate-50 border">
                  <div className="text-[9px] uppercase font-bold text-slate-400">Expected</div>
                  <div className="text-base font-black text-slate-900">{st.expected || 0}</div>
                </div>
                <div className="p-2 rounded bg-slate-50 border">
                  <div className="text-[9px] uppercase font-bold text-slate-400">Scanned</div>
                  <div className="text-base font-black text-blue-700">{st.scanned || 0}</div>
                </div>
                <div className="p-2 rounded bg-slate-50 border">
                  <div className="text-[9px] uppercase font-bold text-slate-400">Verified In-Place</div>
                  <div className="text-base font-black text-emerald-700">{st.verified || 0}</div>
                </div>
                <div className="p-2 rounded bg-rose-50 border border-rose-200">
                  <div className="text-[9px] uppercase font-bold text-rose-700">Missing</div>
                  <div className="text-base font-black text-rose-700">{st.missing || 0}</div>
                </div>
              </div>

              {/* Mismatch detection indicator */}
              {(st.mismatched > 0 || st.conditionChanged > 0) && (
                <div className="p-2 rounded bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-center justify-between">
                  <span className="flex items-center gap-1 font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Audit Flags: {st.mismatched} location mismatches • {st.conditionChanged} condition changes</span>
                  </span>
                </div>
              )}

              {/* Action */}
              <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
                <button
                  onClick={() => openMissingAssets(camp)}
                  className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 font-bold text-xs rounded-lg transition flex items-center gap-1.5"
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>View Missing Assets ({st.missing || 0})</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Missing Assets Modal */}
      {selectedCampaignForMissing && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-scale-up">
            <div className="bg-rose-950 text-white p-4 flex items-center justify-between border-b border-rose-900">
              <div>
                <span className="text-[10px] font-mono bg-rose-600 text-white font-bold px-1.5 py-0.5 rounded">
                  MISSING ASSETS DETECTION
                </span>
                <h3 className="text-sm font-black text-white mt-1">
                  Expected Assets Not Yet Physically Scanned
                </h3>
                <div className="text-[11px] text-rose-200">
                  Campaign: {selectedCampaignForMissing.title} ({missingAssets.length} assets unverified)
                </div>
              </div>
              <button onClick={() => setSelectedCampaignForMissing(null)} className="p-1 rounded text-rose-300 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              {loadingMissing ? (
                <div className="text-center p-8 text-slate-500">Checking physical scan logs...</div>
              ) : missingAssets.length === 0 ? (
                <div className="p-8 text-center text-emerald-700 bg-emerald-50 rounded-xl border border-emerald-200 font-bold">
                  All expected institutional assets have been verified in this campaign!
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border rounded-lg overflow-hidden">
                  {missingAssets.map(a => (
                    <div key={a.id} className="p-3 bg-white hover:bg-slate-50 flex items-center justify-between">
                      <div>
                        <span className="font-mono font-bold text-rose-800">{a.asset_number}: </span>
                        <span className="font-bold text-slate-900">{a.name}</span>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Designated: {a.building_name || 'Building'} ({a.room_name || 'Room'}) • Custodian: {a.custodian_name || 'Dept. Pool'}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-bold text-slate-700">
                          {a.barcode}
                        </span>
                        <div className="text-[10px] text-rose-600 font-bold mt-0.5">NOT SCANNED</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Campaign Modal */}
      {showAddModal && (
        <AddCampaignModal
          campuses={campuses}
          departments={departments}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            notify.success('Campaign created successfully!');
            loadCampaigns();
          }}
        />
      )}
    </div>
  );
}

function AddCampaignModal({ campuses, departments, onClose, onSuccess }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
  const [campusId, setCampusId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !startDate || !endDate) {
      setError('Title, start date and end date are required.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/api/v1/verifications/campaigns', {
        title,
        description,
        start_date: startDate,
        end_date: endDate,
        campus_id: campusId || null,
        department_id: departmentId || null
      });
      if (res.success) onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to create campaign');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
        <div className="flex justify-between items-center border-b pb-2">
          <h3 className="text-sm font-bold text-slate-900">Create Verification Campaign</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400" /></button>
        </div>

        {error && <div className="p-2 bg-rose-50 text-rose-800 text-xs rounded">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Campaign Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 2026 Annual Asset Verification"
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Scope and purpose of audit..."
              rows={2}
              className="w-full p-2 border rounded"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Start Date *</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">End Date *</label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full p-2 border rounded"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Campus Scope</label>
            <select value={campusId} onChange={(e) => setCampusId(e.target.value)} className="w-full p-2 border rounded bg-white">
              <option value="">All Campuses</option>
              {campuses.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Department Scope</label>
            <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="w-full p-2 border rounded bg-white">
              <option value="">All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className="pt-3 border-t flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-3 py-1.5 border rounded">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-1.5 bg-amber-500 text-slate-950 font-bold rounded">
              {submitting ? 'Creating...' : 'Create Campaign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
