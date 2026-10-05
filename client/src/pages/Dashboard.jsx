import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import {
  Package, DollarSign, CheckCircle2, AlertTriangle, AlertCircle,
  Wrench, Trash2, ArrowRightLeft, ShieldAlert, Smartphone,
  Plus, Printer, ArrowRight, TrendingUp, Building, Briefcase
} from 'lucide-react';

export default function Dashboard({ onNavigate, onOpenRegisterModal }) {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [charts, setCharts] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [statsRes, chartsRes, actRes] = await Promise.all([
          api.get('/api/v1/dashboard/stats'),
          api.get('/api/v1/dashboard/charts'),
          api.get('/api/v1/dashboard/recent-activity')
        ]);
        if (statsRes.success) setStats(statsRes.stats);
        if (chartsRes.success) setCharts(chartsRes.charts);
        if (actRes.success) setActivity(actRes.activity || []);
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-sm font-semibold text-slate-600">Loading MoCU Asset Dashboard...</div>
        </div>
      </div>
    );
  }

  const s = stats || {};

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Welcome & Quick Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Institutional Asset Management Dashboard
            </h1>
            <span className="text-[11px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300">
              FY 2025/2026
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Logged in as <span className="font-semibold text-slate-800">{user?.full_name}</span> ({user?.role_name}) • Moshi Main Campus & Teaching Centres
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onOpenRegisterModal && onOpenRegisterModal()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-mocu-navy hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Register Asset</span>
          </button>

          <button
            onClick={() => onNavigate('mobile-scanner')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold shadow-sm transition"
          >
            <Smartphone className="w-4 h-4" />
            <span>Mobile Scanner</span>
          </button>

          <button
            onClick={() => onNavigate('barcode-labels')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold shadow-sm transition"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Print Labels</span>
          </button>

          <button
            onClick={() => onNavigate('reports')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-sm transition"
          >
            <span>Institutional Reports</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {/* Total Assets */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Assets</span>
            <Package className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-slate-900">{s.total_assets || 0}</div>
            <div className="text-[11px] text-slate-500 font-medium mt-0.5">
              {s.active_count || 0} active in use
            </div>
          </div>
        </div>

        {/* Total Acquisition Value */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Acquisition Cost</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2">
            <div className="text-lg font-black text-slate-900 truncate">
              {formatCurrency(s.total_asset_value)}
            </div>
            <div className="text-[11px] text-emerald-700 font-semibold mt-0.5">
              Book Val: {formatCurrency(s.total_book_value)}
            </div>
          </div>
        </div>

        {/* Verification Status */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Verification</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-emerald-700">
              {s.verified_count || 0}
              <span className="text-xs text-slate-400 font-normal"> / {s.total_assets || 0}</span>
            </div>
            <div className="text-[11px] text-amber-700 font-medium mt-0.5">
              {s.unverified_count || 0} pending audit
            </div>
          </div>
        </div>

        {/* Under Maintenance */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Maintenance</span>
            <Wrench className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-amber-600">
              {s.under_maintenance_count || 0}
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-0.5">
              {s.pendingMaintenance || 0} active tickets
            </div>
          </div>
        </div>

        {/* Missing / Damaged Assets */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Alerts</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-rose-600">
              {(s.missing_count || 0) + (s.damaged_count || 0)}
            </div>
            <div className="text-[11px] text-rose-700 font-medium mt-0.5">
              {s.missing_count || 0} missing • {s.damaged_count || 0} damaged
            </div>
          </div>
        </div>

        {/* Warranties & Transfers */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Approvals Due</span>
            <ShieldAlert className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-indigo-900">
              {(s.pendingTransfers || 0) + (s.pendingDisposals || 0)}
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-0.5">
              {s.pendingTransfers || 0} transfers • {s.pendingDisposals || 0} disposals
            </div>
          </div>
        </div>
      </div>

      {/* Active Verification Campaign Banner */}
      {s.campaignProgress && (
        <div className="bg-gradient-to-r from-mocu-navy to-slate-900 text-white p-5 rounded-xl border border-mocu-navyLight shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-full">
                Active Campaign
              </span>
              <span className="text-xs text-amber-300 font-semibold">Real-Time Verification Tracking</span>
            </div>
            <h2 className="text-base font-bold text-white">{s.campaignProgress.title}</h2>
            <p className="text-xs text-slate-300">
              {s.campaignProgress.scanned} of {s.campaignProgress.expected} university assets physically verified across campuses
            </p>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto min-w-[280px]">
            <div className="flex-1">
              <div className="flex justify-between text-xs font-bold mb-1">
                <span>Audit Progress</span>
                <span className="text-amber-400">{s.campaignProgress.pct}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-3 border border-slate-700 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-amber-400 to-emerald-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, s.campaignProgress.pct)}%` }}
                ></div>
              </div>
            </div>

            <button
              onClick={() => onNavigate('verification-campaigns')}
              className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold rounded-lg shrink-0 transition"
            >
              View Campaign
            </button>
          </div>
        </div>
      )}

      {/* Charts & Analytical Distributions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assets by Department */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">Assets by Department / Unit</h3>
            </div>
            <button
              onClick={() => onNavigate('departments')}
              className="text-xs text-amber-700 hover:text-amber-800 font-semibold flex items-center gap-1"
            >
              <span>View all</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3">
            {charts?.byDepartment?.slice(0, 5).map(dept => {
              const maxCount = Math.max(...(charts?.byDepartment?.map(d => d.count) || [1]), 1);
              const pct = Math.round((dept.count / maxCount) * 100);
              return (
                <div key={dept.code} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-800 truncate max-w-[240px]">{dept.name}</span>
                    <span className="font-mono text-slate-600 font-bold">
                      {dept.count} assets • {formatCurrency(dept.total_value)}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-600 h-full rounded-full"
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Assets by Building */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">Assets by Building</h3>
            </div>
            <button
              onClick={() => onNavigate('buildings')}
              className="text-xs text-amber-700 hover:text-amber-800 font-semibold flex items-center gap-1"
            >
              <span>View all</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3">
            {charts?.byBuilding?.slice(0, 5).map(bld => {
              const maxCount = Math.max(...(charts?.byBuilding?.map(b => b.count) || [1]), 1);
              const pct = Math.round((bld.count / maxCount) * 100);
              return (
                <div key={bld.code} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-800 truncate max-w-[240px]">{bld.name}</span>
                    <span className="font-mono text-slate-600 font-bold">
                      {bld.count} assets • {formatCurrency(bld.total_value)}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full rounded-full"
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Categories & Condition Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Category breakdown */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900">Asset Categories Breakdown</h3>
            <button onClick={() => onNavigate('categories')} className="text-xs text-amber-700 hover:underline">
              Categories
            </button>
          </div>
          <div className="divide-y divide-slate-100 text-xs">
            {charts?.byCategory?.map(c => (
              <div key={c.code} className="py-2.5 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-800">{c.name}</div>
                  <div className="text-[11px] text-slate-500 font-mono">{c.code}</div>
                </div>
                <div className="text-right">
                  <div className="font-extrabold text-slate-900">{c.count} items</div>
                  <div className="text-[11px] text-emerald-700 font-medium">{formatCurrency(c.total_value)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Condition breakdown & Recent Activity */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-3">Asset Condition Status</h3>
            <div className="grid grid-cols-3 gap-2">
              {charts?.byCondition?.map(cond => {
                let color = 'bg-slate-50 border-slate-200 text-slate-800';
                if (cond.condition === 'good' || cond.condition === 'new') color = 'bg-emerald-50 border-emerald-200 text-emerald-900';
                if (cond.condition === 'fair') color = 'bg-amber-50 border-amber-200 text-amber-900';
                if (cond.condition === 'poor' || cond.condition === 'damaged') color = 'bg-rose-50 border-rose-200 text-rose-900';
                return (
                  <div key={cond.condition} className={`p-3 rounded-lg border text-center ${color}`}>
                    <div className="text-xl font-black">{cond.count}</div>
                    <div className="text-[11px] font-bold uppercase tracking-wider capitalize mt-0.5">
                      {cond.condition}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
              Recent Institutional History
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {activity.slice(0, 4).map(act => (
                <div key={act.id} className="text-xs flex items-start gap-2 text-slate-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0"></span>
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-slate-800">{act.asset_number}: </span>
                    <span>{act.title}</span>
                    <span className="text-[10px] text-slate-400 block">{formatDateTime(act.event_date)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
