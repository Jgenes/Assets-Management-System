import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Package, QrCode, Smartphone,
  Building, MapPin, DoorOpen, Users, Briefcase,
  CheckCircle2, ArrowRightLeft, Wrench, ShieldAlert, Trash2,
  TrendingDown, FileText, History, Upload, Settings, Building2
} from 'lucide-react';

export default function Sidebar({ currentView, onNavigate }) {
  const { user, can } = useAuth();

  const sections = [
    {
      title: 'CORE MODULES',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'assets', label: 'Asset Master', icon: Package },
        { id: 'barcode-labels', label: 'Barcode & Labels', icon: QrCode },
        { id: 'mobile-scanner', label: 'Mobile Scanner', icon: Smartphone, highlight: true }
      ]
    },
    {
      title: 'UNIVERSITY STRUCTURE',
      items: [
        { id: 'campuses', label: 'Campuses', icon: MapPin },
        { id: 'buildings', label: 'Buildings', icon: Building },
        { id: 'rooms', label: 'Rooms & Offices', icon: DoorOpen },
        { id: 'departments', label: 'Departments & Units', icon: Briefcase },
        { id: 'staff', label: 'Staff & Custodians', icon: Users }
      ]
    },
    {
      title: 'ASSET OPERATIONS',
      items: [
        { id: 'verification-campaigns', label: 'Verifications', icon: CheckCircle2 },
        { id: 'transfers', label: 'Transfers Workflow', icon: ArrowRightLeft },
        { id: 'maintenance', label: 'Maintenance & Repairs', icon: Wrench },
        { id: 'warranties', label: 'Warranties & Alerts', icon: ShieldAlert },
        { id: 'disposals', label: 'Disposal Workflow', icon: Trash2 }
      ]
    },
    {
      title: 'FINANCE & AUDIT',
      items: [
        { id: 'depreciation', label: 'Depreciation & Values', icon: TrendingDown },
        { id: 'reports', label: 'Institutional Reports (17)', icon: FileText },
        { id: 'audit-logs', label: 'Audit Trail', icon: History },
        { id: 'bulk-import', label: 'Bulk Data Import', icon: Upload }
      ]
    },
    {
      title: 'SYSTEM CONFIG',
      items: [
        { id: 'categories', label: 'Asset Categories', icon: Package },
        { id: 'suppliers', label: 'Suppliers & Vendors', icon: Building2 },
        { id: 'settings', label: 'System Settings', icon: Settings }
      ]
    }
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 no-print select-none">
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {sections.map((sec, idx) => (
          <div key={idx}>
            <div className="px-3 mb-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
              {sec.title}
            </div>
            <div className="space-y-1">
              {sec.items.map(item => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-amber-500 text-slate-950 font-bold shadow'
                        : item.highlight
                        ? 'bg-emerald-950/60 text-emerald-400 hover:bg-emerald-900/60 border border-emerald-800/40'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-slate-950' : item.highlight ? 'text-emerald-400' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.highlight && !isActive && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800 text-[11px] text-slate-400 bg-slate-950/40">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-300">MoCU AMS v1.0</span>
          <span className="text-[10px] text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800">
            Connected
          </span>
        </div>
        <div className="text-[10px] text-slate-500 mt-0.5">
          Moshi Co-operative University
        </div>
      </div>
    </aside>
  );
}
