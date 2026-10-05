import React, { useState } from 'react';
import { api } from '../api/client';
import { useNotify } from '../context/NotificationContext';
import { Upload, Download, FileText, CheckCircle2, AlertTriangle, AlertCircle, RefreshCw } from 'lucide-react';

export default function BulkImport() {
  const notify = useNotify();

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState(null);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) {
      setFile(f);
      setPreview(null);
      setCommitResult(null);
    }
  };

  const handleUploadPreview = async () => {
    if (!file) return;
    setLoadingPreview(true);
    setCommitResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.upload('/api/v1/import/preview', formData);
      if (res.success) {
        setPreview(res.preview);
        notify.info(`Validated ${res.preview.totalRows} rows: ${res.preview.validCount} valid, ${res.preview.errorCount} invalid.`);
      }
    } catch (err) {
      notify.error(err.message || 'Validation failed');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleCommit = async () => {
    if (!preview || preview.validCount === 0) return;

    const validRowsData = preview.rows.filter(r => r.isValid).map(r => r.parsedData);
    setCommitting(true);

    try {
      const res = await api.post('/api/v1/import/commit', { validRows: validRowsData });
      if (res.success) {
        setCommitResult(res.result);
        setPreview(null);
        setFile(null);
        notify.success(`Successfully committed ${res.result.importedCount} assets!`);
      }
    } catch (err) {
      notify.error(err.message || 'Import commit failed');
    } finally {
      setCommitting(false);
    }
  };

  const downloadTemplate = () => {
    const token = localStorage.getItem('mocu_token') || '';
    window.open(`/api/v1/import/template?token=${token}`, '_blank');
  };

  const exportAllAssets = (format = 'xlsx') => {
    const token = localStorage.getItem('mocu_token') || '';
    window.open(`/api/v1/export/assets?format=${format}&token=${token}`, '_blank');
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-black text-slate-900 tracking-tight">
          Bulk Asset Data Import & Export Engine
        </h1>
        <p className="text-xs text-slate-500">
          Upload institution-wide CSV/Excel inventories with pre-flight schema validation, duplicate detection, and automated sequence numbering
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Step 1: Download Template */}
        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
              1
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Download Official MoCU Template</h3>
              <p className="text-xs text-slate-500">Standardized CSV column headers matching university taxonomy</p>
            </div>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            The template includes columns for asset name, category code (e.g. ICT, FURN, LAB), serial number, building code, room code, department, custodian staff ID, acquisition cost, and funding source.
          </p>
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow transition"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>Download Template CSV</span>
          </button>
        </div>

        {/* Step 2: Full Export */}
        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold">
              2
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Export Institutional Catalogue</h3>
              <p className="text-xs text-slate-500">Comprehensive export of all registered university assets</p>
            </div>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Generate an up-to-the-minute institutional snapshot of all assets, barcodes, locations, book values, and warranty dates.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => exportAllAssets('xlsx')}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold shadow transition"
            >
              <Download className="w-4 h-4" />
              <span>Export Excel (.xlsx)</span>
            </button>
            <button
              onClick={() => exportAllAssets('csv')}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-lg text-xs font-bold transition"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Upload and Validate Box */}
      <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900">Upload & Validate Asset CSV File</h3>

        <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center space-y-3 bg-slate-50">
          <Upload className="w-8 h-8 text-slate-400 mx-auto" />
          <div className="text-xs text-slate-600">
            <label className="font-bold text-amber-700 hover:underline cursor-pointer">
              Choose a CSV file
              <input type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
            </label>
            <span className="text-slate-400"> or drag and drop here</span>
          </div>
          {file && (
            <div className="text-xs font-mono font-bold text-slate-900 bg-white inline-block px-3 py-1 rounded border">
              Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
            </div>
          )}
        </div>

        {file && !preview && (
          <div className="flex justify-end">
            <button
              onClick={handleUploadPreview}
              disabled={loadingPreview}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg shadow transition disabled:opacity-50"
            >
              {loadingPreview ? 'Validating Records...' : 'Pre-flight Validate Records'}
            </button>
          </div>
        )}
      </div>

      {/* Validation Preview Results */}
      {preview && (
        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm space-y-4 animate-scale-up">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Pre-Flight Validation Preview</h3>
              <p className="text-xs text-slate-500">
                {preview.validCount} valid rows ready for commit • {preview.errorCount} row{preview.errorCount === 1 ? '' : 's'} with errors
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPreview(null)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
              >
                Clear
              </button>
              <button
                onClick={handleCommit}
                disabled={committing || preview.validCount === 0}
                className="px-5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow disabled:opacity-50"
              >
                {committing ? 'Committing...' : `Commit ${preview.validCount} Valid Assets`}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto max-h-96 border rounded-lg">
            <table className="w-full text-left text-xs divide-y divide-slate-200">
              <thead className="bg-slate-50 font-bold text-slate-600 uppercase text-[10px]">
                <tr>
                  <th className="p-2.5">Row</th>
                  <th className="p-2.5">Status</th>
                  <th className="p-2.5">Asset Name</th>
                  <th className="p-2.5">Category</th>
                  <th className="p-2.5">Building</th>
                  <th className="p-2.5">Room</th>
                  <th className="p-2.5">Validation Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {preview.rows.map(r => (
                  <tr key={r.rowIndex} className={r.isValid ? 'bg-white' : 'bg-rose-50/60'}>
                    <td className="p-2.5 font-bold">{r.rowIndex}</td>
                    <td className="p-2.5">
                      {r.isValid ? (
                        <span className="text-emerald-700 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Valid
                        </span>
                      ) : (
                        <span className="text-rose-700 font-bold flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" /> Error
                        </span>
                      )}
                    </td>
                    <td className="p-2.5 font-semibold text-slate-900">{r.parsedData?.name || '—'}</td>
                    <td className="p-2.5">{r.parsedData?.category_code || '—'}</td>
                    <td className="p-2.5">{r.parsedData?.building_id ? 'Matched' : 'Unassigned'}</td>
                    <td className="p-2.5">{r.parsedData?.room_id ? 'Matched' : 'Unassigned'}</td>
                    <td className="p-2.5 text-[11px]">
                      {r.isValid ? (
                        <span className="text-slate-500">Ready to assign new sequence asset number</span>
                      ) : (
                        <span className="text-rose-700 font-semibold">{r.errors.join(', ')}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Import Success Summary */}
      {commitResult && (
        <div className="p-6 bg-emerald-50 rounded-xl border border-emerald-300 space-y-3">
          <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>Bulk Import Completed Successfully!</span>
          </div>
          <p className="text-xs text-emerald-800">
            Registered {commitResult.importedCount} institutional assets into MoCU AMS. All assets have received unique sequential barcodes and initial audit logs.
          </p>
        </div>
      )}
    </div>
  );
}
