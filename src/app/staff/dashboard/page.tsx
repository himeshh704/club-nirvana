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
  Compass,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FolderDown,
  UserCheck,
  Download,
  Smartphone
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

type ScanResultState = 'idle' | 'valid' | 'already_used' | 'invalid' | 'banned';

interface ScanDetails {
  name: string;
  ticketType: string;
  entryTime?: string;
  usedAt?: string;
  message?: string;
}

export default function StaffDashboard() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  
  // Gate terminal metadata
  const [gate, setGate] = useState('Gate A');
  const [device, setDevice] = useState('');
  const [role, setRole] = useState('');
  
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

  // PWA install state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBanner(false);
    }
    setDeferredPrompt(null);
  };

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

    setGate(localStorage.getItem('staff_gate') || 'Gate A');
    setDevice(localStorage.getItem('staff_device') || 'Gate Scanner');
    setRole(localStorage.getItem('staff_role') || 'Security');

    // Setup network status listener
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      window.addEventListener('online', () => setIsOnline(true));
      window.addEventListener('offline', () => setIsOnline(false));
    }

    // Refresh database statistics
    refreshLocalStats();

    return () => {
      // Cleanup scanner if active
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop();
      }
    };
  }, [router]);

  // Sync automatically when network status switches to online
  useEffect(() => {
    if (isOnline && device && unsyncedCount > 0) {
      handleSync();
    }
  }, [isOnline, device]);

  // Refresh IndexedDB statistics
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

  // Synthesize Sound Effects Offline
  const playSound = (type: 'success' | 'error') => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const ctx = audioContextRef.current;
      
      if (type === 'success') {
        // High pitched double beep
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
        // Low pitched buzzer
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

  // Trigger Scanner Camera Action
  const toggleScanner = async () => {
    if (scannerActive) {
      // Stop scanner
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
      // Let React complete state update for UI, then initialize
      setTimeout(async () => {
        try {
          if (!html5QrCodeRef.current) {
            html5QrCodeRef.current = new Html5Qrcode("reader");
          }
          
          await html5QrCodeRef.current.start(
            { facingMode: "environment" },
            { 
              fps: 20
            },
            (decodedText) => {
              // Successfully decoded a QR token
              handleTicketScan(decodedText);
            },
            () => {
              // Scanner polling noise (ignore)
            }
          );
        } catch (err) {
          console.error('Failed to start camera scanner:', err);
          alert('Could not access camera. Please make sure to open this in Safari (iOS) or Chrome (Android) and grant camera access.');
          setScannerActive(false);
        }
      }, 100);
    }
  };

  // Process QR Ticket Scan
  const handleTicketScan = async (qrToken: string) => {
    // 1. Temporarily pause scanning
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (err) {
        console.error('Error pausing scanner:', err);
      }
    }
    setScannerActive(false);

    // 2. Scan Logic based on Connection state
    if (isOnline) {
      // ONLINE MODE: Send to backend database for real-time validation
      try {
        const res = await fetch('/api/tickets/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            qrToken,
            gate,
            scannerDevice: device
          })
        });

        if (!res.ok) throw new Error('API verify failed');
        const data = await res.json();

        if (data.status === 'valid') {
          setResultState('valid');
          setResultDetails({
            name: data.guestName,
            ticketType: data.ticketType,
            entryTime: data.entryTime
          });
          playSound('success');
          // VIP Confetti celebration
          if (data.ticketType === 'VIP') {
            confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
          }
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
            name: 'Corrupted Ticket',
            ticketType: 'Unknown',
            message: data.message || 'Signature mismatch'
          });
          playSound('error');
        }
      } catch (err) {
        console.error('Online scan verification error:', err);
        // Fallback to offline check if online check-in fails due to connection drop during call
        handleOfflineScanFallback(qrToken);
      }
    } else {
      // OFFLINE MODE: Local IndexedDB validation
      await handleOfflineScanFallback(qrToken);
    }
  };

  // Local Offline IndexedDB Scans Processing
  const handleOfflineScanFallback = async (qrToken: string) => {
    try {
      // Find ticket locally in cache
      const ticket = await getOfflineTicketByToken(qrToken);
      
      if (!ticket) {
        setResultState('invalid');
        setResultDetails({
          name: 'Unknown Guest',
          ticketType: 'Unknown',
          message: 'Ticket not found in local gate database cache. Re-sync online.'
        });
        playSound('error');
        return;
      }

      // Process checkin log
      const res = await logOfflineCheckin(ticket.id, qrToken, gate, device);

      if (res.status === 'success') {
        setResultState('valid');
        setResultDetails({
          name: ticket.name,
          ticketType: ticket.ticket_type,
          entryTime: new Date().toISOString()
        });
        playSound('success');
        if (ticket.ticket_type === 'VIP') {
          confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
        }
      } else if (res.status === 'already_used') {
        setResultState('already_used');
        setResultDetails({
          name: ticket.name,
          ticketType: ticket.ticket_type,
          usedAt: ticket.used_at || new Date().toISOString(),
          message: 'Already checked in locally at this gate'
        });
        playSound('error');
      } else if (res.status === 'banned') {
        setResultState('banned');
        setResultDetails({
          name: ticket.name,
          ticketType: ticket.ticket_type,
          message: 'Guest blacklisted. Access blocked.'
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

      // Refresh Stats UI
      await refreshLocalStats();
    } catch (err) {
      console.error('Offline scan execution error:', err);
      setResultState('invalid');
      setResultDetails({
        name: 'Database Error',
        ticketType: 'Unknown',
        message: 'Could not write to local IndexedDB.'
      });
      playSound('error');
    }
  };

  // Sync local offline checkins to database
  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);

    try {
      const res = await syncOfflineScans(device);
      if (res.success) {
        setLastSync(new Date().toLocaleTimeString());
        await refreshLocalStats();
        if (res.totalSynced > 0) {
          alert(`Sync complete! Successfully uploaded ${res.totalSynced} checks. Resolved ${res.conflicts} conflict entries.`);
        }
      } else {
        alert(`Sync failed: ${res.error || 'Network error'}`);
      }
    } catch (err) {
      console.error('Sync failed', err);
    } finally {
      setSyncing(false);
    }
  };

  // Download all tickets for offline check-ins
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
        alert(`Cache updated! ${data.tickets.length} valid tickets downloaded to offline memory.`);
      }
    } catch (err) {
      console.error(err);
      alert('Could not download database cache. Check server online status.');
    } finally {
      setDownloading(false);
    }
  };

  // Close Result Screen & Resume Scanner
  const closeResultOverlay = () => {
    setResultState('idle');
    setResultDetails(null);
    // Restart scanner
    toggleScanner();
  };

  const handleLogout = () => {
    localStorage.removeItem('staff_authenticated');
    localStorage.removeItem('staff_role');
    localStorage.removeItem('staff_gate');
    localStorage.removeItem('staff_device');
    router.push('/staff/login');
  };

  if (!authorized) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#060608] text-zinc-500 text-xs tracking-[0.3em] uppercase">
        Verifying Terminal Credentials...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#060608] text-white">
      {/* Header */}
      <header className="border-b border-zinc-900 bg-black/40 px-6 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/madsphere_logo.png" alt="MadSphere Logo" className="h-4 object-contain" />
            <div className="border-l border-zinc-800 pl-3">
              <span className="text-[10px] tracking-[0.25em] font-semibold text-zinc-500 uppercase block">TERMINAL</span>
              <div className="flex items-center gap-1.5 text-[10px] text-zinc-600 font-light">
                <span>{gate}</span>
                <span>•</span>
                <span>{device}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {isOnline ? (
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
                <Wifi className="h-3.5 w-3.5" /> ONLINE
              </span>
            ) : (
              <span className="flex items-center gap-1 rounded-full bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-400 border border-red-500/20 animate-pulse">
                <WifiOff className="h-3.5 w-3.5" /> OFFLINE
              </span>
            )}
            
            <button 
              onClick={handleLogout}
              className="rounded-xl bg-zinc-900 border border-zinc-800 p-2 text-zinc-400 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* PWA Install Banner */}
      {showInstallBanner && (
        <div className="bg-[#cca43b]/15 border-b border-[#cca43b]/30 px-6 py-3">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <Smartphone className="h-5 w-5 text-[#cca43b] shrink-0" />
              <div>
                <p className="text-xs font-semibold text-white">Install Offline Gate Scanner App</p>
                <p className="text-[11px] text-zinc-400">Add to Home Screen for instant launch & 100% offline entrance check-in.</p>
              </div>
            </div>
            <button
              onClick={handleInstallPWA}
              className="shrink-0 rounded-lg bg-[#cca43b] px-3.5 py-1.5 text-xs font-bold text-black hover:bg-[#cca43b]/90 transition"
            >
              Install App
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-4 flex flex-col justify-between">
        
        {/* Scanner Area */}
        <div className="flex-1 flex flex-col items-center justify-center py-4">
          {/* We keep the reader element always mounted in the DOM to prevent race conditions during instantiation */}
          <div className={`relative w-full max-w-xs aspect-square overflow-hidden rounded-3xl border-2 border-[#cca43b] bg-black ${scannerActive ? 'block' : 'hidden'}`}>
            <div id="reader" className="w-full h-full"></div>
            {/* Decorative scan target box */}
            <div className="absolute inset-10 border-2 border-dashed border-white/20 pointer-events-none rounded-xl"></div>
          </div>

          {!scannerActive && (
            <div className="w-full text-center py-6 flex flex-col items-center gap-2">
              <div className="rounded-2xl bg-zinc-950 border border-zinc-900 p-4 text-zinc-500 mb-2">
                <QrCode className="h-8 w-8 text-zinc-400 mx-auto" />
              </div>
              <h3 className="text-sm font-bold text-zinc-300 tracking-wider">GATE SCANNER DISCONNECTED</h3>
              <p className="text-[11px] text-zinc-500 max-w-[250px] mx-auto leading-relaxed">
                Terminal scanner is ready. Tap the floating &quot;Scan QR&quot; button below to open your camera.
              </p>
            </div>
          )}
        </div>

        {/* Sync Controls & Cache section */}
        <div className="space-y-4">
          
          {/* Unsynced Warning */}
          {unsyncedCount > 0 && (
            <div className="flex items-center justify-between rounded-2xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-amber-400">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-xs font-semibold">{unsyncedCount} UNSYNCED OFFLINE SCANS</span>
              </div>
              <button
                disabled={!isOnline || syncing}
                onClick={handleSync}
                className="flex items-center gap-1 rounded-lg bg-[#cca43b] px-3 py-1 text-xs font-bold text-zinc-950 disabled:opacity-40"
              >
                {syncing ? 'Syncing...' : 'Sync Now'}
              </button>
            </div>
          )}

          {/* Device Cache Card */}
          <div className="glass-panel rounded-2xl p-4 border border-zinc-900 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-500 uppercase tracking-wider font-semibold">Offline Gate Database Cache</span>
              <span className="font-bold text-zinc-300">{cachedCount} Tickets Cached</span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                disabled={downloading}
                onClick={handleDownloadCache}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-zinc-950 border border-zinc-900 py-3 text-xs font-semibold text-zinc-300 hover:bg-zinc-900"
              >
                <FolderDown className="h-3.5 w-3.5 text-[#cca43b]" />
                {downloading ? 'Caching...' : 'Download Cache'}
              </button>
              
              <button
                disabled={!isOnline || syncing}
                onClick={handleSync}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-zinc-950 border border-zinc-900 py-3 text-xs font-semibold text-zinc-300 hover:bg-zinc-900"
              >
                <RefreshCw className={`h-3.5 w-3.5 text-[#cca43b] ${syncing ? 'animate-spin' : ''}`} />
                Force DB Sync
              </button>
            </div>

            <div className="text-[10px] text-zinc-600 text-center flex justify-between px-1">
              <span>Last Network Sync: {lastSync}</span>
              <span>Role: {role}</span>
            </div>
          </div>
        </div>

        {/* Scan Results Full-Screen Overlay Screen */}
        <AnimatePresence>
          {resultState !== 'idle' && resultDetails && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`fixed inset-0 z-50 flex flex-col items-center justify-center px-6 text-center ${
                resultState === 'valid' ? 'bg-emerald-950' : 
                resultState === 'already_used' ? 'bg-red-950' :
                resultState === 'banned' ? 'bg-[#2a0e2a]' : 'bg-rose-950'
              }`}
            >
              <div className="max-w-sm space-y-6">
                
                {/* Large Icon */}
                <div className="flex justify-center">
                  {resultState === 'valid' && (
                    <CheckCircle2 className="h-24 w-24 text-emerald-400" />
                  )}
                  {resultState === 'already_used' && (
                    <AlertTriangle className="h-24 w-24 text-amber-400" />
                  )}
                  {resultState === 'invalid' && (
                    <XCircle className="h-24 w-24 text-red-500" />
                  )}
                  {resultState === 'banned' && (
                    <AlertTriangle className="h-24 w-24 text-fuchsia-500 animate-pulse" />
                  )}
                </div>

                {/* Result Title */}
                <div>
                  <span className="text-xs uppercase tracking-[0.25em] text-white/50">ENTRY VERIFICATION</span>
                  <h2 className="mt-1 text-3xl font-extrabold tracking-wide uppercase text-white">
                    {resultState === 'valid' && 'ENTRY ALLOWED'}
                    {resultState === 'already_used' && 'ALREADY CHECKED IN'}
                    {resultState === 'invalid' && 'INVALID TICKET'}
                    {resultState === 'banned' && 'BLACKLISTED / BANNED'}
                  </h2>
                </div>

                {/* Attendee details */}
                <div className="rounded-3xl bg-black/40 border border-white/5 p-6 backdrop-blur-md">
                  <span className="text-xs text-white/40 uppercase tracking-wider block">GUEST INFORMATION</span>
                  <span className="text-2xl font-bold mt-1 block text-white">{resultDetails.name}</span>
                  
                  {resultDetails.ticketType.includes('Table') ? (
                    <div className="mt-4 rounded-2xl bg-gradient-to-r from-[#cca43b] to-amber-600 p-3 text-black font-extrabold text-sm shadow-lg border border-yellow-300">
                      🍾 VIP TABLE ESCORT REQUIRED ({resultDetails.ticketType})
                    </div>
                  ) : (
                    <span className="inline-block mt-3 rounded-full bg-white/10 px-4 py-1 text-xs font-semibold text-white">
                      {resultDetails.ticketType.toUpperCase()}
                    </span>
                  )}

                  <div className="mt-6 border-t border-white/5 pt-4 text-xs space-y-2 text-white/70">
                    {resultState === 'valid' && (
                      <div className="flex justify-between">
                        <span>Authorized Gate:</span>
                        <span className="font-semibold text-emerald-400">{gate}</span>
                      </div>
                    )}
                    {resultState === 'already_used' && (
                      <>
                        <div className="flex justify-between">
                          <span>Original Scan Time:</span>
                          <span className="font-semibold text-amber-400">
                            {new Date(resultDetails.usedAt || '').toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="text-[10px] text-white/45 mt-2">
                          Warning: QR codes cannot be scanned multiple times.
                        </div>
                      </>
                    )}
                    {resultDetails.message && (
                      <div className="text-center font-medium mt-1 text-red-400">
                        {resultDetails.message}
                      </div>
                    )}
                  </div>
                </div>

                {/* Confirm Close Button */}
                <button
                  onClick={closeResultOverlay}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-white py-4 text-sm font-semibold tracking-wider text-black transition-all active:scale-95 shadow-xl hover:bg-zinc-100"
                >
                  <UserCheck className="h-4 w-4" />
                  CONFIRM & RESUME
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Floating upfront Scan QR button (Paytm/PhonePe style) */}
      <button
        onClick={toggleScanner}
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2.5 rounded-full px-8 py-3.5 text-sm font-extrabold text-white active:scale-95 transition-all cursor-pointer whitespace-nowrap border ${
          scannerActive 
            ? 'bg-zinc-900 border-zinc-800 shadow-[0_8px_30px_rgba(0,0,0,0.5)] hover:bg-zinc-800' 
            : 'bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 border-blue-400/20 shadow-[0_8px_30px_rgba(37,99,235,0.45)] hover:from-blue-500 hover:to-indigo-500'
        }`}
      >
        <QrCode className={`h-5 w-5 text-white ${!scannerActive ? 'animate-pulse' : ''}`} />
        <span>{scannerActive ? 'Cancel Scan' : 'Scan QR'}</span>
      </button>
    </div>
  );
}
