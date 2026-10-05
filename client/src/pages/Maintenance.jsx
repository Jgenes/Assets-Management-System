import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNotify } from '../context/NotificationContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  Wrench, Plus, CheckCircle2, AlertTriangle, Clock,
  DollarSign, User, X
} from 'lucide-react';

export default function Maintenance() {
  const { user, can } = useAuth();
  const notify = useNotify();

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const [assets, setAssets] = useState([]);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedTicketForCompletion, setSelectedTicketForCompletion] = useState(null);

  const loadMaintenance = async () => {
    setLoading(true);
    try {
      const [mRes, aRes] = await Promise.all([
        api.get('/api/v1/maintenance'),
        api.get('/api/v1/assets', { limit: 150 })
      ]);
      if (mRes.success) setRecords(mRes.maintenance || []);
      if (aRes.success) setAssets(aRes.data || []);
    } catch (e) {
      notify.error('Failed to load maintenance records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMaintenance();
  }, []);

  const handleComplete = async (ticketId, data) => {
    try {
      const res = await api.put(`/api/v1/maintenance/${ticketId}/complete`, data);
      if (res.success) {
        notify.success('Maintenance completed and asset condition updated!');
        setSelectedTicketForCompletion(null);
        loadMaintenance();
      }
    } catch (err) {
      notify.error(err.message || 'Failed to complete maintenance');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            Asset Maintenance & Repairs Management
          </h1>
          <p className="text-xs text-slate-500">
            Preventive service schedules, corrective repairs, warranty service claims and contractor costs
          </p>
        </div>

        <button
          onClick={() => setShowRequestModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>Open Maintenance Ticket</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs divide-y divide-slate-200">
          <thead className="bg-slate-50 font-bold text-slate-600 uppercase tracking-wider text-[10px]">
            <tr>
              <th className="p-3">Ticket #</th>
              <th className="p-3">Asset Details</th>
              <th className="p-3">Type & Priority</th>
              <th className="p-3">Issue Reported</th>
              <th className="p-3">Service Provider</th>
              <th className="p-3 text-right">Cost</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {records.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-400">
                  No maintenance work orders found.
                </td>
              </tr>
            ) : (
              records.map(m => {
                const isCompleted = m.status === 'completed';
                return (
                  <tr key={m.id} className="hover:bg-slate-50 transition">
                    <td className="p-3 font-mono font-bold text-slate-900">{m.maintenance_number}</td>
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{m.asset_name}</div>
                      <div className="text-[10px] font-mono text-amber-800">{m.asset_number}</div>
                    </td>
                    <td className="p-3 whitespace-nowrap capitalize">
                      <span className="font-semibold text-slate-800">{m.maintenance_type?.replace('_', ' ')}</span>
                      <span className={`block text-[10px] font-bold ${
                        m.priority === 'critical' || m.priority === 'high' ? 'text-rose-600' : 'text-slate-500'
                      }`}>
                        {m.priority} priority
                      </span>
                    </td>
                    <td className="p-3 max-w-xs">
                      <div className="font-medium text-slate-800 truncate">{m.issue_reported}</div>
                      {m.technician_notes && <div className="text-[10px] text-slate-500 truncate">{m.technician_notes}</div>}
                    </td>
                    <td className="p-3 text-slate-700">{m.service_provider || 'Estates/ICT In-House'}</td>
                    <td className="p-3 text-right font-black text-slate-900">{formatCurrency(m.cost)}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        isCompleted ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                      }`}>
                        {m.status}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      {!isCompleted && (
                        <button
                          onClick={() => setSelectedTicketForCompletion(m)}
                          className="px-2.5 py-1 bg-mocu-navy hover:bg-slate-800 text-white rounded text-[11px] font-bold shadow-sm"
                        >
                          Complete Repair
                        </button>
                      )}
                      {isCompleted && (
                        <span className="text-[10px] text-emerald-700 font-bold flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Done</span>
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

      {/* Open Ticket Modal */}
      {showRequestModal && (
        <RequestMaintenanceModal
          assets={assets}
          onClose={() => setShowRequestModal(false)}
          onSuccess={() => {
            setShowRequestModal(false);
            notify.success('Maintenance ticket opened!');
            loadMaintenance();
          }}
        />
      )}

      {/* Complete Maintenance Modal */}
      {selectedTicketForCompletion && (
        <CompleteMaintenanceModal
          ticket={selectedTicketForCompletion}
          onClose={() => setSelectedTicketForCompletion(null)}
          onComplete={(data) => handleComplete(selectedTicketForCompletion.id, data)}
        />
      )}
    </div>
  );
}

function RequestMaintenanceModal({ assets, onClose, onSuccess }) {
  const [assetId, setAssetId] = useState(assets[0]?.id || '');
  const [maintenanceType, setMaintenanceType] = useState('corrective');
  const [priority, setPriority] = useState('medium');
  const [issueReported, setIssueReported] = useState('');
  const [serviceProvider, setServiceProvider] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!assetId || !issueReported.trim()) {
      setError('Please select an asset and describe the reported issue.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/api/v1/maintenance', {
        asset_id: assetId,
        maintenance_type: maintenanceType,
        priority,
        issue_reported: issueReported,
        service_provider: serviceProvider
      });
      if (res.success) onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to submit maintenance request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
        <div className="flex justify-between items-center border-b pb-2">
          <h3 className="text-sm font-bold text-slate-900">Open Maintenance Ticket</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400" /></button>
        </div>

        {error && <div className="p-2 bg-rose-50 text-rose-800 text-xs rounded">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Select Asset *</label>
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
              <label className="block font-bold text-slate-700 mb-1">Maintenance Type</label>
              <select
                value={maintenanceType}
                onChange={(e) => setMaintenanceType(e.target.value)}
                className="w-full p-2 border rounded bg-white"
              >
                <option value="corrective">Corrective Repair</option>
                <option value="preventive">Preventive Service</option>
                <option value="routine_service">Routine Inspection</option>
                <option value="warranty_claim">Warranty Claim</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full p-2 border rounded bg-white"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Issue / Fault Description *</label>
            <textarea
              required
              value={issueReported}
              onChange={(e) => setIssueReported(e.target.value)}
              placeholder="Describe symptoms, faulty components, or required preventive tasks..."
              rows={3}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Assigned Service Provider / Contractor</label>
            <input
              type="text"
              value={serviceProvider}
              onChange={(e) => setServiceProvider(e.target.value)}
              placeholder="e.g. MoCU ICT Directorate or Authorized Technician"
              className="w-full p-2 border rounded"
            />
          </div>

          <div className="pt-3 border-t flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-3 py-1.5 border rounded">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-1.5 bg-amber-500 text-slate-950 font-bold rounded">
              {submitting ? 'Creating...' : 'Open Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CompleteMaintenanceModal({ ticket, onClose, onComplete }) {
  const [cost, setCost] = useState('');
  const [technicianNotes, setTechnicianNotes] = useState('');
  const [conditionAfter, setConditionAfter] = useState('good');

  const handleSubmit = (e) => {
    e.preventDefault();
    onComplete({
      cost: parseFloat(cost) || 0,
      technician_notes: technicianNotes,
      condition_after: conditionAfter
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
        <div className="flex justify-between items-center border-b pb-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Complete Maintenance Ticket</h3>
            <span className="font-mono text-xs text-amber-800 font-bold">{ticket.maintenance_number}</span>
          </div>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400" /></button>
        </div>

        <div className="p-3 bg-slate-50 rounded-lg border text-xs space-y-1">
          <div><span className="font-bold">Asset:</span> {ticket.asset_name} ({ticket.asset_number})</div>
          <div><span className="font-bold">Issue:</span> {ticket.issue_reported}</div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Total Maintenance / Incurred Cost (TZS)</label>
            <input
              type="number"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="e.g. 150000"
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Asset Condition After Repair *</label>
            <select
              value={conditionAfter}
              onChange={(e) => setConditionAfter(e.target.value)}
              className="w-full p-2 border rounded bg-white"
            >
              <option value="good">Good (Restored to service)</option>
              <option value="fair">Fair (Operable with limitations)</option>
              <option value="new">New / Refurbished</option>
              <option value="poor">Poor (Requires replacement soon)</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Technician / Service Notes</label>
            <textarea
              required
              value={technicianNotes}
              onChange={(e) => setTechnicianNotes(e.target.value)}
              placeholder="Parts replaced, tests performed, warranty terms applied..."
              rows={2}
              className="w-full p-2 border rounded"
            />
          </div>

          <div className="pt-3 border-t flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-3 py-1.5 border rounded">Cancel</button>
            <button type="submit" className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded">
              Complete & Restore Asset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
