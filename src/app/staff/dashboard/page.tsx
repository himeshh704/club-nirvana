'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Wifi, 
  WifiOff, 
  QrCode, 
  RefreshCw, 
  Sparkles, 
  LogOut, 
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FolderDown,
  UserCheck,
  Smartphone,
  Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Html5Qrcode } from 'html5-qrcode';
import confetti from 'canvas-confetti';
import { 
  getOfflineTicketByToken, 
  logOfflineCheckin, 
  getCachedTicketsCount, 
  saveTicketsOffline,
  getUnsyncedCheckins
} from '@/lib/indexedDb';
import { syncOfflineScans } from '@/lib/syncEngine';

type ScanResultState = 'idle' | 'valid' | 'already_used' | 'invalid' | 'banned' | 'invalid_date';

interface ScanDetails {
  name: string;
  ticketType: string;
  validDays?: string;
  entryTime?: string;
  usedAt?: string;
  message?: string;
}

export default function StaffDashboard() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  
  // Gate terminal metadata & active date mode (Oct 18 = Day 1, Oct 19 = Day 2)
  const [gate, setGate] = useState('Gate A');
  const [device, setDevice] = useState('');
  const [role, setRole] = useState('');
  const [activeScanDate, setActiveScanDate] = useState<'Oct 18' | 'Oct 19'>('Oct 18');
  
  // Local network / storage states
  const [isOnline, setIsOnline] = useState(true);
  const [cachedCount, setCachedCount] = useState(0);
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const [lastSync, setLastSync] = useState<string>('Never');
  
  // Action states
  const [syncing, setSyncing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const [resultState, setResultState] = useState<ScanResultState>('idle');
  const [resultDetails, setResultDetails] = useState<ScanDetails | null>(null);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Authenticate and load terminal details
  useEffect(() => {
    const auth = localStorage.getItem('staff_authenticated');
    if (auth !== 'true') {
      router.push('/staff/login');
      return;
    }

    setAuthorized(true);
    setGate(localStorage.getItem('staff_gate') || 'Main Gate');
    setDevice(localStorage.getItem('staff_device') || 'Gate Scanner');
    setRole(localStorage.getItem('staff_role') || 'Security');

    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      window.addEventListener('online', () => setIsOnline(true));
      window.addEventListener('offline', () => setIsOnline(false));
    }

    refreshLocalStats();

    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop();
      }
    };
  }, [router]);

  useEffect(() => {
    if (isOnline && device && unsyncedCount > 0) {
      handleSync();
    }
  }, [isOnline, device]);

  const refreshLocalStats = async () => {
    try {
      const tickets = await getCachedTicketsCount();
      const unsynced = await getUnsyncedCheckins();
      setCachedCount(tickets);
      setUnsyncedCount(unsynced.length);
    } catch (err) {
      console.error('Error loading DB stats:', err);
    }
  };

  const playSound = (type: 'success' | 'error') => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      
      if (type === 'success') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);

        setTimeout(() => {
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(1000, ctx.currentTime);
          gain2.gain.setValueAtTime(0.1, ctx.currentTime);
          osc2.start();
          osc2.stop(ctx.currentTime + 0.15);
        }, 120);

      } else {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, ctx.currentTime);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch (err) {
      console.warn('Sound synthesis failed', err);
    }
  };

  const toggleScanner = async () => {
    if (scannerActive) {
      if (html5QrCodeRef.current) {
        try {
          if (html5QrCodeRef.current.isScanning) {
            await html5QrCodeRef.current.stop();
          }
          setScannerActive(false);
        } catch (err) {
          console.error('Error stopping scanner:', err);
        }
      }
    } else {
      setScannerActive(true);
      setTimeout(async () => {
        try {
          if (!html5QrCodeRef.current) {
            html5QrCodeRef.current = new Html5Qrcode("reader");
          }
          
          await html5QrCodeRef.current.start(
            { facingMode: "environment" },
            { fps: 20 },
            (decodedText) => {
              handleTicketScan(decodedText);
            },
            () => {}
          );
        } catch (err) {
          console.error('Failed to start camera scanner:', err);
          alert('Could not access camera. Please grant camera permissions.');
          setScannerActive(false);
        }
      }, 100);
    }
  };

  const handleTicketScan = async (qrToken: string) => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (err) {}
    }
    setScannerActive(false);

    if (isOnline) {
      try {
        const res = await fetch('/api/tickets/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            qrToken,
            gate,
            scannerDevice: device,
            scanDate: activeScanDate
          })
        });

        const data = await res.json();

        if (data.status === 'valid') {
          setResultState('valid');
          setResultDetails({
            name: data.guestName,
            ticketType: data.ticketType,
            validDays: data.validDays,
            entryTime: data.entryTime,
            message: data.message
          });
          playSound('success');
          confetti({ particleCount: 70, spread: 60, origin: { y: 0.7 } });
        } else if (data.status === 'invalid_date') {
          setResultState('invalid_date');
          setResultDetails({
            name: data.guestName,
            ticketType: data.ticketType,
            message: data.message
          });
          playSound('error');
        } else if (data.status === 'already_used') {
          setResultState('already_used');
          setResultDetails({
            name: data.guestName,
            ticketType: data.ticketType,
            usedAt: data.usedAt,
            message: data.message
          });
          playSound('error');
        } else if (data.status === 'banned') {
          setResultState('banned');
          setResultDetails({
            name: data.guestName,
            ticketType: data.ticketType,
            message: data.message
          });
          playSound('error');
        } else {
          setResultState('invalid');
          setResultDetails({
            name: 'Invalid Ticket',
            ticketType: 'Unknown',
            message: data.message || 'Signature verification failed'
          });
          playSound('error');
        }
      } catch (err) {
        console.error('Online scan verification error:', err);
        handleOfflineScanFallback(qrToken);
      }
    } else {
      await handleOfflineScanFallback(qrToken);
    }
  };

  const handleOfflineScanFallback = async (qrToken: string) => {
    try {
      const ticket = await getOfflineTicketByToken(qrToken);
      
      if (!ticket) {
        setResultState('invalid');
        setResultDetails({
          name: 'Unknown Ticket',
          ticketType: 'Unknown',
          message: 'Ticket not found in local offline memory.'
        });
        playSound('error');
        return;
      }

      const res = await logOfflineCheckin(ticket.id, qrToken, gate, device);

      if (res.status === 'success') {
        setResultState('valid');
        setResultDetails({
          name: ticket.name,
          ticketType: ticket.ticket_type,
          entryTime: new Date().toISOString()
        });
        playSound('success');
      } else if (res.status === 'already_used') {
        setResultState('already_used');
        setResultDetails({
          name: ticket.name,
          ticketType: ticket.ticket_type,
          message: 'Already checked in today at this gate'
        });
        playSound('error');
      } else {
        setResultState('invalid');
        setResultDetails({
          name: ticket.name,
          ticketType: ticket.ticket_type,
          message: 'Offline verification error'
        });
        playSound('error');
      }

      await refreshLocalStats();
    } catch (err) {
      console.error('Offline scan execution error:', err);
    }
  };

  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const res = await syncOfflineScans(device);
      if (res.success) {
        setLastSync(new Date().toLocaleTimeString());
        await refreshLocalStats();
        if (res.totalSynced > 0) {
          alert(`Sync complete! Uploaded ${res.totalSynced} scans to database.`);
        }
      }
    } catch (err) {
      console.error('Sync failed', err);
    } finally {
      setSyncing(false);
    }
  };

  const handleDownloadCache = async () => {
    if (downloading) return;
    setDownloading(true);

    try {
      const res = await fetch('/api/tickets/offline-list');
      if (!res.ok) throw new Error('Failed to download list');
      
      const data = await res.json();
      if (data.success && data.tickets) {
        await saveTicketsOffline(data.tickets);
        await refreshLocalStats();
        alert(`Downloaded ${data.tickets.length} ticket tokens for 100% offline gate scanning!`);
      }
    } catch (err) {
      alert('Could not download database cache. Ensure internet is active.');
    } finally {
      setDownloading(false);
    }
  };

  const closeResultOverlay = () => {
    setResultState('idle');
    setResultDetails(null);
    toggleScanner();
  };

  if (!authorized) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#070210] text-pink-400 text-xs tracking-widest uppercase">
        VERIFYING GATE TERMINAL CREDENTIALS...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#070210] text-white">
      {/* Header */}
      <header className="border-b border-zinc-900 bg-black/60 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/IMG_3217.PNG" alt="Logo" className="h-7 object-contain" />
            <div>
              <span className="text-xs font-black text-red-500 tracking-wider uppercase block">रंगीलो रास GATE TERMINAL</span>
              <div className="text-[10px] text-zinc-400">
                {gate} • {device}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isOnline ? (
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400 border border-emerald-500/20">
                <Wifi className="h-3 w-3" /> ONLINE
              </span>
            ) : (
              <span className="flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-0.5 text-[11px] font-bold text-red-400 border border-red-500/20 animate-pulse">
                <WifiOff className="h-3 w-3" /> OFFLINE
              </span>
            )}
            
            <button 
              onClick={() => { localStorage.removeItem('staff_authenticated'); router.push('/staff/login'); }}
              className="rounded-lg bg-zinc-900 border border-zinc-800 p-1.5 text-zinc-400 hover:text-white"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Date Switcher Bar */}
      <div className="bg-zinc-950 border-b border-zinc-900 px-4 py-2">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-semibold">
            <Calendar className="w-3.5 h-3.5 text-pink-400" /> Active Gate Date:
          </div>
          <div className="flex bg-zinc-900 p-0.5 rounded-lg border border-zinc-800 text-xs font-bold">
            <button
              onClick={() => setActiveScanDate('Oct 18')}
              className={`px-3 py-1 rounded-md transition ${activeScanDate === 'Oct 18' ? 'bg-pink-600 text-white shadow' : 'text-zinc-400 hover:text-white'}`}
            >
              Oct 18 (Day 1)
            </button>
            <button
              onClick={() => setActiveScanDate('Oct 19')}
              className={`px-3 py-1 rounded-md transition ${activeScanDate === 'Oct 19' ? 'bg-pink-600 text-white shadow' : 'text-zinc-400 hover:text-white'}`}
            >
              Oct 19 (Day 2)
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-4 flex flex-col justify-between">
        <div className="flex-1 flex flex-col items-center justify-center py-4">
          <div className={`relative w-full max-w-xs aspect-square overflow-hidden rounded-3xl border-2 border-pink-500 bg-black ${scannerActive ? 'block' : 'hidden'}`}>
            <div id="reader" className="w-full h-full"></div>
            <div className="absolute inset-10 border-2 border-dashed border-pink-400/40 pointer-events-none rounded-xl"></div>
          </div>

          {!scannerActive && (
            <div className="w-full text-center py-6 flex flex-col items-center gap-2">
              <div className="rounded-2xl bg-zinc-900/80 border border-pink-500/20 p-4 text-pink-400 mb-2">
                <QrCode className="h-8 w-8 text-pink-400 mx-auto" />
              </div>
              <h3 className="text-sm font-bold text-white tracking-wider">GATE SCANNER READY ({activeScanDate.toUpperCase()})</h3>
              <p className="text-xs text-zinc-400 max-w-[250px] mx-auto">
                Tap &quot;Scan QR Code&quot; below to open camera and scan attendee tickets.
              </p>
            </div>
          )}
        </div>

        {/* Offline Cache & Actions */}
        <div className="space-y-3">
          {unsyncedCount > 0 && (
            <div className="flex items-center justify-between rounded-xl bg-amber-500/10 border border-amber-500/20 px-3.5 py-2 text-amber-400 text-xs">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>{unsyncedCount} UNSYNCED OFFLINE SCANS</span>
              </div>
              <button
                disabled={!isOnline || syncing}
                onClick={handleSync}
                className="rounded-md bg-amber-500 px-2.5 py-1 text-xs font-bold text-black disabled:opacity-40"
              >
                {syncing ? 'Syncing...' : 'Sync'}
              </button>
            </div>
          )}

          <div className="bg-zinc-900/80 rounded-2xl p-3.5 border border-zinc-800 space-y-2.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-400 font-semibold">Offline Gate Manifest:</span>
              <span className="font-bold text-pink-400">{cachedCount} Tickets Cached</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                disabled={downloading}
                onClick={handleDownloadCache}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-zinc-950 border border-zinc-800 py-2.5 text-xs font-bold text-zinc-300 hover:bg-zinc-800 transition"
              >
                <FolderDown className="h-3.5 w-3.5 text-pink-400" />
                {downloading ? 'Caching...' : 'Download Manifest'}
              </button>
              
              <button
                disabled={!isOnline || syncing}
                onClick={handleSync}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-zinc-950 border border-zinc-800 py-2.5 text-xs font-bold text-zinc-300 hover:bg-zinc-800 transition"
              >
                <RefreshCw className={`h-3.5 w-3.5 text-pink-400 ${syncing ? 'animate-spin' : ''}`} />
                Force Sync
              </button>
            </div>
          </div>
        </div>

        {/* Scan Result Overlay */}
        <AnimatePresence>
          {resultState !== 'idle' && resultDetails && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`fixed inset-0 z-50 flex flex-col items-center justify-center px-6 text-center ${
                resultState === 'valid' ? 'bg-emerald-950' : 
                resultState === 'invalid_date' ? 'bg-amber-950' :
                resultState === 'already_used' ? 'bg-red-950' : 'bg-rose-950'
              }`}
            >
              <div className="max-w-sm space-y-6 w-full">
                <div className="flex justify-center">
                  {resultState === 'valid' && <CheckCircle2 className="h-24 w-24 text-emerald-400" />}
                  {resultState === 'invalid_date' && <AlertTriangle className="h-24 w-24 text-amber-400" />}
                  {resultState === 'already_used' && <XCircle className="h-24 w-24 text-rose-500" />}
                  {resultState === 'banned' && <XCircle className="h-24 w-24 text-purple-400 animate-pulse" />}
                  {resultState === 'invalid' && <XCircle className="h-24 w-24 text-red-500" />}
                </div>

                <div>
                  <span className="text-xs uppercase tracking-widest text-white/50">ENTRY VERIFICATION ({activeScanDate.toUpperCase()})</span>
                  <h2 className="mt-1 text-2xl font-black tracking-wide uppercase text-white">
                    {resultState === 'valid' && '✅ ENTRY ALLOWED'}
                    {resultState === 'invalid_date' && '🟧 WRONG DATE PASS'}
                    {resultState === 'already_used' && '🟥 ALREADY SCANNED TODAY'}
                    {resultState === 'banned' && '🚨 BLACKLISTED GUEST'}
                    {resultState === 'invalid' && '❌ INVALID / FAKE TICKET'}
                  </h2>
                </div>

                <div className="rounded-3xl bg-black/50 border border-white/10 p-6 backdrop-blur-md text-left">
                  <div className="text-xs text-white/50 uppercase">PASS HOLDER</div>
                  <div className="text-xl font-black text-white mt-0.5">{resultDetails.name}</div>
                  
                  <div className="mt-3">
                    <span className="inline-block rounded-full bg-pink-500/20 border border-pink-500/30 px-3 py-1 text-xs font-bold text-pink-300">
                      {resultDetails.ticketType}
                    </span>
                  </div>

                  {resultDetails.message && (
                    <div className="mt-4 pt-3 border-t border-white/10 text-xs font-bold text-white">
                      {resultDetails.message}
                    </div>
                  )}
                </div>

                <button
                  onClick={closeResultOverlay}
                  className="w-full py-4 rounded-2xl bg-white text-black font-extrabold text-sm shadow-2xl hover:bg-zinc-200 transition"
                >
                  NEXT SCAN
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Floating Scan Button */}
      <button
        onClick={toggleScanner}
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-full px-8 py-3.5 text-sm font-black text-white shadow-2xl transition-all ${
          scannerActive ? 'bg-zinc-800' : 'bg-gradient-to-r from-pink-600 via-rose-600 to-amber-500 animate-pulse'
        }`}
      >
        <QrCode className="h-5 w-5" />
        <span>{scannerActive ? 'Cancel Scan' : 'Scan QR Code'}</span>
      </button>
    </div>
  );
}
