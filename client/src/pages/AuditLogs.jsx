import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { formatDateTime } from '../utils/formatters';
import { History, Search, ShieldCheck, Filter, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [expandedLogId, setExpandedLogId] = useState(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/v1/audit-logs', {
        search,
        action: actionFilter,
        page,
        limit: 50
      });
      if (res.success) {
        setLogs(res.logs || []);
        setTotalCount(res.total || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, page]);

  const toggleExpand = (id) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-black text-slate-900 tracking-tight">
          Institutional Asset Audit Trail & Accountability Ledger
        </h1>
        <p className="text-xs text-slate-500">
          Immutable event log for university internal auditors, finance inspectors, and statutory regulatory compliance
        </p>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-3 text-xs items-center">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchLogs()}
            placeholder="Search audit trail by asset number, user, or keywords..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          className="p-2 border border-slate-300 rounded-lg bg-white"
        >
          <option value="">All Institutional Actions</option>
          <option value="ASSET_CREATED">Asset Created</option>
          <option value="ASSET_UPDATED">Asset Updated</option>
          <option value="ASSET_VERIFIED">Asset Verified</option>
          <option value="TRANSFER_REQUESTED">Transfer Requested</option>
          <option value="TRANSFER_APPROVED">Transfer Approved</option>
          <option value="MAINTENANCE_REQUESTED">Maintenance Requested</option>
          <option value="MAINTENANCE_COMPLETED">Maintenance Completed</option>
          <option value="DISPOSAL_REQUESTED">Disposal Requested</option>
          <option value="ASSET_DISPOSED">Asset Disposed</option>
          <option value="BULK_IMPORT">Bulk Import</option>
        </select>

        <span className="text-slate-500 ml-auto font-medium">
          {totalCount} total logged audit transactions
        </span>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs divide-y divide-slate-200">
          <thead className="bg-slate-50 font-bold text-slate-600 uppercase tracking-wider text-[10px]">
            <tr>
              <th className="p-3 w-8"></th>
              <th className="p-3">Timestamp</th>
              <th className="p-3">Action Type</th>
              <th className="p-3">User / Actor</th>
              <th className="p-3">Asset / Entity</th>
              <th className="p-3">Audit Details</th>
              <th className="p-3">IP Address</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {loading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-500">
                  Loading institutional audit trail...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400">
                  No audit logs matching query.
                </td>
              </tr>
            ) : (
              logs.map(log => {
                const isExpanded = expandedLogId === log.id;
                return (
                  <React.Fragment key={log.id}>
                    <tr
                      onClick={() => toggleExpand(log.id)}
                      className="hover:bg-slate-50 transition cursor-pointer"
                    >
                      <td className="p-3 text-slate-400">
                        {log.old_values || log.new_values ? (
                          isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />
                        ) : null}
                      </td>

                      <td className="p-3 whitespace-nowrap font-mono text-[11px] text-slate-600">
                        {formatDateTime(log.created_at)}
                      </td>

                      <td className="p-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-slate-100 text-slate-800 border">
                          {log.action}
                        </span>
                      </td>

                      <td className="p-3 font-semibold text-slate-900 whitespace-nowrap">
                        {log.user_name || 'System Operator'}
                      </td>

                      <td className="p-3 font-mono text-amber-800 font-bold whitespace-nowrap">
                        {log.entity_code || log.entity_type}
                      </td>

                      <td className="p-3 max-w-sm truncate text-slate-700">
                        {log.details || 'Operational record'}
                      </td>

                      <td className="p-3 font-mono text-[10px] text-slate-400 whitespace-nowrap">
                        {log.ip_address}
                      </td>
                    </tr>

                    {/* Expandable Before / After JSON Diff */}
                    {isExpanded && (log.old_values || log.new_values) && (
                      <tr className="bg-slate-50/80">
                        <td colSpan={7} className="p-4 pl-12">
                          <div className="grid grid-cols-2 gap-4 text-[11px] font-mono">
                            {log.old_values && (
                              <div className="p-3 bg-rose-50 rounded-lg border border-rose-200">
                                <span className="font-bold text-rose-900 block mb-1">Previous Values:</span>
                                <pre className="whitespace-pre-wrap text-rose-800">{JSON.stringify(log.old_values, null, 2)}</pre>
                              </div>
                            )}
                            {log.new_values && (
                              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                                <span className="font-bold text-emerald-900 block mb-1">New Committed Values:</span>
                                <pre className="whitespace-pre-wrap text-emerald-800">{JSON.stringify(log.new_values, null, 2)}</pre>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
