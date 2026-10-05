import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { formatDate } from '../utils/formatters';
import { ShieldAlert, AlertTriangle, CheckCircle2, Clock, Phone, Building } from 'lucide-react';

export default function Warranties() {
  const [warranties, setWarranties] = useState([]);
  const [alerts, setAlerts] = useState({ expiringSoon: [], expired: [] });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [wRes, aRes] = await Promise.all([
          api.get('/api/v1/warranties', { status: statusFilter }),
          api.get('/api/v1/warranties/alerts')
        ]);
        if (wRes.success) setWarranties(wRes.warranties || []);
        if (aRes.success) setAlerts(aRes);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [statusFilter]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-black text-slate-900 tracking-tight">
          Institutional Warranty & Vendor Support Tracking
        </h1>
        <p className="text-xs text-slate-500">
          Monitor manufacturer guarantees, preventive service agreements, and automated 30-day expiry notifications
        </p>
      </div>

      {/* Summary Alert Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => setStatusFilter('EXPIRING_SOON')}
          className={`p-4 rounded-xl border cursor-pointer transition ${
            statusFilter === 'EXPIRING_SOON' ? 'ring-2 ring-amber-500 bg-amber-50/60' : 'bg-white hover:bg-slate-50'
          }`}
        >
          <div className="flex justify-between items-center text-amber-700">
            <span className="text-xs font-bold uppercase tracking-wider">Expiring in &lt; 30 Days</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-amber-800 mt-2">{alerts.expiringSoonCount || 0}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Urgent service / renewal window</div>
        </div>

        <div
          onClick={() => setStatusFilter('EXPIRED')}
          className={`p-4 rounded-xl border cursor-pointer transition ${
            statusFilter === 'EXPIRED' ? 'ring-2 ring-rose-500 bg-rose-50/60' : 'bg-white hover:bg-slate-50'
          }`}
        >
          <div className="flex justify-between items-center text-rose-700">
            <span className="text-xs font-bold uppercase tracking-wider">Expired Warranties</span>
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-rose-800 mt-2">{alerts.expiredCount || 0}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Post-warranty coverage mode</div>
        </div>

        <div
          onClick={() => setStatusFilter('')}
          className={`p-4 rounded-xl border cursor-pointer transition ${
            statusFilter === '' ? 'ring-2 ring-blue-500 bg-blue-50/60' : 'bg-white hover:bg-slate-50'
          }`}
        >
          <div className="flex justify-between items-center text-blue-700">
            <span className="text-xs font-bold uppercase tracking-wider">All Warranties</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{warranties.length}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Institutional assets covered</div>
        </div>
      </div>

      {/* Warranties Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs divide-y divide-slate-200">
          <thead className="bg-slate-50 font-bold text-slate-600 uppercase tracking-wider text-[10px]">
            <tr>
              <th className="p-3">Asset Number & Name</th>
              <th className="p-3">Warranty Provider</th>
              <th className="p-3">Coverage Window</th>
              <th className="p-3 text-center">Days Remaining</th>
              <th className="p-3">Warranty Terms</th>
              <th className="p-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {warranties.map(w => {
              const isExpired = w.warranty_status === 'EXPIRED';
              const isExpiringSoon = w.warranty_status === 'EXPIRING_SOON';

              return (
                <tr key={w.asset_id} className="hover:bg-slate-50 transition">
                  <td className="p-3">
                    <div className="font-bold text-slate-900">{w.asset_name}</div>
                    <div className="font-mono text-[10px] text-amber-800">{w.asset_number}</div>
                  </td>

                  <td className="p-3">
                    <div className="font-semibold text-slate-800">{w.warranty_provider}</div>
                    {w.supplier_phone && (
                      <div className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        <span>{w.supplier_phone}</span>
                      </div>
                    )}
                  </td>

                  <td className="p-3 whitespace-nowrap">
                    <div>{formatDate(w.warranty_start_date)} - {formatDate(w.warranty_expiry_date)}</div>
                  </td>

                  <td className="p-3 text-center font-bold">
                    {isExpired ? (
                      <span className="text-rose-600">Expired</span>
                    ) : (
                      <span className={isExpiringSoon ? 'text-amber-600 font-black' : 'text-emerald-700'}>
                        {w.days_remaining} days
                      </span>
                    )}
                  </td>

                  <td className="p-3 max-w-xs truncate text-[11px] text-slate-500">
                    {w.warranty_terms || 'Standard vendor replacement and parts warranty'}
                  </td>

                  <td className="p-3 text-center whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      isExpired
                        ? 'bg-rose-100 text-rose-800'
                        : isExpiringSoon
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {w.warranty_status?.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
