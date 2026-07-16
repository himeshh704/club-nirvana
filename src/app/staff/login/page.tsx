'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, KeyRound, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export default function StaffLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [gate, setGate] = useState('Gate A');
  const [deviceName, setDeviceName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [existingSession, setExistingSession] = useState<{ user: string; role: string } | null>(null);

  useEffect(() => {
    // Check if already logged in
    const auth = localStorage.getItem('staff_authenticated');
    const role = localStorage.getItem('staff_role');
    const user = localStorage.getItem('staff_user');
    if (auth === 'true') {
      setExistingSession({ user: user || role || 'Staff', role: role || 'Security' });
    }

    if (typeof window !== 'undefined') {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      setDeviceName(isMobile ? 'Mobile Scanner Terminal' : 'Desktop Terminal');
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const userClean = username.trim().toLowerCase();
    const passClean = accessCode.trim();

    if (!passClean) {
      setError('Please enter your password / access code.');
      setLoading(false);
      return;
    }

    let targetRole = '';
    let targetUser = '';

    if ((userClean === 'superadmin' || userClean === 'admin' || userClean === '') && (passClean === 'admin8824' || passClean === 'admin123')) {
      targetRole = 'Admin';
      targetUser = 'Super Admin';
    } else if ((userClean === 'ankur bishnoi' || userClean === 'ankur' || userClean === '' || passClean === 'ankur1234') && passClean === 'ankur1234') {
      targetRole = 'Manager';
      targetUser = 'Ankur Bishnoi';
    } else if ((userClean === 'angad bishnoi' || userClean === 'angad' || userClean === '' || passClean === 'angad1234') && passClean === 'angad1234') {
      targetRole = 'Manager';
      targetUser = 'Angad Bishnoi';
    } else if ((userClean === 'staff' || userClean === 'gate' || userClean === '' || passClean === 'staf1234' || passClean === 'gate123') && (passClean === 'staf1234' || passClean === 'gate123')) {
      targetRole = 'Security';
      targetUser = 'Gate Staff';
    } else if (passClean === 'admin8824') {
      targetRole = 'Admin';
      targetUser = 'Super Admin';
    } else if (passClean === 'ankur1234') {
      targetRole = 'Manager';
      targetUser = 'Ankur Bishnoi';
    } else if (passClean === 'angad1234') {
      targetRole = 'Manager';
      targetUser = 'Angad Bishnoi';
    } else if (passClean === 'staf1234' || passClean === 'gate123') {
      targetRole = 'Security';
      targetUser = 'Gate Staff';
    } else {
      setError('Invalid Username or Password. Please verify credentials with coordinator.');
      setLoading(false);
      return;
    }

    localStorage.setItem('staff_authenticated', 'true');
    localStorage.setItem('staff_role', targetRole);
    localStorage.setItem('staff_user', targetUser);
    localStorage.setItem('staff_gate', gate);
    localStorage.setItem('staff_device', deviceName || 'Generic Gate Scanner');

    if (targetRole === 'Admin' || targetRole === 'Manager') {
      router.push('/admin');
    } else {
      router.push('/staff/dashboard');
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#060608] px-4 text-white">
      {/* Decorative Glows */}
      <div className="absolute top-1/3 left-1/2 -z-10 h-64 w-64 -translate-x-1/2 rounded-full bg-purple-950/20 opacity-30 blur-[100px]"></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/madsphere_logo.png" alt="MadSphere Logo" className="h-8 object-contain mb-2" />
          <span className="text-[10px] font-semibold tracking-[0.35em] text-zinc-500 uppercase">GATE CONTROL PORTAL</span>
        </div>

        {/* Login Form Panel */}
        <div className="glass-panel rounded-3xl p-8 border border-zinc-800 shadow-2xl">
          <div className="flex items-center gap-3 border-b border-zinc-800/80 pb-4 mb-6">
            <div className="rounded-xl bg-purple-500/10 p-2 text-purple-400">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">STAFF AUTHENTICATION</h2>
              <p className="text-xs text-zinc-500 font-light">Enter gate credentials to initialize terminal</p>
            </div>
          </div>

          {existingSession && (
            <div className="rounded-2xl bg-purple-950/30 border border-purple-500/30 p-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[10px] text-purple-300 font-semibold uppercase tracking-wider">Active Logged-In Session</p>
                  <p className="text-sm font-bold text-white mt-0.5">👤 {existingSession.user} <span className="text-xs font-normal text-zinc-400">({existingSession.role})</span></p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (existingSession.role === 'Admin' || existingSession.role === 'Manager') {
                      router.push('/admin');
                    } else {
                      router.push('/staff/dashboard');
                    }
                  }}
                  className="flex-1 rounded-xl bg-purple-600 py-2 px-3 text-xs font-bold text-white hover:bg-purple-500 transition-all text-center"
                >
                  Return to Console
                </button>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem('staff_authenticated');
                    localStorage.removeItem('staff_role');
                    localStorage.removeItem('staff_user');
                    localStorage.removeItem('staff_gate');
                    localStorage.removeItem('staff_device');
                    setExistingSession(null);
                  }}
                  className="rounded-xl border border-red-500/40 bg-red-500/10 py-2 px-3 text-xs font-semibold text-red-400 hover:bg-red-500 hover:text-white transition-all text-center"
                >
                  Log Out Session
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="rounded-xl bg-red-950/20 border border-red-500/15 p-3.5 text-xs text-red-400 font-medium">
                {error}
              </div>
            )}

            {/* Username / ID Input */}
            <div className="space-y-1.5">
              <label htmlFor="user" className="text-xs uppercase text-zinc-500 font-semibold tracking-wider block">Username / Role ID (Optional if Code Unique)</label>
              <input
                id="user"
                type="text"
                placeholder="e.g. ankur bishnoi, angad bishnoi, staff"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl bg-zinc-950 border border-zinc-900 px-4 py-3.5 text-sm text-white placeholder-zinc-700 gold-border-glow"
              />
            </div>

            {/* Access Code / Password Input */}
            <div className="space-y-1.5">
              <label htmlFor="code" className="text-xs uppercase text-zinc-500 font-semibold tracking-wider block">Password / Access Code *</label>
              <input
                id="code"
                type="password"
                required
                placeholder="••••••••"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                className="w-full rounded-xl bg-zinc-950 border border-zinc-900 px-4 py-3.5 text-sm text-white placeholder-zinc-700 gold-border-glow"
              />
            </div>

            {/* Gate Select */}
            <div className="space-y-1.5">
              <label htmlFor="gate" className="text-xs uppercase text-zinc-500 font-semibold tracking-wider block">Scanning Gate</label>
              <select
                id="gate"
                value={gate}
                onChange={(e) => setGate(e.target.value)}
                className="w-full rounded-xl bg-zinc-950 border border-zinc-900 px-4 py-3.5 text-sm text-white placeholder-zinc-700 gold-border-glow appearance-none"
              >
                <option value="Gate A">GATE A - Main Entrance</option>
                <option value="Gate B">GATE B - VIP/Artist Entry</option>
                <option value="Gate C">GATE C - Backstage / Staff</option>
              </select>
            </div>

            {/* Device Name Input */}
            <div className="space-y-1.5">
              <label htmlFor="device" className="text-xs uppercase text-zinc-500 font-semibold tracking-wider block">Scanner Device Identifier</label>
              <input
                id="device"
                type="text"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                className="w-full rounded-xl bg-zinc-950 border border-zinc-900 px-4 py-3.5 text-sm text-white gold-border-glow"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-purple-600 py-3.5 text-sm font-bold tracking-wider text-white transition-all hover:bg-purple-500 active:scale-95 disabled:opacity-50"
            >
              {loading ? 'INITIALIZING...' : 'AUTHORIZE & ENTRY'}
            </button>
          </form>
        </div>

        {/* Info */}
        <p className="mt-8 text-center text-xs text-zinc-600 max-w-xs mx-auto">
          Offline Mode notice: Gate terminal parameters will remain locally active during internet drops.
        </p>

        {/* Footer */}
        <footer className="mt-12 text-center text-[10px] text-zinc-600 tracking-widest uppercase font-semibold">
          Created by <a href="#" className="text-zinc-500 hover:text-white transition-colors">MadSphere</a>
        </footer>
      </motion.div>
    </div>
  );
}
