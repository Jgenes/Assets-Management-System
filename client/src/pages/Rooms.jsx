import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNotify } from '../context/NotificationContext';
import { formatCurrency, getConditionBadge } from '../utils/formatters';
import { DoorOpen, Building, Plus, Eye, Package, User, X } from 'lucide-react';

export default function Rooms({ onSelectAsset }) {
  const { can } = useAuth();
  const notify = useNotify();

  const [rooms, setRooms] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [buildingFilter, setBuildingFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Selected Room Details Modal
  const [selectedRoomDetail, setSelectedRoomDetail] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const loadRooms = async () => {
    setLoading(true);
    try {
      const params = {};
      if (buildingFilter) params.building_id = buildingFilter;
      if (typeFilter) params.location_type = typeFilter;

      const [rRes, bRes, dRes, sRes] = await Promise.all([
        api.get('/api/v1/rooms', params),
        api.get('/api/v1/buildings'),
        api.get('/api/v1/departments'),
        api.get('/api/v1/staff')
      ]);
      if (rRes.success) setRooms(rRes.rooms || []);
      if (bRes.success) setBuildings(bRes.buildings || []);
      if (dRes.success) setDepartments(dRes.departments || []);
      if (sRes.success) setStaffList(sRes.staff || []);
    } catch (e) {
      notify.error('Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
  }, [buildingFilter, typeFilter]);

  const openRoomDetail = async (id) => {
    try {
      const res = await api.get(`/api/v1/rooms/${id}`);
      if (res.success) {
        setSelectedRoomDetail(res.room);
      }
    } catch (e) {
      notify.error('Failed to load room details');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Office & Room Management</h1>
          <p className="text-xs text-slate-500">Offices, research laboratories, lecture halls, server rooms and stores</p>
        </div>

        {can('locations:manage') && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Room/Office</span>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-3">
        <select
          value={buildingFilter}
          onChange={(e) => setBuildingFilter(e.target.value)}
          className="p-2 border border-slate-300 rounded-lg text-xs bg-white"
        >
          <option value="">All Buildings</option>
          {buildings.map(b => (
            <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
          ))}
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="p-2 border border-slate-300 rounded-lg text-xs bg-white"
        >
          <option value="">All Location Types</option>
          <option value="office">Office</option>
          <option value="laboratory">Laboratory</option>
          <option value="server_room">Server Room</option>
          <option value="lecture_room">Lecture Room</option>
          <option value="library">Library</option>
          <option value="store">Store</option>
          <option value="meeting_room">Meeting Room</option>
          <option value="workshop">Workshop</option>
          <option value="hostel">Hostel</option>
        </select>

        <span className="text-xs text-slate-500 self-center ml-auto font-medium">
          {rooms.length} rooms listed
        </span>
      </div>

      {/* Rooms Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs divide-y divide-slate-200">
          <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="p-3">Room Code</th>
              <th className="p-3">Room Name</th>
              <th className="p-3">Building & Floor</th>
              <th className="p-3">Location Type</th>
              <th className="p-3">Department</th>
              <th className="p-3">Responsible Staff</th>
              <th className="p-3 text-center">Assigned Assets</th>
              <th className="p-3 text-right">Room Value</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {rooms.map(rm => (
              <tr key={rm.id} className="hover:bg-slate-50 transition">
                <td className="p-3 font-mono font-bold text-slate-900">{rm.room_code}</td>
                <td className="p-3 font-bold text-slate-800">{rm.room_name}</td>
                <td className="p-3">
                  <div className="font-semibold text-slate-900">{rm.building_name}</div>
                  <div className="text-[10px] text-slate-400">{rm.floor_name || 'Ground'}</div>
                </td>
                <td className="p-3 capitalize">
                  <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-semibold text-slate-700">
                    {rm.location_type?.replace('_', ' ')}
                  </span>
                </td>
                <td className="p-3 text-slate-700 font-medium">{rm.department_name || 'Central'}</td>
                <td className="p-3 text-slate-700">{rm.responsible_staff_name || 'Unassigned'}</td>
                <td className="p-3 text-center">
                  <span className="font-black text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    {rm.assets_count || 0}
                  </span>
                </td>
                <td className="p-3 text-right font-black text-slate-900">
                  {formatCurrency(rm.total_room_value)}
                </td>
                <td className="p-3 text-center">
                  <button
                    onClick={() => openRoomDetail(rm.id)}
                    className="px-2.5 py-1 bg-mocu-navy hover:bg-slate-800 text-white rounded text-[11px] font-bold shadow-sm inline-flex items-center gap-1"
                  >
                    <Eye className="w-3 h-3 text-amber-400" />
                    <span>View Assets</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Room Assets Modal */}
      {selectedRoomDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-scale-up">
            <div className="bg-mocu-navy text-white p-4 flex items-center justify-between border-b border-mocu-navyLight">
              <div>
                <span className="text-[10px] font-mono bg-amber-500 text-slate-950 font-black px-1.5 py-0.5 rounded">
                  {selectedRoomDetail.room_code}
                </span>
                <h3 className="text-base font-extrabold text-white mt-1">{selectedRoomDetail.room_name}</h3>
                <div className="text-[11px] text-slate-300">
                  {selectedRoomDetail.building_name} • {selectedRoomDetail.department_name || 'Central'} • {selectedRoomDetail.assets?.length || 0} Assets Assigned
                </div>
              </div>
              <button onClick={() => setSelectedRoomDetail(null)} className="p-1 rounded text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              <h4 className="font-bold text-slate-900 uppercase text-[10px] tracking-wider">
                All Institutional Assets in this Room
              </h4>

              {selectedRoomDetail.assets?.length === 0 ? (
                <div className="p-8 text-center text-slate-400 border border-dashed rounded-lg">
                  No assets currently assigned to this room.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border rounded-lg overflow-hidden">
                  {selectedRoomDetail.assets?.map(asset => {
                    const cond = getConditionBadge(asset.condition);
                    return (
                      <div key={asset.id} className="p-3 bg-white hover:bg-slate-50 flex items-center justify-between">
                        <div>
                          <span className="font-mono font-bold text-amber-800">{asset.asset_number}: </span>
                          <span className="font-bold text-slate-900">{asset.name}</span>
                          <div className="text-[10px] text-slate-500">
                            {asset.category_name} • Custodian: {asset.custodian_name || 'Dept. Pool'}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${cond.bg} ${cond.text}`}>
                            {cond.label}
                          </span>
                          <div className="font-bold text-slate-900 mt-0.5">{formatCurrency(asset.acquisition_cost)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Room Modal */}
      {showAddModal && (
        <AddRoomModal
          buildings={buildings}
          departments={departments}
          staffList={staffList}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            notify.success('Room created successfully!');
            loadRooms();
          }}
        />
      )}
    </div>
  );
}

function AddRoomModal({ buildings, departments, staffList, onClose, onSuccess }) {
  const [buildingId, setBuildingId] = useState(buildings[0]?.id || 1);
  const [roomCode, setRoomCode] = useState('');
  const [roomName, setRoomName] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [responsibleStaffId, setResponsibleStaffId] = useState('');
  const [locationType, setLocationType] = useState('office');
  const [capacity, setCapacity] = useState(1);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!buildingId || !roomCode || !roomName) {
      setError('Building, room code and room name are required.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/api/v1/rooms', {
        building_id: buildingId,
        room_code: roomCode,
        room_name: roomName,
        department_id: departmentId || null,
        responsible_staff_id: responsibleStaffId || null,
        location_type: locationType,
        capacity: parseInt(capacity, 10),
        description
      });
      if (res.success) onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to create room');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
        <div className="flex justify-between items-center border-b pb-2">
          <h3 className="text-sm font-bold text-slate-900">Add New Office or Room</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400" /></button>
        </div>

        {error && <div className="p-2 bg-rose-50 text-rose-800 text-xs rounded">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Building *</label>
            <select
              value={buildingId}
              onChange={(e) => setBuildingId(e.target.value)}
              className="w-full p-2 border rounded bg-white"
            >
              {buildings.map(b => (
                <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Room Code *</label>
            <input
              type="text"
              required
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              placeholder="e.g. A101, ICT-01, CL-101"
              className="w-full p-2 border rounded font-mono uppercase"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Room Name *</label>
            <input
              type="text"
              required
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="e.g. Software Development Lab"
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Location Type</label>
            <select
              value={locationType}
              onChange={(e) => setLocationType(e.target.value)}
              className="w-full p-2 border rounded bg-white"
            >
              <option value="office">Office</option>
              <option value="laboratory">Laboratory</option>
              <option value="server_room">Server Room</option>
              <option value="lecture_room">Lecture Room</option>
              <option value="library">Library</option>
              <option value="store">Store</option>
              <option value="meeting_room">Meeting Room</option>
              <option value="workshop">Workshop</option>
              <option value="hostel">Hostel</option>
              <option value="staff_room">Staff Room</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Department Assigned</label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="w-full p-2 border rounded bg-white"
            >
              <option value="">None / Central</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Responsible Staff Custodian</label>
            <select
              value={responsibleStaffId}
              onChange={(e) => setResponsibleStaffId(e.target.value)}
              className="w-full p-2 border rounded bg-white"
            >
              <option value="">None</option>
              {staffList.map(s => (
                <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
              ))}
            </select>
          </div>

          <div className="pt-3 border-t flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-3 py-1.5 border rounded">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-1.5 bg-amber-500 text-slate-950 font-bold rounded">
              {submitting ? 'Creating...' : 'Create Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
