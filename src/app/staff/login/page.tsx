'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Compass, ShieldCheck, KeyRound, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export default function StaffLoginPage() {
  const router = useRouter();
  const [accessCode, setAccessCode] = useState('');
  const [gate, setGate] = useState('Gate A');
  const [deviceName, setDeviceName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if already logged in
    const auth = localStorage.getItem('staff_authenticated');
    if (auth === 'true') {
      router.push('/staff/dashboard');
    }

    // Default device name based on browser/screen
    if (typeof window !== 'undefined') {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      setDeviceName(isMobile ? 'Mobile Scanner Terminal' : 'Desktop Terminal');
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!accessCode) {
      setError('Please enter your gate access code.');
      setLoading(false);
      return;
    }

    // Standard logins:
    // admin8824 -> role: Admin
    // gate123 -> role: Security
    if (accessCode === 'admin8824' || accessCode === 'gate123') {
      // Store auth state locally for offline PWA operation
      localStorage.setItem('staff_authenticated', 'true');
      localStorage.setItem('staff_role', accessCode === 'admin8824' ? 'Admin' : 'Security');
      localStorage.setItem('staff_gate', gate);
      localStorage.setItem('staff_device', deviceName || 'Generic Gate Scanner');

      router.push('/staff/dashboard');
    } else {
      setError('Invalid Access Code. Please check with the coordinator.');
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
          <div className="flex items-center gap-2">
            <Compass className="h-8 w-8 text-[#cca43b]" />
            <h1 className="text-3xl font-extrabold tracking-widest">VANGUARD</h1>
          </div>
          <span className="mt-2 text-xs font-semibold tracking-[0.3em] text-zinc-500 uppercase">GATE CONTROL PORTAL</span>
        </div>

        {/* Login Form Panel */}
        <div className="glass-panel rounded-3xl p-8 border border-zinc-800 shadow-2xl">
          <div className="flex items-center gap-3 border-b border-zinc-800/80 pb-4 mb-6">
            <div className="rounded-xl bg-amber-500/10 p-2 text-[#cca43b]">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">STAFF AUTHENTICATION</h2>
              <p className="text-xs text-zinc-500 font-light">Enter gate credentials to initialize terminal</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="rounded-xl bg-red-950/20 border border-red-500/15 p-3.5 text-xs text-red-400 font-medium">
                {error}
              </div>
            )}

            {/* Access Code Input */}
            <div className="space-y-1.5">
              <label htmlFor="code" className="text-xs uppercase text-zinc-500 font-semibold tracking-wider block">Access Code</label>
              <input
                id="code"
                type="password"
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
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#cca43b] py-3.5 text-sm font-semibold tracking-wider text-black transition-all hover:bg-[#ffe082] active:scale-95 disabled:opacity-50"
            >
              {loading ? 'INITIALIZING...' : 'AUTHORIZE & ENTRY'}
            </button>
          </form>
        </div>

        {/* Info */}
        <p className="mt-8 text-center text-xs text-zinc-600 max-w-xs mx-auto">
          Offline Mode notice: Gate terminal parameters will remain locally active during internet drops.
        </p>
      </motion.div>
    </div>
  );
}
