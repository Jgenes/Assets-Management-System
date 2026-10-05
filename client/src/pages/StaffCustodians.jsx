import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNotify } from '../context/NotificationContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  Users, UserCheck, Plus, Eye, Printer, Package,
  DollarSign, Mail, Phone, X, ShieldCheck
} from 'lucide-react';

export default function StaffCustodians({ onSelectAsset }) {
  const { can } = useAuth();
  const notify = useNotify();

  const [staff, setStaff] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Custodian Asset Register Modal
  const [selectedRegister, setSelectedRegister] = useState(null);
  const [loadingRegister, setLoadingRegister] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const loadStaff = async () => {
    setLoading(true);
    try {
      const [sRes, dRes] = await Promise.all([
        api.get('/api/v1/staff'),
        api.get('/api/v1/departments')
      ]);
      if (sRes.success) setStaff(sRes.staff || []);
      if (dRes.success) setDepartments(dRes.departments || []);
    } catch (e) {
      notify.error('Failed to load staff custodians');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, []);

  const openCustodianRegister = async (staffId) => {
    setLoadingRegister(true);
    try {
      const res = await api.get(`/api/v1/staff/${staffId}/register`);
      if (res.success) {
        setSelectedRegister(res.register);
      }
    } catch (e) {
      notify.error('Failed to generate Custodian Asset Register');
    } finally {
      setLoadingRegister(false);
    }
  };

  const handlePrintRegister = () => {
    window.print();
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            Asset Custodians & Staff Registry
          </h1>
          <p className="text-xs text-slate-500">
            University personnel entrusted with custody, care and physical responsibility for institutional assets
          </p>
        </div>

        {can('assets:create') && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Register New Custodian</span>
          </button>
        )}
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 no-print">
        {staff.map(member => (
          <div
            key={member.id}
            className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition overflow-hidden flex flex-col justify-between"
          >
            <div className="p-5 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded border">
                    {member.staff_id}
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900 mt-1">
                    {member.title ? `${member.title} ` : ''}{member.first_name} {member.last_name}
                  </h3>
                  <div className="text-xs text-amber-800 font-semibold">{member.position || 'Staff Member'}</div>
                  <div className="text-[11px] text-slate-500">{member.department_name || 'Central Directorate'}</div>
                </div>
                <div className="w-8 h-8 rounded-full bg-mocu-navy text-white flex items-center justify-center font-bold text-xs uppercase shadow">
                  {member.first_name[0]}{member.last_name[0]}
                </div>
              </div>

              <div className="text-xs text-slate-500 space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                {member.email && (
                  <div className="flex items-center gap-1.5 truncate">
                    <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{member.email}</span>
                  </div>
                )}
                {member.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{member.phone}</span>
                  </div>
                )}
              </div>

              {/* Custody counts */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-center">
                <div className="p-2 bg-slate-50 rounded-lg">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Assigned Assets</div>
                  <div className="text-base font-black text-amber-700">{member.assigned_assets_count || 0}</div>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Total Custody Value</div>
                  <div className="text-xs font-black text-slate-900 mt-1 truncate">{formatCurrency(member.total_custody_value)}</div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-medium">Custody Ledger</span>
              <button
                onClick={() => openCustodianRegister(member.id)}
                className="px-3 py-1.5 rounded-lg bg-mocu-navy hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              >
                <Eye className="w-3.5 h-3.5 text-amber-400" />
                <span>Custodian Register</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Custodian Asset Register Sign-Off Sheet Modal */}
      {selectedRegister && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-scale-up">
            <div className="bg-mocu-navy text-white p-4 flex items-center justify-between border-b border-mocu-navyLight no-print">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-amber-400" />
                  <span>Official Custodian Asset Register & Sign-Off Sheet</span>
                </h3>
                <p className="text-[11px] text-slate-300">
                  Custodian: {selectedRegister.custodian?.first_name} {selectedRegister.custodian?.last_name} ({selectedRegister.custodian?.staff_id})
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintRegister}
                  className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1.5 shadow"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Register</span>
                </button>
                <button onClick={() => setSelectedRegister(null)} className="p-1 text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Register Sheet */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6 text-xs text-slate-800 printable-area">
              {/* University Header */}
              <div className="text-center border-b-2 border-slate-900 pb-4 space-y-1">
                <div className="inline-block px-3 py-1 bg-slate-900 text-white font-black text-sm rounded mb-1">
                  MOSHI CO-OPERATIVE UNIVERSITY (MoCU)
                </div>
                <h2 className="text-base font-black tracking-wide text-slate-950 uppercase">
                  INDIVIDUAL CUSTODIAN ASSET REGISTER
                </h2>
                <div className="text-xs text-slate-600 font-semibold">
                  Institutional Asset Tracking, Allocation & Custody Handover Document
                </div>
                <div className="text-[11px] text-slate-400">
                  Generated: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })} • Kilamanjaro, Tanzania
                </div>
              </div>

              {/* Custodian Profile Header */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Custodian Name</span>
                  <span className="font-extrabold text-slate-900 text-sm">
                    {selectedRegister.custodian?.first_name} {selectedRegister.custodian?.last_name}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Staff ID</span>
                  <span className="font-mono font-bold text-slate-900">{selectedRegister.custodian?.staff_id}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Department / Unit</span>
                  <span className="font-semibold text-slate-900">{selectedRegister.custodian?.department_name || 'Central'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Designation</span>
                  <span className="font-semibold text-slate-900">{selectedRegister.custodian?.position}</span>
                </div>
              </div>

              {/* Assigned Assets Table */}
              <div className="border border-slate-300 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs divide-y divide-slate-200">
                  <thead className="bg-slate-100 font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-2.5">S/N</th>
                      <th className="p-2.5">Asset Number</th>
                      <th className="p-2.5">Barcode</th>
                      <th className="p-2.5">Asset Description</th>
                      <th className="p-2.5">Serial No.</th>
                      <th className="p-2.5">Location</th>
                      <th className="p-2.5">Condition</th>
                      <th className="p-2.5 text-right">Acquisition Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {selectedRegister.assets?.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-6 text-center text-slate-400">
                          No institutional assets currently allocated to this custodian.
                        </td>
                      </tr>
                    ) : (
                      selectedRegister.assets?.map((a, i) => (
                        <tr key={a.id} className="hover:bg-slate-50">
                          <td className="p-2.5 font-bold text-slate-500">{i + 1}</td>
                          <td className="p-2.5 font-mono font-bold text-slate-900">{a.asset_number}</td>
                          <td className="p-2.5 font-mono text-[11px] text-slate-600">{a.barcode}</td>
                          <td className="p-2.5 font-semibold text-slate-900">{a.name}</td>
                          <td className="p-2.5 font-mono text-slate-600">{a.serial_number || 'N/A'}</td>
                          <td className="p-2.5 text-slate-600">{a.building_name || ''} {a.room_code ? `(${a.room_code})` : ''}</td>
                          <td className="p-2.5 capitalize font-bold">{a.condition}</td>
                          <td className="p-2.5 text-right font-black text-slate-900">{formatCurrency(a.acquisition_cost)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-300">
                    <tr>
                      <td colSpan={7} className="p-2.5 text-right uppercase">Total Custody Value:</td>
                      <td className="p-2.5 text-right font-black text-emerald-800 text-sm">
                        {formatCurrency(selectedRegister.totalAcquisitionCost)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Custodian Acknowledgement Declaration & Signatures */}
              <div className="pt-4 border-t border-slate-300 space-y-4">
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-slate-700 leading-relaxed">
                  <span className="font-bold text-slate-900">INSTITUTIONAL ACKNOWLEDGEMENT & RESPONSIBILITY DECLARATION: </span>
                  I hereby acknowledge that the institutional assets listed above have been placed under my official care, custody and operational control for Moshi Co-operative University purposes. I accept responsibility to safeguard these assets against loss, unauthorized relocation, or avoidable damage, and agree to notify the Asset Management Directorate immediately regarding any relocation, maintenance need, damage, or loss.
                </div>

                <div className="grid grid-cols-2 gap-8 pt-4">
                  <div className="space-y-6">
                    <div className="text-xs font-bold text-slate-900">CUSTODIAN SIGN-OFF:</div>
                    <div className="border-b-2 border-slate-400 h-8"></div>
                    <div className="text-[11px] text-slate-600 space-y-0.5">
                      <div>Name: <span className="font-bold text-slate-900">{selectedRegister.custodian?.first_name} {selectedRegister.custodian?.last_name}</span></div>
                      <div>Signature: _______________________ Date: ______________</div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="text-xs font-bold text-slate-900">HEAD OF ASSET MANAGEMENT / VERIFIER:</div>
                    <div className="border-b-2 border-slate-400 h-8"></div>
                    <div className="text-[11px] text-slate-600 space-y-0.5">
                      <div>Verified By: <span className="font-bold text-slate-900">University Asset Administrator</span></div>
                      <div>Signature: _______________________ Date: ______________</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Custodian Modal */}
      {showAddModal && (
        <AddCustodianModal
          departments={departments}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            notify.success('Custodian registered successfully!');
            loadStaff();
          }}
        />
      )}
    </div>
  );
}

function AddCustodianModal({ departments, onClose, onSuccess }) {
  const [staffId, setStaffId] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [departmentId, setDepartmentId] = useState(departments[0]?.id || 1);
  const [position, setPosition] = useState('');
  const [title, setTitle] = useState('Mr.');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!staffId || !firstName || !lastName) {
      setError('Staff ID, first name and last name are required.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/api/v1/staff', {
        staff_id: staffId,
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        department_id: departmentId,
        position,
        title
      });
      if (res.success) onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to register custodian');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
        <div className="flex justify-between items-center border-b pb-2">
          <h3 className="text-sm font-bold text-slate-900">Register Staff Custodian</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400" /></button>
        </div>

        {error && <div className="p-2 bg-rose-50 text-rose-800 text-xs rounded">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Staff ID *</label>
            <input
              type="text"
              required
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              placeholder="e.g. MoCU/EMP/0142"
              className="w-full p-2 border rounded font-mono"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Title</label>
              <select value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-2 border rounded bg-white">
                <option value="Prof.">Prof.</option>
                <option value="Dr.">Dr.</option>
                <option value="Eng.">Eng.</option>
                <option value="CPA">CPA</option>
                <option value="Mr.">Mr.</option>
                <option value="Ms.">Ms.</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">First Name *</label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Last Name *</label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full p-2 border rounded"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Position / Title</label>
            <input
              type="text"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="e.g. Senior Lecturer, Systems Analyst"
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Department</label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="w-full p-2 border rounded bg-white"
            >
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Official Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@mocu.ac.tz"
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+255 754 ..."
                className="w-full p-2 border rounded"
              />
            </div>
          </div>

          <div className="pt-3 border-t flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-3 py-1.5 border rounded">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-1.5 bg-amber-500 text-slate-950 font-bold rounded">
              {submitting ? 'Registering...' : 'Register Custodian'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
