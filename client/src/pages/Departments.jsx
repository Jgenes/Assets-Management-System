import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNotify } from '../context/NotificationContext';
import { formatCurrency } from '../utils/formatters';
import {
  Briefcase, Building, DoorOpen, Users, Package,
  ChevronRight, ChevronDown, Plus, Eye, X, Phone, Mail
} from 'lucide-react';

export default function Departments({ onSelectAsset }) {
  const { can } = useAuth();
  const notify = useNotify();

  const [departments, setDepartments] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading] = useState(true);

  // Hierarchy drilldown drawer
  const [selectedHierarchyDept, setSelectedHierarchyDept] = useState(null);
  const [hierarchyData, setHierarchyData] = useState(null);
  const [loadingHierarchy, setLoadingHierarchy] = useState(false);
  const [expandedBuildings, setExpandedBuildings] = useState(new Set());
  const [expandedRooms, setExpandedRooms] = useState(new Set());

  const [showAddModal, setShowAddModal] = useState(false);

  const loadDepartments = async () => {
    setLoading(true);
    try {
      const [dRes, fRes] = await Promise.all([
        api.get('/api/v1/departments'),
        api.get('/api/v1/faculties')
      ]);
      if (dRes.success) setDepartments(dRes.departments || []);
      if (fRes.success) setFaculties(fRes.faculties || []);
    } catch (e) {
      notify.error('Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDepartments();
  }, []);

  const openHierarchy = async (dept) => {
    setSelectedHierarchyDept(dept);
    setLoadingHierarchy(true);
    setExpandedBuildings(new Set());
    setExpandedRooms(new Set());
    try {
      const res = await api.get(`/api/v1/departments/${dept.id}/hierarchy`);
      if (res.success) {
        setHierarchyData(res);
        // Expand first building by default
        if (res.buildings?.length > 0) {
          setExpandedBuildings(new Set([res.buildings[0].id]));
        }
      }
    } catch (e) {
      notify.error('Failed to load departmental asset drilldown');
    } finally {
      setLoadingHierarchy(false);
    }
  };

  const toggleBuilding = (id) => {
    const next = new Set(expandedBuildings);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedBuildings(next);
  };

  const toggleRoom = (id) => {
    const next = new Set(expandedRooms);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedRooms(next);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            Academic & Administrative Departments
          </h1>
          <p className="text-xs text-slate-500">
            Faculties, directorates, institutes, academic departments and administrative units
          </p>
        </div>

        {can('locations:manage') && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Department</span>
          </button>
        )}
      </div>

      {/* Department Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {departments.map(dept => (
          <div
            key={dept.id}
            className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition overflow-hidden flex flex-col justify-between"
          >
            <div className="p-5 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded border border-amber-300">
                    {dept.code}
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900 mt-1">{dept.name}</h3>
                  <div className="text-[11px] text-slate-500">{dept.faculty_name || 'Central Administration'}</div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  {dept.status}
                </span>
              </div>

              <div className="text-xs text-slate-600 space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <div className="font-semibold text-slate-800">Head: {dept.head_of_department || 'Appointed HOD'}</div>
                {dept.contact_email && (
                  <div className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Mail className="w-3 h-3 text-slate-400" />
                    <span>{dept.contact_email}</span>
                  </div>
                )}
              </div>

              {/* Counts */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
                <div className="p-2 bg-slate-50 rounded-lg">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Staff</div>
                  <div className="text-sm font-black text-slate-900">{dept.staff_count || 0}</div>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Rooms</div>
                  <div className="text-sm font-black text-slate-900">{dept.rooms_count || 0}</div>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Assets</div>
                  <div className="text-sm font-black text-amber-700">{dept.assets_count || 0}</div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Total Asset Value</div>
                <div className="text-xs font-black text-slate-900">{formatCurrency(dept.total_asset_value)}</div>
              </div>

              <button
                onClick={() => openHierarchy(dept)}
                className="px-3 py-1.5 rounded-lg bg-mocu-navy hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              >
                <Eye className="w-3.5 h-3.5 text-amber-400" />
                <span>Drilldown Hierarchy</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Department Hierarchy Modal (Department -> Buildings -> Offices -> Staff -> Assets) */}
      {selectedHierarchyDept && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-scale-up">
            <div className="bg-mocu-navy text-white p-4 flex items-center justify-between border-b border-mocu-navyLight">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono bg-amber-500 text-slate-950 font-black px-1.5 py-0.5 rounded">
                    {selectedHierarchyDept.code}
                  </span>
                  <span className="text-xs text-amber-300 font-bold uppercase tracking-wider">
                    Institutional Hierarchy Drilldown
                  </span>
                </div>
                <h2 className="text-base font-extrabold text-white mt-1">{selectedHierarchyDept.name}</h2>
                <div className="text-[11px] text-slate-300">
                  Department → Buildings → Offices → Staff → Assets
                </div>
              </div>
              <button onClick={() => setSelectedHierarchyDept(null)} className="p-1 rounded text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-700">
              {loadingHierarchy ? (
                <div className="flex justify-center p-12 text-slate-500">
                  <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mr-2"></div>
                  <span>Loading department asset tree...</span>
                </div>
              ) : (
                <>
                  {/* Department Staff Summary */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-blue-600" />
                      <span>Departmental Staff & Custodians ({hierarchyData?.staff?.length || 0})</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {hierarchyData?.staff?.map(st => (
                        <div key={st.id} className="p-2.5 rounded bg-white border border-slate-200 flex justify-between items-center">
                          <div>
                            <div className="font-bold text-slate-900">{st.staff_name}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{st.staff_id} • {st.position}</div>
                          </div>
                          <div className="text-right">
                            <span className="font-black text-amber-700 text-xs">{st.assigned_assets_count}</span>
                            <span className="block text-[9px] text-slate-400">assets</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Nested Hierarchy Tree */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <Building className="w-4 h-4 text-emerald-600" />
                      <span>Facility Drilldown: Buildings → Rooms → Assets</span>
                    </h4>

                    {hierarchyData?.buildings?.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 border border-dashed rounded-lg">
                        No physical rooms or assets recorded for this department.
                      </div>
                    ) : (
                      hierarchyData?.buildings?.map(bld => {
                        const isBldExpanded = expandedBuildings.has(bld.id);
                        return (
                          <div key={bld.id} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                            {/* Building Header */}
                            <div
                              onClick={() => toggleBuilding(bld.id)}
                              className="p-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between cursor-pointer transition select-none"
                            >
                              <div className="flex items-center gap-2">
                                {isBldExpanded ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                                <Building className="w-4 h-4 text-emerald-700" />
                                <span className="font-bold text-slate-900">{bld.name}</span>
                                <span className="font-mono text-[10px] bg-slate-200 text-slate-700 px-1 rounded">{bld.code}</span>
                              </div>
                              <span className="text-xs text-slate-500 font-semibold">{bld.rooms?.length || 0} Rooms / Offices</span>
                            </div>

                            {/* Rooms inside Building */}
                            {isBldExpanded && (
                              <div className="p-3 pl-6 space-y-3 bg-white border-t border-slate-100">
                                {bld.rooms?.map(rm => {
                                  const isRmExpanded = expandedRooms.has(rm.id);
                                  return (
                                    <div key={rm.id} className="border border-slate-200 rounded-lg overflow-hidden">
                                      <div
                                        onClick={() => toggleRoom(rm.id)}
                                        className="p-2.5 bg-slate-50/70 hover:bg-slate-100 flex items-center justify-between cursor-pointer select-none"
                                      >
                                        <div className="flex items-center gap-2">
                                          {isRmExpanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />}
                                          <DoorOpen className="w-3.5 h-3.5 text-blue-600" />
                                          <span className="font-bold text-slate-900">{rm.room_name}</span>
                                          <span className="font-mono text-[10px] text-slate-500">({rm.room_code})</span>
                                          <span className="text-[10px] text-slate-400 capitalize">• {rm.location_type}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs">
                                          <span className="text-slate-500">
                                            Responsible: {rm.custodian_name || 'Staff'}
                                          </span>
                                          <span className="font-black text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                            {rm.assets?.length || 0} assets
                                          </span>
                                        </div>
                                      </div>

                                      {/* Assets in Room */}
                                      {isRmExpanded && (
                                        <div className="p-2.5 pl-6 bg-white divide-y divide-slate-100">
                                          {rm.assets?.length === 0 ? (
                                            <div className="p-2 text-slate-400 italic">No assets located in this room.</div>
                                          ) : (
                                            rm.assets?.map(a => (
                                              <div key={a.id} className="py-2 flex items-center justify-between hover:bg-slate-50">
                                                <div>
                                                  <span className="font-mono font-bold text-amber-800">{a.asset_number}: </span>
                                                  <span className="font-bold text-slate-900">{a.name}</span>
                                                  <div className="text-[10px] text-slate-500">
                                                    Custodian: {a.custodian_name || 'Dept. Pool'} • Status: {a.status}
                                                  </div>
                                                </div>
                                                <div className="text-right">
                                                  <span className="font-bold text-slate-900">{formatCurrency(a.current_book_value)}</span>
                                                  <span className="block text-[10px] text-slate-400 capitalize">{a.condition}</span>
                                                </div>
                                              </div>
                                            ))
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Department Modal */}
      {showAddModal && (
        <AddDepartmentModal
          faculties={faculties}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            notify.success('Department created successfully!');
            loadDepartments();
          }}
        />
      )}
    </div>
  );
}

function AddDepartmentModal({ faculties, onClose, onSuccess }) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [facultyId, setFacultyId] = useState(faculties[0]?.id || 1);
  const [headOfDepartment, setHeadOfDepartment] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!code || !name) {
      setError('Department code and name are required.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/api/v1/departments', {
        code,
        name,
        faculty_id: facultyId,
        head_of_department: headOfDepartment,
        contact_email: contactEmail,
        contact_phone: contactPhone,
        description
      });
      if (res.success) onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to create department');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
        <div className="flex justify-between items-center border-b pb-2">
          <h3 className="text-sm font-bold text-slate-900">Add New Department / Unit</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400" /></button>
        </div>

        {error && <div className="p-2 bg-rose-50 text-rose-800 text-xs rounded">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Department Code *</label>
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. ICT, ACC_FIN, ESTATES"
              className="w-full p-2 border rounded font-mono uppercase"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Department Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Department of Information and Communication Technology"
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Faculty / School</label>
            <select
              value={facultyId}
              onChange={(e) => setFacultyId(e.target.value)}
              className="w-full p-2 border rounded bg-white"
            >
              {faculties.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Head of Department (HOD)</label>
            <input
              type="text"
              value={headOfDepartment}
              onChange={(e) => setHeadOfDepartment(e.target.value)}
              placeholder="e.g. Mr. Baraka J. Mushi"
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Contact Email</label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="e.g. ict.head@mocu.ac.tz"
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Contact Phone</label>
            <input
              type="text"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="e.g. +255 27 2754401"
              className="w-full p-2 border rounded"
            />
          </div>

          <div className="pt-3 border-t flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-3 py-1.5 border rounded">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-1.5 bg-amber-500 text-slate-950 font-bold rounded">
              {submitting ? 'Creating...' : 'Create Department'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
