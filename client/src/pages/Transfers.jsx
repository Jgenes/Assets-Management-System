import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNotify } from '../context/NotificationContext';
import { formatDate } from '../utils/formatters';
import {
  ArrowRightLeft, Plus, CheckCircle2, XCircle, Clock,
  Building, User, X, Check
} from 'lucide-react';

export default function Transfers() {
  const { user, can } = useAuth();
  const notify = useNotify();

  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Reference data for modals
  const [assets, setAssets] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [staffList, setStaffList] = useState([]);

  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedTransferForApproval, setSelectedTransferForApproval] = useState(null);

  const loadTransfers = async () => {
    setLoading(true);
    try {
      const [tRes, aRes, bRes, dRes, sRes] = await Promise.all([
        api.get('/api/v1/transfers'),
        api.get('/api/v1/assets', { limit: 150 }),
        api.get('/api/v1/buildings'),
        api.get('/api/v1/departments'),
        api.get('/api/v1/staff')
      ]);
      if (tRes.success) setTransfers(tRes.transfers || []);
      if (aRes.success) setAssets(aRes.data || []);
      if (bRes.success) setBuildings(bRes.buildings || []);
      if (dRes.success) setDepartments(dRes.departments || []);
      if (sRes.success) setStaffList(sRes.staff || []);
    } catch (e) {
      notify.error('Failed to load transfers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransfers();
  }, []);

  const handleApprove = async (transferId, comments) => {
    try {
      const res = await api.put(`/api/v1/transfers/${transferId}/approve`, { comments });
      if (res.success) {
        notify.success('Transfer approved and official location updated!');
        setSelectedTransferForApproval(null);
        loadTransfers();
      }
    } catch (err) {
      notify.error(err.message || 'Transfer approval failed');
    }
  };

  const handleReject = async (transferId, comments) => {
    try {
      const res = await api.put(`/api/v1/transfers/${transferId}/reject`, { comments });
      if (res.success) {
        notify.info('Transfer rejected');
        setSelectedTransferForApproval(null);
        loadTransfers();
      }
    } catch (err) {
      notify.error(err.message || 'Transfer rejection failed');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            Asset Transfer & Relocation Management
          </h1>
          <p className="text-xs text-slate-500">
            Controlled inter-departmental transfers, location changes, and custodian handover workflow
          </p>
        </div>

        <button
          onClick={() => setShowRequestModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>Request Asset Transfer</span>
        </button>
      </div>

      {/* Transfers Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs divide-y divide-slate-200">
          <thead className="bg-slate-50 font-bold text-slate-600 uppercase tracking-wider text-[10px]">
            <tr>
              <th className="p-3">Transfer #</th>
              <th className="p-3">Asset Details</th>
              <th className="p-3">From Location / Dept</th>
              <th className="p-3">To Location / Dept</th>
              <th className="p-3">Requested By & Date</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {transfers.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400">
                  No asset transfer requests found.
                </td>
              </tr>
            ) : (
              transfers.map(t => {
                const isPending = t.status === 'pending_approval';
                const isCompleted = t.status === 'completed';

                return (
                  <tr key={t.id} className="hover:bg-slate-50 transition">
                    <td className="p-3 font-mono font-bold text-slate-900">{t.transfer_number}</td>

                    <td className="p-3">
                      <div className="font-bold text-slate-900">{t.asset_name}</div>
                      <div className="text-[10px] font-mono text-amber-800">{t.asset_number}</div>
                    </td>

                    <td className="p-3">
                      <div className="font-semibold text-slate-800">{t.from_building_name || 'Building'}</div>
                      <div className="text-[10px] text-slate-500">{t.from_department_name} • {t.from_custodian_name || 'Dept. Pool'}</div>
                    </td>

                    <td className="p-3">
                      <div className="font-bold text-emerald-800">{t.to_building_name || 'Building'}</div>
                      <div className="text-[10px] text-slate-600">{t.to_department_name} • {t.to_custodian_name || 'Dept. Pool'}</div>
                    </td>

                    <td className="p-3">
                      <div className="font-semibold text-slate-800">{t.requested_by_name}</div>
                      <div className="text-[10px] text-slate-400">{formatDate(t.transfer_date)}</div>
                    </td>

                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        isPending ? 'bg-amber-100 text-amber-900' : isCompleted ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {t.status?.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="p-3 text-center">
                      {isPending && (
                        <button
                          onClick={() => setSelectedTransferForApproval(t)}
                          className="px-2.5 py-1 bg-mocu-navy hover:bg-slate-800 text-white rounded text-[11px] font-bold shadow-sm"
                        >
                          Review & Action
                        </button>
                      )}
                      {!isPending && (
                        <span className="text-[10px] text-slate-400">
                          {t.approved_by_name ? `By ${t.approved_by_name}` : 'Closed'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Request Transfer Modal */}
      {showRequestModal && (
        <RequestTransferModal
          assets={assets}
          buildings={buildings}
          departments={departments}
          staffList={staffList}
          onClose={() => setShowRequestModal(false)}
          onSuccess={() => {
            setShowRequestModal(false);
            notify.success('Transfer request submitted!');
            loadTransfers();
          }}
        />
      )}

      {/* Review & Action Transfer Modal */}
      {selectedTransferForApproval && (
        <ApprovalModal
          transfer={selectedTransferForApproval}
          onApprove={(comments) => handleApprove(selectedTransferForApproval.id, comments)}
          onReject={(comments) => handleReject(selectedTransferForApproval.id, comments)}
          onClose={() => setSelectedTransferForApproval(null)}
        />
      )}
    </div>
  );
}

function RequestTransferModal({ assets, buildings, departments, staffList, onClose, onSuccess }) {
  const [assetId, setAssetId] = useState(assets[0]?.id || '');
  const [toBuildingId, setToBuildingId] = useState(buildings[0]?.id || '');
  const [toDepartmentId, setToDepartmentId] = useState(departments[0]?.id || '');
  const [toCustodianId, setToCustodianId] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!assetId || !reason.trim()) {
      setError('Please select an asset and state the transfer reason.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/api/v1/transfers', {
        asset_id: assetId,
        to_building_id: toBuildingId,
        to_department_id: toDepartmentId,
        to_custodian_id: toCustodianId || null,
        reason
      });
      if (res.success) onSuccess();
    } catch (err) {
      setError(err.message || 'Transfer submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
        <div className="flex justify-between items-center border-b pb-2">
          <h3 className="text-sm font-bold text-slate-900">Initiate Asset Transfer Request</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400" /></button>
        </div>

        {error && <div className="p-2 bg-rose-50 text-rose-800 text-xs rounded">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Select Asset to Transfer *</label>
            <select
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              className="w-full p-2 border rounded bg-white font-mono"
            >
              {assets.map(a => (
                <option key={a.id} value={a.id}>{a.asset_number} — {a.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Destination Building *</label>
            <select
              value={toBuildingId}
              onChange={(e) => setToBuildingId(e.target.value)}
              className="w-full p-2 border rounded bg-white"
            >
              {buildings.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Destination Department *</label>
            <select
              value={toDepartmentId}
              onChange={(e) => setToDepartmentId(e.target.value)}
              className="w-full p-2 border rounded bg-white"
            >
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">New Custodian (Staff Member)</label>
            <select
              value={toCustodianId}
              onChange={(e) => setToCustodianId(e.target.value)}
              className="w-full p-2 border rounded bg-white"
            >
              <option value="">Department Pool (Unassigned)</option>
              {staffList.map(s => (
                <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Reason for Transfer *</label>
            <textarea
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Relocating to new finance wing for improved operations..."
              rows={2}
              className="w-full p-2 border rounded"
            />
          </div>

          <div className="pt-3 border-t flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-3 py-1.5 border rounded">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-1.5 bg-amber-500 text-slate-950 font-bold rounded">
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ApprovalModal({ transfer, onApprove, onReject, onClose }) {
  const [comments, setComments] = useState('');

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
        <div className="flex justify-between items-center border-b pb-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Review Transfer Request</h3>
            <span className="font-mono text-xs text-amber-800 font-bold">{transfer.transfer_number}</span>
          </div>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400" /></button>
        </div>

        <div className="space-y-2 text-xs bg-slate-50 p-3 rounded-lg border">
          <div><span className="font-bold">Asset:</span> {transfer.asset_name} ({transfer.asset_number})</div>
          <div><span className="font-bold">From:</span> {transfer.from_building_name} ({transfer.from_department_name})</div>
          <div><span className="font-bold">To:</span> {transfer.to_building_name} ({transfer.to_department_name})</div>
          <div><span className="font-bold">Reason:</span> {transfer.reason}</div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Approval Comments / Note</label>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Official authorization comments..."
            rows={2}
            className="w-full p-2 border rounded text-xs"
          />
        </div>

        <div className="flex justify-between pt-2 border-t text-xs">
          <button
            type="button"
            onClick={() => onReject(comments)}
            className="px-3.5 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded font-bold border border-rose-200"
          >
            Reject Request
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-3 py-1.5 border rounded">Cancel</button>
            <button
              type="button"
              onClick={() => onApprove(comments)}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold shadow"
            >
              Approve & Relocate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
