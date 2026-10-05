import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNotify } from '../context/NotificationContext';
import { formatCurrency } from '../utils/formatters';
import { Package, Plus, X } from 'lucide-react';

export default function Categories() {
  const { can } = useAuth();
  const notify = useNotify();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/v1/categories');
      if (res.success) setCategories(res.categories || []);
    } catch (e) {
      notify.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            Institutional Asset Categories & Taxonomy
          </h1>
          <p className="text-xs text-slate-500">
            Configure asset classes, subcategories, default useful lives, and accounting depreciation conventions
          </p>
        </div>

        {can('assets:manage') && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Asset Category</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {categories.map(cat => (
          <div key={cat.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                  {cat.code}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  {cat.is_capital ? 'Capital Asset' : 'Non-Capital'}
                </span>
              </div>

              <h3 className="text-base font-extrabold text-slate-900 mt-2">{cat.name}</h3>
              <p className="text-xs text-slate-600 line-clamp-2">{cat.description || 'Configured institutional category'}</p>

              {/* Subcategories pills */}
              <div className="pt-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Subcategories:</span>
                <div className="flex flex-wrap gap-1">
                  {cat.subcategories?.map(sc => (
                    <span key={sc.id} className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                      {sc.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-1.5 bg-slate-50 rounded">
                <div className="text-[9px] uppercase font-bold text-slate-400">Useful Life</div>
                <div className="font-black text-slate-900">{cat.useful_life_years} Years</div>
              </div>
              <div className="p-1.5 bg-slate-50 rounded">
                <div className="text-[9px] uppercase font-bold text-slate-400">Assets</div>
                <div className="font-black text-amber-700">{cat.assets_count || 0}</div>
              </div>
              <div className="p-1.5 bg-slate-50 rounded">
                <div className="text-[9px] uppercase font-bold text-slate-400">Convention</div>
                <div className="font-bold text-slate-800 text-[10px] capitalize truncate">
                  {cat.depreciation_method?.replace('_', ' ')}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showAddModal && (
        <AddCategoryModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            notify.success('Category created!');
            loadCategories();
          }}
        />
      )}
    </div>
  );
}

function AddCategoryModal({ onClose, onSuccess }) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [usefulLife, setUsefulLife] = useState(5);
  const [method, setMethod] = useState('straight_line');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!code || !name) {
      setError('Category code and name are required.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/api/v1/categories', {
        code,
        name,
        description,
        useful_life_years: parseInt(usefulLife, 10),
        depreciation_method: method
      });
      if (res.success) onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to create category');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
        <div className="flex justify-between items-center border-b pb-2">
          <h3 className="text-sm font-bold text-slate-900">Add Asset Category</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400" /></button>
        </div>

        {error && <div className="p-2 bg-rose-50 text-rose-800 text-xs rounded">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Category Code *</label>
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. ICT, FURN, LAB, TRANS"
              className="w-full p-2 border rounded font-mono uppercase"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Category Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. ICT & Computing Equipment"
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Useful Life (Years)</label>
            <input
              type="number"
              min="1"
              value={usefulLife}
              onChange={(e) => setUsefulLife(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Depreciation Method</label>
            <select value={method} onChange={(e) => setMethod(e.target.value)} className="w-full p-2 border rounded bg-white">
              <option value="straight_line">Straight-Line</option>
              <option value="reducing_balance">Reducing Balance</option>
              <option value="none">None (Non-Depreciable)</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full p-2 border rounded"
            />
          </div>

          <div className="pt-3 border-t flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-3 py-1.5 border rounded">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-1.5 bg-amber-500 text-slate-950 font-bold rounded">
              {submitting ? 'Creating...' : 'Create Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
