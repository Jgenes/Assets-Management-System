import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export const DEMO_USERS = [
  { role: 'super_admin', label: 'Super Administrator', username: 'admin', desc: 'Full institutional control' },
  { role: 'asset_admin', label: 'Asset Administrator', username: 'asset.admin', desc: 'Locations, verification, transfers' },
  { role: 'asset_officer', label: 'Asset Officer', username: 'asset.officer', desc: 'Registration, barcode printing' },
  { role: 'department_admin', label: 'HOD ICT (Dept Admin)', username: 'ict.hod', desc: 'ICT departmental view & requests' },
  { role: 'custodian', label: 'Staff Custodian (Dr. Tarimo)', username: 'custodian', desc: 'Assigned assets & sign-off' },
  { role: 'finance_officer', label: 'Chief Financial Officer', username: 'finance', desc: 'Depreciation & financial audits' },
  { role: 'internal_auditor', label: 'Internal Auditor', username: 'auditor', desc: 'Audit trails & compliance' },
  { role: 'mobile_verifier', label: 'Mobile Verifier', username: 'verifier', desc: 'Mobile physical audits & scans' }
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('mocu_ams_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('mocu_ams_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function verifySession() {
      if (token) {
        try {
          const res = await api.get('/api/v1/auth/me');
          if (res.success && res.user) {
            setUser(res.user);
            localStorage.setItem('mocu_ams_user', JSON.stringify(res.user));
          }
        } catch (e) {
          console.warn('Session verification failed, clearing auth:', e);
          logout();
        }
      }
      setLoading(false);
    }

    verifySession();

    const handleAuthExpired = () => {
      logout();
    };
    window.addEventListener('mocu:auth:expired', handleAuthExpired);
    return () => window.removeEventListener('mocu:auth:expired', handleAuthExpired);
  }, [token]);

  const login = async (username, password) => {
    const res = await api.post('/api/v1/auth/login', { username, password });
    if (res.success && res.token) {
      setToken(res.token);
      setUser(res.user);
      localStorage.setItem('mocu_ams_token', res.token);
      localStorage.setItem('mocu_ams_user', JSON.stringify(res.user));
      return res.user;
    }
    throw new Error(res.message || 'Login failed');
  };

  const switchUserQuick = async (username) => {
    // Standard passwords for demo roles
    const passwords = {
      'admin': 'Admin@123',
      'asset.admin': 'Asset@123',
      'asset.officer': 'Officer@123',
      'ict.hod': 'Hod@123',
      'finance': 'Finance@123',
      'auditor': 'Auditor@123',
      'verifier': 'Verifier@123',
      'custodian': 'Custodian@123'
    };

    const pwd = passwords[username] || 'Admin@123';
    return await login(username, pwd);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('mocu_ams_token');
    localStorage.removeItem('mocu_ams_user');
  };

  const hasRole = (...roles) => {
    if (!user) return false;
    if (user.role === 'super_admin') return true;
    return roles.includes(user.role);
  };

  const can = (permission) => {
    if (!user) return false;
    if (user.role === 'super_admin') return true;
    if (user.permissions && user.permissions.includes('*')) return true;
    return user.permissions && user.permissions.includes(permission);
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isAuthenticated: Boolean(token && user),
      loading,
      login,
      logout,
      switchUserQuick,
      hasRole,
      can
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
