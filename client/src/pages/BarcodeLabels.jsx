import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import AssetLabel from '../components/barcode/AssetLabel';
import { Printer, Filter, CheckSquare, Square, RefreshCw, Download, Layers } from 'lucide-react';

export default function BarcodeLabels() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [labelSize, setLabelSize] = useState('standard'); // 'standard', 'compact', 'detailed'

  // Filters
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [buildings, setBuildings] = useState([]);

  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState('');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [aRes, cRes, dRes, bRes] = await Promise.all([
          api.get('/api/v1/assets', { limit: 100 }),
          api.get('/api/v1/categories'),
          api.get('/api/v1/departments'),
          api.get('/api/v1/buildings')
        ]);
        if (aRes.success) {
          setAssets(aRes.data || []);
          // By default, select all for quick printing
          setSelectedIds(new Set((aRes.data || []).map(a => a.id)));
        }
        if (cRes.success) setCategories(cRes.categories || []);
        if (dRes.success) setDepartments(dRes.departments || []);
        if (bRes.success) setBuildings(bRes.buildings || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleApplyFilter = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/v1/assets', {
        category_id: selectedCategory,
        department_id: selectedDepartment,
        building_id: selectedBuilding,
        limit: 150
      });
      if (res.success) {
        setAssets(res.data || []);
        setSelectedIds(new Set((res.data || []).map(a => a.id)));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const selectAll = () => setSelectedIds(new Set(assets.map(a => a.id)));
  const deselectAll = () => setSelectedIds(new Set());

  const printableAssets = assets.filter(a => selectedIds.has(a.id));

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            Institutional Barcode & Label Printing Studio
          </h1>
          <p className="text-xs text-slate-500">
            Generate Code 128 barcodes and QR code labels for physical asset tagging and audit readiness
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-white border border-slate-300 p-1 rounded-lg text-xs shadow-sm">
            <button
              onClick={() => setLabelSize('compact')}
              className={`px-2.5 py-1 rounded font-bold transition ${
                labelSize === 'compact' ? 'bg-amber-500 text-slate-950' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Compact (40x20mm)
            </button>
            <button
              onClick={() => setLabelSize('standard')}
              className={`px-2.5 py-1 rounded font-bold transition ${
                labelSize === 'standard' ? 'bg-amber-500 text-slate-950' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Standard (50x30mm)
            </button>
            <button
              onClick={() => setLabelSize('detailed')}
              className={`px-2.5 py-1 rounded font-bold transition ${
                labelSize === 'detailed' ? 'bg-amber-500 text-slate-950' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Detailed (70x45mm)
            </button>
          </div>

          <button
            onClick={handlePrint}
            disabled={printableAssets.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-mocu-navy hover:bg-slate-800 text-white rounded-lg text-xs font-black shadow-lg transition disabled:opacity-50"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>Print {printableAssets.length} Labels</span>
          </button>
        </div>
      </div>

      {/* Batch Filter Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3 no-print">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-amber-600" />
            <span>Batch Label Generation Filters</span>
          </span>
          <div className="flex items-center gap-2 text-xs">
            <button onClick={selectAll} className="text-amber-700 hover:underline font-semibold">Select All</button>
            <span className="text-slate-300">|</span>
            <button onClick={deselectAll} className="text-slate-500 hover:underline">Deselect All</button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="p-2 border border-slate-300 rounded-lg bg-white"
          >
            <option value="">By Category (All)</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="p-2 border border-slate-300 rounded-lg bg-white"
          >
            <option value="">By Department (All)</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          <select
            value={selectedBuilding}
            onChange={(e) => setSelectedBuilding(e.target.value)}
            className="p-2 border border-slate-300 rounded-lg bg-white"
          >
            <option value="">By Building (All)</option>
            {buildings.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>

          <button
            onClick={handleApplyFilter}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition"
          >
            Apply Batch Filter
          </button>
        </div>
      </div>

      {/* Printable Sheet Viewport */}
      <div className="bg-slate-200/80 p-8 rounded-2xl border border-slate-300 min-h-[500px] flex flex-wrap gap-4 justify-center printable-area shadow-inner">
        {loading ? (
          <div className="flex items-center justify-center p-12 text-slate-500">
            <div className="w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin mr-2"></div>
            <span>Generating barcode graphics...</span>
          </div>
        ) : printableAssets.length === 0 ? (
          <div className="p-12 text-center text-slate-500 no-print">
            No assets selected for printing. Check the boxes above.
          </div>
        ) : (
          printableAssets.map(asset => (
            <div key={asset.id} className="relative group">
              <AssetLabel asset={asset} size={labelSize} />
              {/* Checkbox badge to toggle in preview mode */}
              <button
                onClick={() => toggleSelect(asset.id)}
                className="absolute top-1 right-1 p-1 bg-white/90 rounded-full shadow hover:bg-white text-slate-700 no-print"
                title="Remove from print batch"
              >
                <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
