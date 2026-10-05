import React, { useState } from 'react';
import { useAuth, DEMO_USERS } from '../context/AuthContext';
import { Lock, User, ArrowRight, ShieldCheck, Building2, CheckCircle2 } from 'lucide-react';

export default function Login() {
  const { login, switchUserQuick } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Admin@123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async (userDemo) => {
    setError('');
    setLoading(true);
    try {
      await switchUserQuick(userDemo.username);
    } catch (err) {
      setError(err.message || 'Demo login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-mocu-navy to-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-white relative overflow-hidden">
      {/* Decorative background circles */}
      <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500 text-slate-950 font-black text-2xl shadow-2xl mb-4 border-2 border-amber-300">
          MoCU
        </div>
        <h1 className="text-2xl font-black tracking-tight text-white uppercase">
          Moshi Co-operative University
        </h1>
        <p className="mt-1 text-sm text-amber-300 font-semibold tracking-wide">
          ENTERPRISE ASSET MANAGEMENT SYSTEM (AMS)
        </p>
        <p className="text-xs text-slate-400 mt-0.5">
          Comprehensive lifecycle, barcode tracking, verification & institutional auditing
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <div className="bg-white/95 backdrop-blur-md py-8 px-6 shadow-2xl rounded-2xl border border-white/20 text-slate-900 sm:px-10">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Username or Staff Email
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin or user@mocu.ac.tz"
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Account Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex justify-center items-center gap-2 py-2.5 px-4 rounded-lg shadow-md text-sm font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-all disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign in to MoCU AMS'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Logins for Evaluators */}
          <div className="mt-6 pt-5 border-t border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                1-Click Persona Testing
              </span>
              <span className="text-[10px] text-slate-500 font-medium">Click to log in:</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
              {DEMO_USERS.map(demo => (
                <button
                  key={demo.username}
                  type="button"
                  onClick={() => handleQuickDemo(demo)}
                  className="text-left p-1.5 rounded-lg border border-slate-200 hover:border-amber-500 hover:bg-amber-50/60 transition text-[11px] group"
                >
                  <div className="font-bold text-slate-900 group-hover:text-amber-800 truncate">{demo.label}</div>
                  <div className="text-[10px] text-slate-500 truncate">{demo.username}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Institutional footer */}
        <div className="mt-4 text-center text-xs text-slate-400">
          Property of Moshi Co-operative University (MoCU) • Kilimanjaro, Tanzania
        </div>
      </div>
    </div>
  );
}
