import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNotify } from '../context/NotificationContext';
import { formatCurrency } from '../utils/formatters';
import { Building2, Plus, Phone, Mail, MapPin, X } from 'lucide-react';

export default function Suppliers() {
  const { can } = useAuth();
  const notify = useNotify();

  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/v1/suppliers');
      if (res.success) setSuppliers(res.suppliers || []);
    } catch (e) {
      notify.error('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            Suppliers & Procurement Vendors
          </h1>
          <p className="text-xs text-slate-500">
            Registered equipment vendors, warranty partners, service contractors, and TIN numbers
          </p>
        </div>

        {can('suppliers:manage') && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Supplier</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {suppliers.map(sp => (
          <div key={sp.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex justify-between items-start">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border">
                  {sp.code}
                </span>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                  Active Vendor
                </span>
              </div>

              <h3 className="text-base font-extrabold text-slate-900 leading-tight">{sp.name}</h3>

              <div className="text-xs text-slate-600 space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                {sp.contact_person && <div>Contact: <span className="font-bold">{sp.contact_person}</span></div>}
                {sp.phone && (
                  <div className="flex items-center gap-1 text-[11px] text-slate-500">
                    <Phone className="w-3 h-3" />
                    <span>{sp.phone}</span>
                  </div>
                )}
                {sp.email && (
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 truncate">
                    <Mail className="w-3 h-3" />
                    <span>{sp.email}</span>
                  </div>
                )}
                {sp.tin_number && (
                  <div className="text-[10px] font-mono text-slate-500">
                    TIN: {sp.tin_number} • VAT: {sp.vat_registered ? 'Yes' : 'No'}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Supplied Assets</div>
                <div className="text-sm font-black text-amber-800">{sp.supplied_assets_count || 0} Assets</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Total Procurement</div>
                <div className="text-xs font-black text-slate-900">{formatCurrency(sp.total_supplied_value)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showAddModal && (
        <AddSupplierModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            notify.success('Supplier added!');
            loadSuppliers();
          }}
        />
      )}
    </div>
  );
}

function AddSupplierModal({ onClose, onSuccess }) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [tinNumber, setTinNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name) {
      setError('Supplier name is required.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/api/v1/suppliers', {
        code,
        name,
        contact_person: contactPerson,
        phone,
        email,
        address,
        tin_number: tinNumber
      });
      if (res.success) onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to add supplier');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
        <div className="flex justify-between items-center border-b pb-2">
          <h3 className="text-sm font-bold text-slate-900">Add Procurement Supplier</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400" /></button>
        </div>

        {error && <div className="p-2 bg-rose-50 text-rose-800 text-xs rounded">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Supplier Code</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. SUP-007 (Auto-generated if empty)"
              className="w-full p-2 border rounded font-mono uppercase"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Company / Vendor Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dell Technologies Tanzania Ltd"
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Contact Person</label>
            <input
              type="text"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              placeholder="e.g. Jackson Mtui"
              className="w-full p-2 border rounded"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+255 ..."
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sales@vendor.com"
                className="w-full p-2 border rounded"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">TIN Number</label>
            <input
              type="text"
              value={tinNumber}
              onChange={(e) => setTinNumber(e.target.value)}
              placeholder="100-XXX-XXX"
              className="w-full p-2 border rounded font-mono"
            />
          </div>

          <div className="pt-3 border-t flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-3 py-1.5 border rounded">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-1.5 bg-amber-500 text-slate-950 font-bold rounded">
              {submitting ? 'Saving...' : 'Save Supplier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
