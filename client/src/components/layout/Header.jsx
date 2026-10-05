import React, { useState, useEffect, useRef } from 'react';
import { useAuth, DEMO_USERS } from '../../context/AuthContext';
import { api } from '../../api/client';
import {
  Search, Bell, Smartphone, User, LogOut, Check,
  ChevronDown, Building2, ShieldCheck, X
} from 'lucide-react';

export default function Header({ onNavigate, onSearchSelect }) {
  const { user, logout, switchUserQuick } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  const searchRef = useRef(null);
  const notifRef = useRef(null);
  const roleRef = useRef(null);
  const userRef = useRef(null);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/api/v1/notifications');
      if (res.success) {
        setNotifications(res.notifications || []);
        setUnreadCount(res.unreadCount || 0);
      }
    } catch (e) {
      // silent
    }
  };

  const handleSearchChange = async (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (!q.trim() || q.trim().length < 2) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    setIsSearching(true);
    setShowSearchDropdown(true);
    try {
      const res = await api.get('/api/v1/assets', { search: q.trim(), limit: 8 });
      if (res.success) {
        setSearchResults(res.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectAsset = (asset) => {
    setShowSearchDropdown(false);
    setSearchQuery('');
    if (onSearchSelect) onSearchSelect(asset);
  };

  const markAllRead = async () => {
    try {
      await api.put('/api/v1/notifications/read-all');
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <header className="bg-mocu-navy text-white border-b border-mocu-navyLight sticky top-0 z-30 shadow-md no-print">
      <div className="flex items-center justify-between px-4 py-2.5 h-16">
        {/* Brand & Emblem */}
        <div className="flex items-center gap-3">
          <div
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-2.5 cursor-pointer select-none"
          >
            <div className="w-10 h-10 rounded-lg bg-mocu-gold flex items-center justify-center font-black text-slate-950 text-xl tracking-tighter shadow">
              MoCU
            </div>
            <div className="hidden sm:block">
              <div className="text-sm font-extrabold tracking-wide text-white leading-tight">
                MOSHI CO-OPERATIVE UNIVERSITY
              </div>
              <div className="text-[11px] font-medium text-amber-300 flex items-center gap-1.5">
                <span>Enterprise Asset Management System</span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span className="text-[10px] text-emerald-300">Live</span>
              </div>
            </div>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="flex-1 max-w-lg mx-4 relative" ref={searchRef}>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => searchQuery.length >= 2 && setShowSearchDropdown(true)}
              placeholder="Search by Asset #, Barcode, Serial, Name, Model..."
              className="w-full pl-9 pr-8 py-1.5 rounded-lg bg-slate-900/80 border border-slate-700 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); setSearchResults([]); setShowSearchDropdown(false); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Search Dropdown */}
          {showSearchDropdown && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-white text-slate-900 rounded-lg shadow-2xl border border-slate-200 overflow-hidden z-50">
              <div className="px-3 py-1.5 bg-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider flex justify-between">
                <span>Matching Assets</span>
                {isSearching && <span className="animate-pulse text-amber-600">Searching...</span>}
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                {searchResults.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500">
                    {isSearching ? 'Searching university assets...' : 'No assets found matching query.'}
                  </div>
                ) : (
                  searchResults.map(asset => (
                    <div
                      key={asset.id}
                      onClick={() => handleSelectAsset(asset)}
                      className="p-2.5 hover:bg-slate-50 cursor-pointer flex items-center justify-between text-xs transition"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-bold text-slate-900 truncate">{asset.name}</div>
                        <div className="font-mono text-[11px] text-amber-700 font-semibold">{asset.asset_number}</div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {asset.category_name} • {asset.building_name || 'Unassigned'}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold">
                          {asset.barcode}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Navigation & Quick Actions */}
        <div className="flex items-center gap-2">
          {/* Quick Demo Switcher */}
          <div className="relative" ref={roleRef}>
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 text-xs font-semibold transition"
              title="Quickly switch between institutional roles for evaluation"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden md:inline">Role: {user?.role_name?.split(' ')[0] || user?.role}</span>
              <ChevronDown className="w-3 h-3 text-amber-300" />
            </button>

            {showRoleMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-72 bg-white text-slate-900 rounded-lg shadow-2xl border border-slate-200 py-1.5 z-50">
                <div className="px-3 py-1 border-b border-slate-100">
                  <div className="text-xs font-bold text-slate-900">Switch Persona (Demo Mode)</div>
                  <div className="text-[11px] text-slate-500">Test different role permissions easily:</div>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {DEMO_USERS.map(demo => {
                    const isCurrent = user?.username === demo.username;
                    return (
                      <button
                        key={demo.username}
                        onClick={async () => {
                          setShowRoleMenu(false);
                          await switchUserQuick(demo.username);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition ${isCurrent ? 'bg-amber-50 font-bold text-amber-900' : ''}`}
                      >
                        <div>
                          <div className="font-semibold flex items-center gap-1.5">
                            {demo.label}
                            {isCurrent && <span className="text-[10px] bg-amber-200 text-amber-900 px-1 rounded font-mono">Current</span>}
                          </div>
                          <div className="text-[11px] text-slate-500">{demo.desc}</div>
                        </div>
                        {isCurrent && <Check className="w-4 h-4 text-amber-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Switch to Dedicated Mobile Scanner View */}
          <button
            onClick={() => onNavigate('mobile-scanner')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition"
            title="Open Dedicated Mobile Camera Barcode Scanner View"
          >
            <Smartphone className="w-4 h-4" />
            <span className="hidden sm:inline">Mobile Scanner</span>
          </button>

          {/* Notifications Bell */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifMenu(!showNotifMenu)}
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white relative transition"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-80 bg-white text-slate-900 rounded-lg shadow-2xl border border-slate-200 overflow-hidden z-50">
                <div className="px-3.5 py-2.5 bg-slate-900 text-white flex items-center justify-between">
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-amber-400" />
                    <span>University Alerts ({unreadCount} new)</span>
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-[10px] text-amber-300 hover:underline font-semibold"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500">No notifications.</div>
                  ) : (
                    notifications.map(n => (
                      <div
                        key={n.id}
                        className={`p-3 text-xs hover:bg-slate-50 transition ${!n.is_read ? 'bg-amber-50/60' : ''}`}
                      >
                        <div className="font-bold text-slate-900 flex items-center justify-between">
                          <span>{n.title}</span>
                          {!n.is_read && <span className="w-2 h-2 rounded-full bg-amber-500"></span>}
                        </div>
                        <div className="text-slate-600 text-[11px] mt-0.5">{n.message}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile / Menu */}
          <div className="relative" ref={userRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1 pl-2 rounded-lg hover:bg-slate-800 text-slate-300 transition"
            >
              <div className="w-7 h-7 rounded-full bg-mocu-blue text-white flex items-center justify-center font-bold text-xs uppercase shadow">
                {user?.full_name?.charAt(0) || 'U'}
              </div>
              <div className="text-left hidden lg:block">
                <div className="text-xs font-semibold text-white leading-none truncate max-w-[120px]">
                  {user?.full_name?.split(' ')[0] || user?.username}
                </div>
                <div className="text-[10px] text-slate-400 leading-tight">
                  {user?.role_name || user?.role}
                </div>
              </div>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-56 bg-white text-slate-900 rounded-lg shadow-2xl border border-slate-200 py-1.5 z-50">
                <div className="px-3.5 py-2 border-b border-slate-100">
                  <div className="text-xs font-bold text-slate-900 truncate">{user?.full_name}</div>
                  <div className="text-[11px] text-slate-500 truncate">{user?.email}</div>
                  <div className="text-[10px] font-mono text-amber-700 font-semibold mt-0.5">{user?.role_name}</div>
                </div>
                <button
                  onClick={() => { setShowUserMenu(false); onNavigate('settings'); }}
                  className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Institutional Settings</span>
                </button>
                <button
                  onClick={() => { setShowUserMenu(false); logout(); }}
                  className="w-full text-left px-3.5 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 border-t border-slate-100"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
