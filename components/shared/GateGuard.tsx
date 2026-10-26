'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Lock, User, AlertCircle, Eye, EyeOff } from 'lucide-react';

const GATE_KEY = 'elansary_gate_passed';
const GATE_USERNAME = 'elansary';
const GATE_PASSWORD = 'elansary';

export default function GateGuard({ children }: { children: React.ReactNode }) {
  const [gatePassed, setGatePassed] = useState<boolean | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [dots, setDots] = useState(0);

  useEffect(() => {
    const passed = sessionStorage.getItem(GATE_KEY) === 'true';
    setGatePassed(passed);
  }, []);

  // Animate dots while loading
  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => setDots(d => (d + 1) % 4), 350);
    return () => clearInterval(interval);
  }, [loading]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setError('');

      if (username.trim().toLowerCase() === GATE_USERNAME && password === GATE_PASSWORD) {
        setLoading(true);
        setTimeout(() => {
          sessionStorage.setItem(GATE_KEY, 'true');
          setGatePassed(true);
        }, 900);
      } else {
        setShake(true);
        setTimeout(() => setShake(false), 600);
        setError('Invalid credentials. Access denied.');
        setPassword('');
      }
    },
    [username, password]
  );

  // Still checking sessionStorage
  if (gatePassed === null) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Gate already passed
  if (gatePassed) {
    return <>{children}</>;
  }

  // Show lock screen
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #eab308 0%, transparent 70%)' }}
        />
        <div
          className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #eab308 0%, transparent 70%)' }}
        />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              'linear-gradient(rgba(234,179,8,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(234,179,8,0.3) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <div
        className={`relative w-full max-w-sm transition-all duration-200 ${shake ? 'animate-[shake_0.4s_ease-in-out]' : ''}`}
        style={
          shake
            ? { animation: 'shake 0.4s ease-in-out' }
            : {}
        }
      >
        {/* Card */}
        <div
          className="rounded-3xl border border-zinc-800 p-8 space-y-7 shadow-2xl"
          style={{
            background: 'linear-gradient(145deg, #18181b 0%, #09090b 100%)',
            boxShadow: '0 25px 60px -12px rgba(0,0,0,0.8), 0 0 0 1px rgba(234,179,8,0.08)',
          }}
        >
          {/* Icon + branding */}
          <div className="text-center space-y-3">
            <div className="relative inline-flex">
              <div
                className="absolute inset-0 rounded-2xl blur-xl opacity-50"
                style={{ background: 'radial-gradient(circle, #eab308 0%, transparent 70%)' }}
              />
              <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-yellow-400 shadow-lg shadow-yellow-400/30">
                <Shield className="w-8 h-8 text-zinc-950" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">Restricted Access</h1>
              <p className="text-xs text-zinc-500 font-semibold mt-1 uppercase tracking-widest">
                El-Ansary Service Center
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-zinc-800" />
            <Lock className="w-3.5 h-3.5 text-zinc-600" />
            <div className="flex-1 h-px bg-zinc-800" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-950/60 border border-red-800/50 text-red-400 text-xs font-bold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Username */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 pointer-events-none" />
                <input
                  id="gate-username"
                  type="text"
                  autoComplete="off"
                  autoFocus
                  value={username}
                  onChange={e => {
                    setUsername(e.target.value);
                    setError('');
                  }}
                  placeholder="Enter username"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-600 font-medium focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/30 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 pointer-events-none" />
                <input
                  id="gate-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="off"
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  placeholder="••••••••"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl pl-10 pr-12 py-3 text-sm text-white placeholder-zinc-600 font-medium focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/30 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              id="gate-submit"
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-black text-sm text-zinc-950 transition-all duration-200 shadow-lg shadow-yellow-400/20 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: loading
                  ? '#ca8a04'
                  : 'linear-gradient(135deg, #fbbf24 0%, #eab308 100%)',
              }}
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin inline-block" />
                  Verifying{'.'.repeat(dots)}
                </span>
              ) : (
                'Unlock Access'
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-[11px] text-zinc-700 font-semibold uppercase tracking-widest">
            Authorized Personnel Only
          </p>
        </div>
      </div>

      {/* Shake keyframe injected inline */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15%       { transform: translateX(-8px); }
          30%       { transform: translateX(7px); }
          45%       { transform: translateX(-6px); }
          60%       { transform: translateX(5px); }
          75%       { transform: translateX(-3px); }
          90%       { transform: translateX(2px); }
        }
      `}</style>
    </div>
  );
}
