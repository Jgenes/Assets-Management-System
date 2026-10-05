import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNotify } from '../context/NotificationContext';
import { formatCurrency } from '../utils/formatters';
import { TrendingDown, DollarSign, Play, RefreshCw, X } from 'lucide-react';

export default function Depreciation() {
  const { user, can } = useAuth();
  const notify = useNotify();

  const [summary, setSummary] = useState(null);
  const [byCategory, setByCategory] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showRunModal, setShowRunModal] = useState(false);

  const loadDepreciation = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/v1/depreciation/summary');
      if (res.success) {
        setSummary(res.summary);
        setByCategory(res.byCategory || []);
      }
    } catch (e) {
      notify.error('Failed to load depreciation');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDepreciation();
  }, []);

  const handleExecuteRun = async (financialYear) => {
    try {
      const res = await api.post('/api/v1/depreciation/run', { financial_year: financialYear });
      if (res.success) {
        notify.success(`Depreciation run complete for FY ${financialYear}. Updated ${res.result?.processed} assets!`);
        setShowRunModal(false);
        loadDepreciation();
      }
    } catch (err) {
      notify.error(err.message || 'Depreciation run failed');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            Institutional Asset Depreciation & Book Values
          </h1>
          <p className="text-xs text-slate-500">
            Straight-line & reducing balance valuation schedules compliant with university accounting guidelines
          </p>
        </div>

        {can('depreciation:run') && (
          <button
            onClick={() => setShowRunModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-sm transition"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Run Financial Year Depreciation</span>
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm">
          <div className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Total Acquisition Cost</div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {formatCurrency(summary?.total_acquisition_cost)}
          </div>
          <div className="text-xs text-slate-500 mt-1">Across {summary?.total_assets || 0} active capital assets</div>
        </div>

        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm">
          <div className="text-[11px] font-bold uppercase text-rose-500 tracking-wider">Accumulated Depreciation</div>
          <div className="text-2xl font-black text-rose-700 mt-2">
            {formatCurrency(summary?.total_accumulated_depreciation)}
          </div>
          <div className="text-xs text-slate-500 mt-1">Institutional written-down value</div>
        </div>

        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm">
          <div className="text-[11px] font-bold uppercase text-emerald-600 tracking-wider">Current Net Book Value</div>
          <div className="text-2xl font-black text-emerald-800 mt-2">
            {formatCurrency(summary?.total_book_value)}
          </div>
          <div className="text-xs text-slate-500 mt-1">Audited carrying valuation</div>
        </div>
      </div>

      {/* Depreciation by Category Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-3 p-4">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
          Depreciation Valuation by Asset Category
        </h3>
        <table className="w-full text-left text-xs divide-y divide-slate-200">
          <thead className="bg-slate-50 font-bold text-slate-600 uppercase tracking-wider text-[10px]">
            <tr>
              <th className="p-3">Category Name</th>
              <th className="p-3">Code</th>
              <th className="p-3 text-center">Asset Count</th>
              <th className="p-3 text-right">Original Cost</th>
              <th className="p-3 text-right">Accumulated Depreciation</th>
              <th className="p-3 text-right">Net Book Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {byCategory.map(cat => (
              <tr key={cat.category_code} className="hover:bg-slate-50 transition">
                <td className="p-3 font-bold text-slate-900">{cat.category_name}</td>
                <td className="p-3 font-mono text-slate-500">{cat.category_code}</td>
                <td className="p-3 text-center font-bold">{cat.asset_count}</td>
                <td className="p-3 text-right font-semibold text-slate-900">{formatCurrency(cat.total_cost)}</td>
                <td className="p-3 text-right font-semibold text-rose-700">{formatCurrency(cat.total_depreciation)}</td>
                <td className="p-3 text-right font-black text-emerald-800">{formatCurrency(cat.total_book_value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Run Depreciation Modal */}
      {showRunModal && (
        <RunDepreciationModal
          onClose={() => setShowRunModal(false)}
          onExecute={handleExecuteRun}
        />
      )}
    </div>
  );
}

function RunDepreciationModal({ onClose, onExecute }) {
  const currentYear = new Date().getFullYear();
  const [financialYear, setFinancialYear] = useState(`${currentYear - 1}/${currentYear}`);
  const [executing, setExecuting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setExecuting(true);
    onExecute(financialYear);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
        <div className="flex justify-between items-center border-b pb-2">
          <h3 className="text-sm font-bold text-slate-900">Run Institutional Depreciation</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400" /></button>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          This operation calculates and commits the official depreciation ledger records for all eligible institutional assets for the specified financial year.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Financial Year (FY)</label>
            <input
              type="text"
              required
              value={financialYear}
              onChange={(e) => setFinancialYear(e.target.value)}
              placeholder="e.g. 2025/2026"
              className="w-full p-2 border rounded font-mono"
            />
          </div>

          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-900 space-y-1">
            <span className="font-bold">Accounting Rule: </span>
            Straight-Line convention: (Cost - Residual Value) / Useful Life. Updates current book value and logs depreciation records.
          </div>

          <div className="pt-3 border-t flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-3 py-1.5 border rounded">Cancel</button>
            <button type="submit" disabled={executing} className="px-4 py-1.5 bg-amber-500 text-slate-950 font-bold rounded shadow">
              {executing ? 'Executing Calculation...' : 'Execute Run'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
