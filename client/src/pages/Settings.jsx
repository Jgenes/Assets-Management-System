import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNotify } from '../context/NotificationContext';
import { Settings as SettingsIcon, ShieldCheck, Users, Save, CheckCircle2 } from 'lucide-react';

export default function Settings() {
  const { user, can } = useAuth();
  const notify = useNotify();

  const [settings, setSettings] = useState({});
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadConfig() {
      setLoading(true);
      try {
        const [sRes, uRes, rRes] = await Promise.all([
          api.get('/api/v1/settings'),
          api.get('/api/v1/auth/users'),
          api.get('/api/v1/auth/roles')
        ]);
        if (sRes.success) setSettings(sRes.settings || {});
        if (uRes.success) setUsers(uRes.users || []);
        if (rRes.success) setRoles(rRes.roles || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, []);

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put('/api/v1/settings', settings);
      if (res.success) {
        notify.success('Institutional system configurations saved successfully!');
      }
    } catch (err) {
      notify.error(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-black text-slate-900 tracking-tight">
          System Administration & Configuration
        </h1>
        <p className="text-xs text-slate-500">
          Institutional parameters, barcode symbology, asset numbering templates, and Role-Based Access Control (RBAC)
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* System Settings Form */}
        <form onSubmit={handleSaveSettings} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 text-xs">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <SettingsIcon className="w-4 h-4 text-amber-600" />
              <span>Institutional Parameters</span>
            </h3>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg shadow transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Institution Full Name</label>
            <input
              type="text"
              value={settings.institution_name || ''}
              onChange={(e) => handleChange('institution_name', e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Acronym / Abbreviation</label>
              <input
                type="text"
                value={settings.institution_abbr || ''}
                onChange={(e) => handleChange('institution_abbr', e.target.value)}
                className="w-full p-2 border rounded font-mono font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Base Currency</label>
              <input
                type="text"
                value={settings.currency || ''}
                onChange={(e) => handleChange('currency', e.target.value)}
                className="w-full p-2 border rounded font-mono font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Asset Number Prefix</label>
              <input
                type="text"
                value={settings.asset_number_prefix || ''}
                onChange={(e) => handleChange('asset_number_prefix', e.target.value)}
                className="w-full p-2 border rounded font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Numbering Pattern</label>
              <input
                type="text"
                value={settings.asset_number_format || ''}
                onChange={(e) => handleChange('asset_number_format', e.target.value)}
                className="w-full p-2 border rounded font-mono text-amber-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Primary Barcode Symbology</label>
              <select
                value={settings.barcode_symbology || 'CODE128'}
                onChange={(e) => handleChange('barcode_symbology', e.target.value)}
                className="w-full p-2 border rounded bg-white font-mono"
              >
                <option value="CODE128">Code 128 (Standard)</option>
                <option value="CODE39">Code 39</option>
                <option value="QR">QR Code 2D</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Verification Interval (Months)</label>
              <input
                type="number"
                value={settings.verification_cycle_months || 12}
                onChange={(e) => handleChange('verification_cycle_months', e.target.value)}
                className="w-full p-2 border rounded"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Depreciation Accounting Rule</label>
            <input
              type="text"
              value={settings.depreciation_convention || ''}
              onChange={(e) => handleChange('depreciation_convention', e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
        </form>

        {/* Roles & RBAC Overview */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 text-xs">
          <div className="border-b pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>Configured System Roles & Permissions</span>
            </h3>
            <p className="text-[11px] text-slate-500">11 institutional personas configured for MoCU</p>
          </div>

          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {roles.map(r => (
              <div key={r.id} className="py-2.5">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900">{r.name}</span>
                  <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border">
                    {r.code}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">{r.description}</div>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {r.permissions?.slice(0, 4).map((p, i) => (
                    <span key={i} className="text-[9px] bg-amber-50 text-amber-900 px-1 py-0.2 rounded border border-amber-200 font-mono">
                      {p}
                    </span>
                  ))}
                  {r.permissions?.length > 4 && (
                    <span className="text-[9px] text-slate-400">+{r.permissions.length - 4} more</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* User Accounts List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Users className="w-4 h-4 text-emerald-600" />
          <span>Active Institutional User Accounts</span>
        </h3>

        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-left text-xs divide-y divide-slate-200">
            <thead className="bg-slate-50 font-bold text-slate-600 uppercase text-[10px]">
              <tr>
                <th className="p-2.5">Full Name</th>
                <th className="p-2.5">Username</th>
                <th className="p-2.5">Email</th>
                <th className="p-2.5">Institutional Role</th>
                <th className="p-2.5">Department</th>
                <th className="p-2.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="p-2.5 font-bold text-slate-900">{u.full_name}</td>
                  <td className="p-2.5 font-mono text-slate-600">{u.username}</td>
                  <td className="p-2.5 text-slate-500">{u.email}</td>
                  <td className="p-2.5 font-semibold text-amber-900">{u.role_name}</td>
                  <td className="p-2.5 text-slate-600">{u.department_name || 'Central'}</td>
                  <td className="p-2.5 text-center">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      Active
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
