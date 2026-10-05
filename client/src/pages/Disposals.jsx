import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNotify } from '../context/NotificationContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import { Trash2, Plus, CheckCircle2, ShieldCheck, DollarSign, X } from 'lucide-react';

export default function Disposals() {
  const { user, can } = useAuth();
  const notify = useNotify();

  const [disposals, setDisposals] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedDisposalForAction, setSelectedDisposalForAction] = useState(null);

  const loadDisposals = async () => {
    setLoading(true);
    try {
      const [dRes, aRes] = await Promise.all([
        api.get('/api/v1/disposals'),
        api.get('/api/v1/assets', { limit: 150 })
      ]);
      if (dRes.success) setDisposals(dRes.disposals || []);
      if (aRes.success) setAssets(aRes.data?.filter(a => a.status !== 'disposed') || []);
    } catch (e) {
      notify.error('Failed to load disposals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDisposals();
  }, []);

  const handleApproveDisposal = async (disposalId, data) => {
    try {
      const res = await api.put(`/api/v1/disposals/${disposalId}/approve`, data);
      if (res.success) {
        notify.success('Disposal approved by authority!');
        setSelectedDisposalForAction(null);
        loadDisposals();
      }
    } catch (err) {
      notify.error(err.message || 'Approval failed');
    }
  };

  const handleCompleteDisposal = async (disposalId, data) => {
    try {
      const res = await api.put(`/api/v1/disposals/${disposalId}/complete`, data);
      if (res.success) {
        notify.success('Asset marked as DISPOSED. Historical audit records preserved.');
        setSelectedDisposalForAction(null);
        loadDisposals();
      }
    } catch (err) {
      notify.error(err.message || 'Execution failed');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            Controlled Asset Disposal Management
          </h1>
          <p className="text-xs text-slate-500">
            Public auctions, scrapping, institutional write-offs, and compliance board resolutions
          </p>
        </div>

        <button
          onClick={() => setShowRequestModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>Request Disposal</span>
        </button>
      </div>

      {/* Disposals Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs divide-y divide-slate-200">
          <thead className="bg-slate-50 font-bold text-slate-600 uppercase tracking-wider text-[10px]">
            <tr>
              <th className="p-3">Disposal #</th>
              <th className="p-3">Asset Details</th>
              <th className="p-3">Method & Reason</th>
              <th className="p-3">Board Approval Ref</th>
              <th className="p-3 text-right">Disposal Value</th>
              <th className="p-3">Buyer / Recipient</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {disposals.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-400">
                  No asset disposal records found.
                </td>
              </tr>
            ) : (
              disposals.map(d => {
                const isDisposed = d.status === 'disposed';
                const isApproved = d.status === 'approved';

                return (
                  <tr key={d.id} className="hover:bg-slate-50 transition">
                    <td className="p-3 font-mono font-bold text-slate-900">{d.disposal_number}</td>

                    <td className="p-3">
                      <div className="font-bold text-slate-900">{d.asset_name}</div>
                      <div className="font-mono text-[10px] text-amber-800">{d.asset_number}</div>
                    </td>

                    <td className="p-3">
                      <span className="font-semibold text-slate-800 capitalize">{d.disposal_method?.replace('_', ' ')}</span>
                      <span className="block text-[10px] text-slate-500 capitalize">{d.reason?.replace('_', ' ')}</span>
                    </td>

                    <td className="p-3 font-mono text-slate-700">
                      {d.committee_approval_ref || 'Pending Board Resolution'}
                    </td>

                    <td className="p-3 text-right font-black text-slate-900">
                      {formatCurrency(d.disposal_value)}
                    </td>

                    <td className="p-3 text-slate-700">{d.buyer_recipient || 'Pending Sale / Disposal'}</td>

                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        isDisposed
                          ? 'bg-slate-200 text-slate-700'
                          : isApproved
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-900'
                      }`}>
                        {d.status?.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="p-3 text-center">
                      {!isDisposed && (
                        <button
                          onClick={() => setSelectedDisposalForAction(d)}
                          className="px-2.5 py-1 bg-mocu-navy hover:bg-slate-800 text-white rounded text-[11px] font-bold shadow-sm"
                        >
                          {isApproved ? 'Finalize Disposal' : 'Review & Approve'}
                        </button>
                      )}
                      {isDisposed && (
                        <span className="text-[10px] text-slate-400 font-semibold">
                          Historical Record Kept
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

      {/* Request Disposal Modal */}
      {showRequestModal && (
        <RequestDisposalModal
          assets={assets}
          onClose={() => setShowRequestModal(false)}
          onSuccess={() => {
            setShowRequestModal(false);
            notify.success('Disposal request initiated!');
            loadDisposals();
          }}
        />
      )}

      {/* Action / Finalize Disposal Modal */}
      {selectedDisposalForAction && (
        <ActionDisposalModal
          disposal={selectedDisposalForAction}
          onClose={() => setSelectedDisposalForAction(null)}
          onApprove={(data) => handleApproveDisposal(selectedDisposalForAction.id, data)}
          onComplete={(data) => handleCompleteDisposal(selectedDisposalForAction.id, data)}
        />
      )}
    </div>
  );
}

function RequestDisposalModal({ assets, onClose, onSuccess }) {
  const [assetId, setAssetId] = useState(assets[0]?.id || '');
  const [disposalMethod, setDisposalMethod] = useState('public_auction');
  const [reason, setReason] = useState('obsolete');
  const [approvalRef, setApprovalRef] = useState('');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!assetId) {
      setError('Please select an asset.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/api/v1/disposals', {
        asset_id: assetId,
        disposal_method: disposalMethod,
        reason,
        committee_approval_ref: approvalRef,
        remarks
      });
      if (res.success) onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to submit disposal request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
        <div className="flex justify-between items-center border-b pb-2">
          <h3 className="text-sm font-bold text-slate-900">Initiate Asset Disposal Request</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400" /></button>
        </div>

        {error && <div className="p-2 bg-rose-50 text-rose-800 text-xs rounded">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Select Asset to Dispose *</label>
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

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Disposal Method</label>
              <select
                value={disposalMethod}
                onChange={(e) => setDisposalMethod(e.target.value)}
                className="w-full p-2 border rounded bg-white"
              >
                <option value="public_auction">Public Auction</option>
                <option value="scrap">Scrap / Recycled</option>
                <option value="donation">Donation to Affiliate</option>
                <option value="destruction">Controlled Destruction</option>
                <option value="lost_writeoff">Lost / Stolen Write-Off</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Disposal Reason</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full p-2 border rounded bg-white"
              >
                <option value="obsolete">Obsolete / Beyond Life</option>
                <option value="beyond_economic_repair">Beyond Economic Repair</option>
                <option value="damaged">Severely Damaged</option>
                <option value="surplus">Surplus to Requirements</option>
                <option value="lost">Lost / Missing</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Committee / Authority Approval Reference</label>
            <input
              type="text"
              value={approvalRef}
              onChange={(e) => setApprovalRef(e.target.value)}
              placeholder="e.g. MoCU/DISP/2026/RES-01"
              className="w-full p-2 border rounded font-mono"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Justification & Assessment Remarks</label>
            <textarea
              required
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Technical board assessment findings..."
              rows={2}
              className="w-full p-2 border rounded"
            />
          </div>

          <div className="pt-3 border-t flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-3 py-1.5 border rounded">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-1.5 bg-amber-500 text-slate-950 font-bold rounded">
              {submitting ? 'Submitting...' : 'Submit Disposal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ActionDisposalModal({ disposal, onClose, onApprove, onComplete }) {
  const [approvalRef, setApprovalRef] = useState(disposal.committee_approval_ref || '');
  const [disposalValue, setDisposalValue] = useState(disposal.disposal_value || 0);
  const [buyerRecipient, setBuyerRecipient] = useState(disposal.buyer_recipient || '');
  const [remarks, setRemarks] = useState(disposal.remarks || '');

  const isApproved = disposal.status === 'approved';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
        <div className="flex justify-between items-center border-b pb-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Process Asset Disposal</h3>
            <span className="font-mono text-xs text-amber-800 font-bold">{disposal.disposal_number}</span>
          </div>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400" /></button>
        </div>

        <div className="p-3 bg-slate-50 rounded-lg border text-xs space-y-1">
          <div><span className="font-bold">Asset:</span> {disposal.asset_name} ({disposal.asset_number})</div>
          <div><span className="font-bold">Method:</span> {disposal.disposal_method?.replace('_', ' ')}</div>
          <div><span className="font-bold">Reason:</span> {disposal.reason?.replace('_', ' ')}</div>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Committee Board Approval Reference</label>
            <input
              type="text"
              value={approvalRef}
              onChange={(e) => setApprovalRef(e.target.value)}
              placeholder="e.g. MoCU/DISP/2026/RES-01"
              className="w-full p-2 border rounded font-mono"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Disposal Realized Value (TZS)</label>
            <input
              type="number"
              value={disposalValue}
              onChange={(e) => setDisposalValue(e.target.value)}
              placeholder="0"
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Buyer / Recipient / Contractor</label>
            <input
              type="text"
              value={buyerRecipient}
              onChange={(e) => setBuyerRecipient(e.target.value)}
              placeholder="e.g. Public Auction Winner #42"
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Final Remarks</label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={2}
              className="w-full p-2 border rounded"
            />
          </div>
        </div>

        <div className="pt-3 border-t flex justify-end gap-2 text-xs">
          <button type="button" onClick={onClose} className="px-3 py-1.5 border rounded">Cancel</button>

          {!isApproved ? (
            <button
              type="button"
              onClick={() => onApprove({ committee_approval_ref: approvalRef, comments: remarks })}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded shadow"
            >
              Approve Disposal
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onComplete({ disposal_value: disposalValue, buyer_recipient: buyerRecipient, remarks })}
              className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded shadow"
            >
              Finalize & Set DISPOSED
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
