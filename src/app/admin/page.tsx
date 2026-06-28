'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  UserCheck, 
  Ticket, 
  Compass, 
  TrendingUp, 
  Sparkles, 
  Copy, 
  Check, 
  Download, 
  PlusCircle, 
  QrCode, 
  RefreshCcw,
  ShieldCheck,
  Search,
  MessageSquare,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import { Html5Qrcode } from 'html5-qrcode';

interface DashboardStats {
  totalGuests: number;
  checkedIn: number;
  remaining: number;
  vipGuests: number;
}

interface RecentCheckin {
  id: string;
  name: string;
  ticketType: string;
  gate: string;
  timestamp: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  // Stats
  const [stats, setStats] = useState<DashboardStats>({
    totalGuests: 0,
    checkedIn: 0,
    remaining: 0,
    vipGuests: 0
  });
  const [recentCheckins, setRecentCheckins] = useState<RecentCheckin[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  // Form inputs
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState('21');
  const [gender, setGender] = useState('Male');
  const [instagram, setInstagram] = useState('');
  const [ticketType, setTicketType] = useState('Regular');
  
  // Creation States
  const [generating, setGenerating] = useState(false);
  const [generatedTicket, setGeneratedTicket] = useState<{
    ticketId: string;
    ticketType: string;
    qrToken: string;
    guestName: string;
    guestPhone: string;
    linkUrl: string;
    qrDataUrl: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // White-label settings states
  const [activeTab, setActiveTab] = useState<'create' | 'branding'>('create');
  const [brandTitle, setBrandTitle] = useState('VANGUARD // NOTHING');
  const [brandSubtitle, setBrandSubtitle] = useState('AN EXCLUSIVE MULTISENSORY CLUB EXPERIENCE');
  const [brandDate, setBrandDate] = useState('To Be Disclosed');
  const [brandTime, setBrandTime] = useState('9:00 PM - 4:00 AM');
  const [brandVenue, setBrandVenue] = useState('Club Nirvana');
  const [brandAddress, setBrandAddress] = useState('Jodhpur');
  const [brandColor, setBrandColor] = useState('gold');
  const [savingBranding, setSavingBranding] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Gate Scanner tab states inside Admin Panel
  const [adminScannerOpen, setAdminScannerOpen] = useState(false);
  const [scanningResult, setScanningResult] = useState<string>('idle'); // idle, valid, already_used, invalid, banned
  const [scanningDetails, setScanningDetails] = useState({
    name: '',
    ticketType: '',
    message: '',
    usedAt: ''
  });
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  // Lineup & Support States
  const [brandLineupArtist, setBrandLineupArtist] = useState('KAYLA (Berlin)');
  const [brandLineupGenre, setBrandLineupGenre] = useState('DEEP NOIR / TECHNO');
  const [brandSupportArtist, setBrandSupportArtist] = useState('AETHER SOUNDS');
  const [brandSupportGenre, setBrandSupportGenre] = useState('MELODIC PROGRESSIVE');

  // Fetch metrics and recent scans
  const fetchMetrics = async () => {
    setLoadingStats(true);
    try {
      // Direct fetch from offline-list API to calculate metrics client side
      const res = await fetch('/api/tickets/offline-list');
      if (!res.ok) throw new Error('Failed to fetch ticket list');
      const data = await res.json();
      
      if (data.success && data.tickets) {
        const list = data.tickets;
        const total = list.length;
        const checked = list.filter((t: any) => t.is_used).length;
        const vip = list.filter((t: any) => t.ticket_type === 'VIP').length;
        
        setStats({
          totalGuests: total,
          checkedIn: checked,
          remaining: Math.max(0, total - checked),
          vipGuests: vip
        });

        // Derive recent checked-in list (mocking gate info for dashboard display)
        const recent = list
          .filter((t: any) => t.is_used)
          .sort((a: any, b: any) => new Date(b.used_at).getTime() - new Date(a.used_at).getTime())
          .slice(0, 5)
          .map((t: any) => ({
            id: t.id,
            name: t.name,
            ticketType: t.ticket_type,
            gate: 'Gate A',
            timestamp: t.used_at
          }));
        
        setRecentCheckins(recent);
      }
    } catch (error) {
      console.error('Error fetching admin metrics:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  // Clean up scanner on unmount
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(err => console.error('Cleanup scanner error:', err));
      }
    };
  }, []);

  const playSynthSound = (success: boolean) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (success) {
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(880, ctx.currentTime);
        gain1.gain.setValueAtTime(0.1, ctx.currentTime);
        osc1.start();
        osc1.stop(ctx.currentTime + 0.1);

        setTimeout(() => {
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(1200, ctx.currentTime);
          gain2.gain.setValueAtTime(0.1, ctx.currentTime);
          osc2.start();
          osc2.stop(ctx.currentTime + 0.15);
        }, 100);
      } else {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      }
    } catch (err) {
      console.warn('Sound synthesis failed', err);
    }
  };

  const handleAdminTicketScan = async (qrToken: string) => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (err) {
        console.error('Error pausing scanner:', err);
      }
    }
    setAdminScannerOpen(false);

    try {
      const res = await fetch('/api/tickets/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrToken,
          gate: 'Admin Gate',
          scannerDevice: 'Admin Console'
        })
      });

      if (!res.ok) throw new Error('API verify failed');
      const data = await res.json();

      setScanningResult(data.status);
      setScanningDetails({
        name: data.guestName || 'Unknown Guest',
        ticketType: data.ticketType || 'Regular',
        message: data.message || '',
        usedAt: data.usedAt || ''
      });

      if (data.status === 'valid') {
        playSynthSound(true);
        if (data.ticketType === 'VIP') {
          confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
        }
      } else {
        playSynthSound(false);
      }
      
      // Update statistics and tables
      fetchMetrics();
    } catch (err) {
      console.error('Admin scan verification error:', err);
      setScanningResult('invalid');
      setScanningDetails({
        name: 'Verification Failed',
        ticketType: 'Unknown',
        message: 'Database check failed or connection lost.',
        usedAt: ''
      });
      playSynthSound(false);
    }
  };

  const toggleAdminScanner = async () => {
    if (adminScannerOpen) {
      if (html5QrCodeRef.current) {
        try {
          if (html5QrCodeRef.current.isScanning) {
            await html5QrCodeRef.current.stop();
          }
          setAdminScannerOpen(false);
        } catch (err) {
          console.error('Error stopping scanner:', err);
        }
      }
    } else {
      setAdminScannerOpen(true);
      setScanningResult('idle');
      setTimeout(async () => {
        try {
          if (!html5QrCodeRef.current) {
            html5QrCodeRef.current = new Html5Qrcode("admin-modal-reader");
          }
          await html5QrCodeRef.current.start(
            { facingMode: "environment" },
            { fps: 20 },
            (decodedText) => {
              handleAdminTicketScan(decodedText);
            },
            () => {}
          );
        } catch (err) {
          console.error('Failed to start scanner:', err);
          alert('Could not access camera. Please check permissions.');
          setAdminScannerOpen(false);
        }
      }, 100);
    }
  };

  const fetchBranding = async () => {
    try {
      const res = await fetch('/api/event/settings');
      if (res.ok) {
        const data = await res.json();
        if (data && data.title) {
          setBrandTitle(data.title);
          setBrandSubtitle(data.subtitle);
          setBrandDate(data.date);
          setBrandTime(data.time);
          setBrandVenue(data.venue);
          setBrandAddress(data.address);
          setBrandColor(data.accent_color);
          setBrandLineupArtist(data.lineup_artist || 'KAYLA (Berlin)');
          setBrandLineupGenre(data.lineup_genre || 'DEEP NOIR / TECHNO');
          setBrandSupportArtist(data.support_artist || 'AETHER SOUNDS');
          setBrandSupportGenre(data.support_genre || 'MELODIC PROGRESSIVE');
        }
      }
    } catch (error) {
      console.error('Error loading branding:', error);
    }
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBranding(true);
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/event/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'admin8824'
        },
        body: JSON.stringify({
          title: brandTitle,
          subtitle: brandSubtitle,
          date: brandDate,
          time: brandTime,
          venue: brandVenue,
          address: brandAddress,
          accent_color: brandColor,
          lineup_artist: brandLineupArtist,
          lineup_genre: brandLineupGenre,
          support_artist: brandSupportArtist,
          support_genre: brandSupportGenre
        })
      });

      if (!res.ok) {
        let errMsg = `Branding update failed (Status: ${res.status})`;
        try {
          const text = await res.text();
          try {
            const errData = JSON.parse(text);
            if (errData && errData.error) errMsg = errData.error;
          } catch (_) {
            if (text) errMsg += `: ${text.slice(0, 100)}`;
          }
        } catch (_) {}
        throw new Error(errMsg);
      }
      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        throw new Error(data.error || 'Server rejected updates');
      }
    } catch (error: any) {
      console.error('Failed to save branding:', error);
      alert(error.message || 'Saving failed. Please try again.');
    } finally {
      setSavingBranding(false);
    }
  };

  useEffect(() => {
    const auth = localStorage.getItem('staff_authenticated');
    const role = localStorage.getItem('staff_role');
    
    if (auth !== 'true' || role !== 'Admin') {
      router.push('/staff/login');
      return;
    }
    
    setAuthorized(true);
    fetchMetrics();
    fetchBranding();
    
    // Auto-refresh stats every 30 seconds
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, [router]);

  // Form Submit Handler
  const handleGenerateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) {
      alert('Please fill in Name and Phone.');
      return;
    }

    setGenerating(true);
    try {
      const cleanPhone = phone.replace(/\D/g, '');
      const emailValue = `${cleanPhone || Date.now()}@event.com`;

      const response = await fetch('/api/tickets/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          email: emailValue,
          age,
          gender,
          instagram: '',
          ticket_type: ticketType
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create ticket');
      }

      const data = await response.json();
      
      if (data.success) {
        // Construct guest link
        const passLink = `${window.location.origin}/?ticket=${data.qrToken}`;
        
        // Generate client QR code display (Level L error correction minimizes density/dot count for instant scanning)
        const qrUrl = await QRCode.toDataURL(data.qrToken, { margin: 2, errorCorrectionLevel: 'L' });

        setGeneratedTicket({
          ticketId: data.ticketId,
          ticketType: data.ticketType,
          qrToken: data.qrToken,
          guestName: data.guestName,
          guestPhone: phone,
          linkUrl: passLink,
          qrDataUrl: qrUrl
        });

        // Reset Form
        setName('');
        setPhone('');
        setEmail('');
        setInstagram('');
        
        // Celebrate success
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        
        // Refresh Stats
        fetchMetrics();
      }
    } catch (err: any) {
      console.error('Error creating ticket:', err);
      alert(err.message || 'Error occurred during ticket registration');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyLink = () => {
    if (!generatedTicket) return;
    navigator.clipboard.writeText(generatedTicket.linkUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareQR = async () => {
    if (!generatedTicket) return;
    try {
      // Direct base64 to Blob conversion (fixes Safari/Chrome mobile fetch failures)
      const byteString = atob(generatedTicket.qrDataUrl.split(',')[1]);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: 'image/png' });
      const filename = `ticket-${generatedTicket.guestName.toLowerCase().replace(/\s+/g, '-')}.png`;
      const file = new File([blob], filename, { type: 'image/png' });
      
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Vanguard Entry Pass',
          text: `Here is the signed QR entrance pass for ${generatedTicket.guestName}!`
        });
      } else {
        const link = document.createElement('a');
        link.href = generatedTicket.qrDataUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Error sharing/saving QR code:', error);
      const win = window.open();
      if (win) {
        win.document.write(`<img src="${generatedTicket.qrDataUrl}" style="max-width: 100%; height: auto; margin: auto; display: block;" />`);
      }
    }
  };

  const handleSendWhatsApp = () => {
    if (!generatedTicket) return;
    
    // Format phone number (remove spaces, symbols; ensure country code)
    let cleanNumber = generatedTicket.guestPhone.replace(/\D/g, '');
    if (cleanNumber.length === 10) {
      cleanNumber = '91' + cleanNumber; // Default to India prefix if 10 digits
    }
    
    const message = `Hey *${generatedTicket.guestName}*! 🎟️\n\nHere is your entrance ticket pass for *${brandTitle}* at ${brandVenue}, ${brandAddress}.\n\nType: *${generatedTicket.ticketType}*\nPass Link: ${generatedTicket.linkUrl}\n\nPlease keep this link or QR image ready at the entrance gate for scanning! See you there. 🥂`;
    const waUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  const percentCheckedIn = stats.totalGuests > 0 
    ? Math.round((stats.checkedIn / stats.totalGuests) * 100) 
    : 0;

  if (!authorized) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#060608] text-zinc-500 text-xs tracking-[0.3em] uppercase">
        Verifying Admin Credentials...
      </div>
    );
  }

  const themes: Record<string, { bg: string; text: string; border: string; borderDashed: string; glow: string; textHover: string; badge: string }> = {
    gold: {
      bg: 'bg-[#cca43b]',
      text: 'text-[#cca43b]',
      border: 'border-[#cca43b]',
      borderDashed: 'border-[#cca43b]/40',
      glow: 'shadow-[#cca43b]/10',
      textHover: 'hover:text-[#cca43b]',
      badge: 'bg-[#cca43b]/10 border-[#cca43b]/20 text-[#cca43b]'
    },
    pink: {
      bg: 'bg-pink-500',
      text: 'text-pink-500',
      border: 'border-pink-500',
      borderDashed: 'border-pink-500/40',
      glow: 'shadow-pink-500/10',
      textHover: 'hover:text-pink-500',
      badge: 'bg-pink-500/10 border-pink-500/20 text-pink-500'
    },
    purple: {
      bg: 'bg-purple-600',
      text: 'text-purple-500',
      border: 'border-purple-500',
      borderDashed: 'border-purple-500/40',
      glow: 'shadow-purple-500/10',
      textHover: 'hover:text-purple-500',
      badge: 'bg-purple-500/10 border-purple-500/20 text-purple-500'
    },
    emerald: {
      bg: 'bg-emerald-500',
      text: 'text-emerald-500',
      border: 'border-emerald-500',
      borderDashed: 'border-emerald-500/40',
      glow: 'shadow-emerald-500/10',
      textHover: 'hover:text-emerald-500',
      badge: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
    },
    blue: {
      bg: 'bg-blue-600',
      text: 'text-blue-500',
      border: 'border-blue-500',
      borderDashed: 'border-blue-500/40',
      glow: 'shadow-blue-500/10',
      textHover: 'hover:text-blue-500',
      badge: 'bg-blue-600/10 border-blue-600/20 text-blue-500'
    }
  };
  const activeTheme = themes[brandColor] || themes.gold;

  return (
    <div className="min-h-screen bg-[#030303] text-white">
      {/* Navbar */}
      <header className="border-b border-zinc-900 bg-black/40 px-6 py-4 backdrop-blur-md">
        <div className="mx-auto flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/madsphere_logo.png" alt="MadSphere Logo" className="h-5 object-contain" />
            <span className="text-[10px] tracking-[0.3em] font-semibold text-zinc-500 uppercase pt-0.5">CONTROL CENTRE</span>
          </div>
          <div className="flex flex-wrap justify-center gap-2 md:gap-4">
            <a href="/" className="rounded-full border border-zinc-800 px-4 py-1.5 text-[10px] md:text-xs text-zinc-400 hover:text-white transition-all">GUEST PORTAL</a>
            <a href="/admin/attendees" className="rounded-full border border-zinc-800 px-4 py-1.5 text-[10px] md:text-xs text-zinc-400 hover:text-white transition-all">ATTENDEE DIRECTORY</a>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="mx-auto max-w-6xl px-6 py-10 space-y-8">
        
        {/* Statistics Panels */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          
          <div className="glass-panel rounded-2xl p-5 border border-zinc-900">
            <div className="flex justify-between items-center text-zinc-500">
              <span className="text-xs uppercase tracking-wider font-semibold">Total Guests</span>
              <Ticket className={`h-4 w-4 ${activeTheme.text}`} />
            </div>
            {loadingStats ? (
              <div className="h-8 w-16 animate-pulse bg-zinc-800 rounded mt-2"></div>
            ) : (
              <h2 className="text-3xl font-extrabold mt-1 tracking-wide">{stats.totalGuests}</h2>
            )}
            <p className="text-[10px] text-zinc-500 mt-2">Total registered passes</p>
          </div>

          <div className="glass-panel rounded-2xl p-5 border border-zinc-900">
            <div className="flex justify-between items-center text-zinc-500">
              <span className="text-xs uppercase tracking-wider font-semibold">Checked In</span>
              <UserCheck className={`h-4 w-4 ${activeTheme.text}`} />
            </div>
            {loadingStats ? (
              <div className="h-8 w-16 animate-pulse bg-zinc-800 rounded mt-2"></div>
            ) : (
              <h2 className="text-3xl font-extrabold mt-1 tracking-wide">{stats.checkedIn}</h2>
            )}
            <div className="mt-2 w-full bg-zinc-950 rounded-full h-1.5">
              <div className={`${activeTheme.bg} h-1.5 rounded-full`} style={{ width: `${percentCheckedIn}%` }}></div>
            </div>
            <p className="text-[10px] text-zinc-500 mt-1">{percentCheckedIn}% Complete</p>
          </div>

          <div className="glass-panel rounded-2xl p-5 border border-zinc-900">
            <div className="flex justify-between items-center text-zinc-500">
              <span className="text-xs uppercase tracking-wider font-semibold">Remaining</span>
              <Users className="h-4 w-4 text-zinc-400" />
            </div>
            {loadingStats ? (
              <div className="h-8 w-16 animate-pulse bg-zinc-800 rounded mt-2"></div>
            ) : (
              <h2 className="text-3xl font-extrabold mt-1 tracking-wide">{stats.remaining}</h2>
            )}
            <p className="text-[10px] text-zinc-500 mt-2">Expected gate arrivals</p>
          </div>

          <div className="glass-panel rounded-2xl p-5 border border-zinc-900">
            <div className="flex justify-between items-center text-zinc-500">
              <span className="text-xs uppercase tracking-wider font-semibold">VIP Members</span>
              <Sparkles className={`h-4 w-4 ${activeTheme.text}`} />
            </div>
            {loadingStats ? (
              <div className="h-8 w-16 animate-pulse bg-zinc-800 rounded mt-2"></div>
            ) : (
              <h2 className={`text-3xl font-extrabold mt-1 tracking-wide ${activeTheme.text}`}>{stats.vipGuests}</h2>
            )}
            <p className={`text-[10px] mt-2 opacity-80 ${activeTheme.text}`}>VIP lounge credentials</p>
          </div>
        </div>

        {/* Action Panel Grid */}
        <div className="grid gap-8 lg:grid-cols-12">
             {/* Left Form controls */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Tabs */}
            <div className="flex gap-2 bg-black/40 border border-zinc-900 p-1 rounded-2xl">
              <button
                onClick={() => {
                  if (adminScannerOpen) toggleAdminScanner();
                  setActiveTab('create');
                }}
                className={`flex-1 rounded-xl py-3 text-xs font-bold tracking-wider transition-all cursor-pointer ${
                  activeTab === 'create'
                    ? `${activeTheme.bg} text-zinc-950 shadow-md`
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'
                }`}
              >
                TICKET CREATOR
              </button>
              <button
                onClick={() => {
                  if (adminScannerOpen) toggleAdminScanner();
                  setActiveTab('branding');
                }}
                className={`flex-1 rounded-xl py-3 text-xs font-bold tracking-wider transition-all cursor-pointer ${
                  activeTab === 'branding'
                    ? `${activeTheme.bg} text-zinc-950 shadow-md`
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'
                }`}
              >
                BRANDING SETTINGS
              </button>
            </div>

            {activeTab === 'create' ? (
              <div className="glass-panel rounded-3xl p-6 border border-zinc-900 shadow-xl">
                <div className="flex items-center gap-2 border-b border-zinc-850 pb-4 mb-6">
                  <PlusCircle className={`h-5 w-5 ${activeTheme.text}`} />
                  <h3 className="text-lg font-bold tracking-wide">QUICK TICKET PASS GENERATOR</h3>
                </div>

                <form onSubmit={handleGenerateTicket} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs text-zinc-500 uppercase tracking-wider block">Full Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="John Doe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full rounded-xl bg-zinc-950 border border-zinc-900 px-4 py-3 text-sm gold-border-glow"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-zinc-500 uppercase tracking-wider block">Phone Number *</label>
                      <input
                        type="text"
                        required
                        placeholder="+91 99999 88888"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full rounded-xl bg-zinc-950 border border-zinc-900 px-4 py-3 text-sm gold-border-glow"
                      />
                    </div>
                  </div>



                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs text-zinc-500 uppercase tracking-wider block">Age</label>
                      <input
                        type="number"
                        required
                        min="18"
                        max="100"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        className="w-full rounded-xl bg-zinc-950 border border-zinc-900 px-4 py-3 text-sm gold-border-glow"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-zinc-500 uppercase tracking-wider block">Gender</label>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="w-full rounded-xl bg-zinc-950 border border-zinc-900 px-4 py-3 text-sm gold-border-glow"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-zinc-500 uppercase tracking-wider block">Entry Pass Type *</label>
                      <select
                        value={ticketType}
                        onChange={(e) => setTicketType(e.target.value)}
                        className="w-full rounded-xl bg-zinc-950 border border-zinc-900 px-4 py-3 text-sm gold-border-glow"
                      >
                        <option value="Regular">Regular Entry</option>
                        <option value="VIP">VIP Access</option>
                        <option value="Couple">Couple Entry</option>
                        <option value="Guest List">Guest List</option>
                        <option value="Staff">Staff Pass</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={generating}
                    className={`mt-4 w-full rounded-xl ${activeTheme.bg} py-3.5 text-sm font-semibold tracking-wider text-black transition-all hover:brightness-110 active:scale-95 disabled:opacity-50`}
                  >
                    {generating ? 'GENERATING SECURE QR...' : 'CREATE TICKET & SIGN QR'}
                  </button>
                </form>
              </div>
            ) : (
              <div className="glass-panel rounded-3xl p-6 border border-zinc-900 shadow-xl">
                <div className="flex items-center gap-2 border-b border-zinc-850 pb-4 mb-6">
                  <Compass className={`h-5 w-5 ${activeTheme.text}`} />
                  <h3 className="text-lg font-bold tracking-wide">WHITE-LABEL EVENT BRANDING</h3>
                </div>

                <form onSubmit={handleSaveBranding} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs text-zinc-500 uppercase tracking-wider block">Event Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. VANGUARD // NOTHING"
                      value={brandTitle}
                      onChange={(e) => setBrandTitle(e.target.value)}
                      className="w-full rounded-xl bg-zinc-950 border border-zinc-900 px-4 py-3 text-sm gold-border-glow"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-zinc-500 uppercase tracking-wider block">Event Subtitle / Tagline</label>
                    <input
                      type="text"
                      placeholder="e.g. AN EXCLUSIVE MULTISENSORY CLUB EXPERIENCE"
                      value={brandSubtitle}
                      onChange={(e) => setBrandSubtitle(e.target.value)}
                      className="w-full rounded-xl bg-zinc-950 border border-zinc-900 px-4 py-3 text-sm gold-border-glow"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs text-zinc-500 uppercase tracking-wider block">Event Date *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Saturday, Oct 31st"
                        value={brandDate}
                        onChange={(e) => setBrandDate(e.target.value)}
                        className="w-full rounded-xl bg-zinc-950 border border-zinc-900 px-4 py-3 text-sm gold-border-glow"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-zinc-500 uppercase tracking-wider block">Event Hours *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 9:00 PM - 4:00 AM"
                        value={brandTime}
                        onChange={(e) => setBrandTime(e.target.value)}
                        className="w-full rounded-xl bg-zinc-950 border border-zinc-900 px-4 py-3 text-sm gold-border-glow"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs text-zinc-500 uppercase tracking-wider block">Venue Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Club Nirvana"
                        value={brandVenue}
                        onChange={(e) => setBrandVenue(e.target.value)}
                        className="w-full rounded-xl bg-zinc-950 border border-zinc-900 px-4 py-3 text-sm gold-border-glow"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-zinc-500 uppercase tracking-wider block">City / Address *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Jodhpur"
                        value={brandAddress}
                        onChange={(e) => setBrandAddress(e.target.value)}
                        className="w-full rounded-xl bg-zinc-950 border border-zinc-900 px-4 py-3 text-sm gold-border-glow"
                      />
                    </div>
                  </div>

                  {/* Accent Color picker */}
                  <div className="space-y-2">
                    <label className="text-xs text-zinc-500 uppercase tracking-wider block">Pass Accent Theme Color *</label>
                    <div className="flex flex-wrap gap-4 p-4 rounded-2xl bg-zinc-950 border border-zinc-900">
                      {[
                        { id: 'gold', hex: '#cca43b', label: 'Gold' },
                        { id: 'pink', hex: '#ec4899', label: 'Pink' },
                        { id: 'purple', hex: '#a855f7', label: 'Purple' },
                        { id: 'emerald', hex: '#10b981', label: 'Emerald' },
                        { id: 'blue', hex: '#3b82f6', label: 'Blue' }
                      ].map((color) => (
                        <button
                          key={color.id}
                          type="button"
                          onClick={() => setBrandColor(color.id)}
                          className={`group relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-all cursor-pointer ${
                            brandColor === color.id 
                              ? 'border-white scale-110 shadow-lg' 
                              : 'border-zinc-800 hover:border-zinc-500 hover:scale-105'
                          }`}
                          style={{ backgroundColor: color.hex }}
                          title={color.label}
                        >
                          {brandColor === color.id && (
                            <Check className="h-4 w-4 text-black font-extrabold" />
                          )}
                          <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] text-zinc-500 uppercase hidden group-hover:block whitespace-nowrap">
                            {color.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Lineup & Support Settings */}
                  <div className="border-t border-zinc-900 pt-4 mt-4 space-y-4">
                    <h4 className="text-xs font-bold tracking-wider text-zinc-400 uppercase">Lineup & Artist Details</h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs text-zinc-500 uppercase tracking-wider block">Lineup Headliner *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. KAYLA (Berlin)"
                          value={brandLineupArtist}
                          onChange={(e) => setBrandLineupArtist(e.target.value)}
                          className="w-full rounded-xl bg-zinc-950 border border-zinc-900 px-4 py-3 text-sm gold-border-glow"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs text-zinc-500 uppercase tracking-wider block">Headliner Genre *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. DEEP NOIR / TECHNO"
                          value={brandLineupGenre}
                          onChange={(e) => setBrandLineupGenre(e.target.value)}
                          className="w-full rounded-xl bg-zinc-950 border border-zinc-900 px-4 py-3 text-sm gold-border-glow"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs text-zinc-500 uppercase tracking-wider block">Supporting Artist *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. AETHER SOUNDS"
                          value={brandSupportArtist}
                          onChange={(e) => setBrandSupportArtist(e.target.value)}
                          className="w-full rounded-xl bg-zinc-950 border border-zinc-900 px-4 py-3 text-sm gold-border-glow"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs text-zinc-500 uppercase tracking-wider block">Supporting Genre *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. MELODIC PROGRESSIVE"
                          value={brandSupportGenre}
                          onChange={(e) => setBrandSupportGenre(e.target.value)}
                          className="w-full rounded-xl bg-zinc-950 border border-zinc-900 px-4 py-3 text-sm gold-border-glow"
                        />
                      </div>
                    </div>
                  </div>

                  {saveSuccess && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 px-4 py-3 text-xs font-medium text-emerald-400"
                    >
                      ✓ Custom event settings saved successfully.
                    </motion.div>
                  )}

                  <button
                    type="submit"
                    disabled={savingBranding}
                    className={`w-full rounded-xl ${activeTheme.bg} py-3.5 text-sm font-semibold tracking-wider text-black transition-all hover:brightness-110 active:scale-95 disabled:opacity-50 cursor-pointer mt-4`}
                  >
                    {savingBranding ? 'SAVING CONFIGURATIONS...' : 'SAVE EVENT BRANDING'}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Generated Ticket Display Output */}
          <div className="lg:col-span-5 space-y-6">
            <AnimatePresence mode="wait">
              {generatedTicket ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="glass-panel rounded-3xl p-6 border-2 border-emerald-500/20 bg-emerald-950/5 shadow-2xl relative"
                >
                  <div className="absolute top-0 right-0 h-10 w-10 -translate-y-2 translate-x-2 bg-emerald-500/10 opacity-30 blur-md"></div>
                  
                  <div className="flex items-center gap-2 text-emerald-400 text-sm font-bold uppercase tracking-wider mb-4">
                    <ShieldCheck className="h-4 w-4" />
                    <span>Secure Pass Ready</span>
                  </div>

                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-5 flex flex-col items-center justify-center text-center">
                    <span className="text-xs text-zinc-500 uppercase">Guest Pass Name</span>
                    <span className="text-xl font-bold text-white mt-0.5">{generatedTicket.guestName}</span>
                    
                    <span className="mt-2 text-xs font-semibold rounded-full bg-zinc-900 border border-zinc-800 px-3.5 py-1 text-[#cca43b]">
                      {generatedTicket.ticketType.toUpperCase()}
                    </span>

                    {/* QR Code */}
                    <div className="mt-5 rounded-2xl bg-white p-3 shadow-lg">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={generatedTicket.qrDataUrl} alt="Signed QR Code" className="h-40 w-40" />
                    </div>

                    <span className="text-[10px] text-zinc-600 font-mono mt-3 uppercase">Ticket ID: {generatedTicket.ticketId}</span>
                  </div>

                  {/* Actions */}
                  <div className="mt-5 space-y-3">
                    <button
                      onClick={handleSendWhatsApp}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-3.5 text-xs font-bold text-white transition-all active:scale-95 text-center cursor-pointer shadow-lg shadow-emerald-950/20"
                    >
                      <MessageSquare className="h-4 w-4" />
                      SEND ON WHATSAPP
                    </button>

                    <button
                      onClick={handleCopyLink}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-zinc-950 border border-zinc-900 py-3 text-xs font-bold text-zinc-300 hover:bg-zinc-900 active:scale-95"
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4 text-emerald-400" />
                          COPIED LINK
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 text-zinc-400" />
                          COPY TICKET SHARE LINK
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={handleShareQR}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#cca43b] py-3 text-xs font-bold text-black hover:bg-[#ffe082] active:scale-95 text-center cursor-pointer"
                    >
                      <Download className="h-4 w-4" />
                      SHARE / SAVE QR IMAGE
                    </button>
                  </div>
                </motion.div>
              ) : (
                <div className="glass-panel rounded-3xl p-8 border border-zinc-900 h-full min-h-[300px] flex flex-col items-center justify-center text-center text-zinc-500">
                  <QrCode className="h-12 w-12 text-zinc-700 stroke-1 animate-pulse" />
                  <h4 className="mt-4 font-bold text-zinc-400">Waiting for Ticket Details</h4>
                  <p className="text-xs font-light max-w-xs mt-1">
                    Fill the form on the left to sign and generate a secure QR entrance pass.
                  </p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Recent Scans Table */}
        <div className="glass-panel rounded-3xl p-6 border border-zinc-900">
          <div className="flex justify-between items-center border-b border-zinc-850 pb-4 mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[#cca43b]" />
              <h3 className="text-lg font-bold tracking-wide">LATEST ENTRY ARRIVALS</h3>
            </div>
            <button 
              onClick={fetchMetrics}
              className="rounded-lg bg-zinc-900 border border-zinc-850 p-2 text-zinc-400 hover:text-white"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-zinc-900 text-zinc-500 text-xs font-semibold uppercase">
                  <th className="py-3 px-4">Guest Name</th>
                  <th className="py-3 px-4">Ticket Type</th>
                  <th className="py-3 px-4">Gate</th>
                  <th className="py-3 px-4">Check-in Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {recentCheckins.length > 0 ? (
                  recentCheckins.map((checkin) => (
                    <tr key={checkin.id} className="text-zinc-300 hover:bg-zinc-950/60">
                      <td className="py-3.5 px-4 font-semibold text-white">{checkin.name}</td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs border font-medium ${
                          checkin.ticketType === 'VIP' ? 'border-[#cca43b] text-[#ffe082] bg-[#cca43b]/5' : 'border-zinc-800 text-zinc-400'
                        }`}>
                          {checkin.ticketType}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-zinc-400 font-light">{checkin.gate}</td>
                      <td className="py-3.5 px-4 text-xs text-zinc-400 font-light">
                        {new Date(checkin.timestamp).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-zinc-600 font-light">
                      No check-ins logged yet. Ready to scan at gate terminals.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-zinc-900 bg-black/80 py-12 text-zinc-500">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-8 pb-8 border-b border-zinc-900/60">
            <div className="footer-brand">
              <a href="#" className="cursor-pointer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/madsphere_logo.png" alt="MadSphere" className="h-9 object-contain" />
              </a>
            </div>
            
            <div className="text-center md:text-left">
              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3">Connect</div>
              <ul className="space-y-2 text-xs uppercase tracking-wider">
                <li>
                  <a href="https://instagram.com/madsphere.co" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors cursor-pointer text-zinc-500">
                    Instagram
                  </a>
                </li>
                <li>
                  <a href="https://linkedin.com/company/madsphere" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors cursor-pointer text-zinc-500">
                    LinkedIn
                  </a>
                </li>
                <li>
                  <a href="mailto:madsphere.info@gmail.com" className="hover:text-white transition-colors cursor-pointer text-zinc-500">
                    Email Us
                  </a>
                </li>
                <li>
                  <a href="https://madsphere-web.vercel.app/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors cursor-pointer text-zinc-500">
                    Website
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6 text-center text-[10px] uppercase tracking-wider text-zinc-600 border-t border-zinc-900/60">
            <div>© 2026 MadSphere. All rights reserved. Built with purpose.</div>
          </div>
        </div>
      </footer>

      {/* Full-screen Scanner Overlay Modal */}
      <AnimatePresence>
        {adminScannerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 p-6 backdrop-blur-md"
          >
            <div className="w-full max-w-md flex flex-col items-center gap-6">
              <div className="text-center space-y-1">
                <h3 className="text-lg font-bold tracking-widest uppercase text-white">GATE SCAN TERMINAL</h3>
                <p className="text-xs text-zinc-500 font-light">Point camera at the ticket pass QR code</p>
              </div>

              {/* Camera scanner aspect container */}
              <div className={`relative w-full max-w-xs aspect-square overflow-hidden rounded-3xl border-2 border-dashed bg-black/40 ${activeTheme.border}`}>
                <div id="admin-modal-reader" className="w-full h-full"></div>
                <div className={`absolute inset-8 border border-dashed ${activeTheme.borderDashed} pointer-events-none rounded-xl animate-pulse`}></div>
              </div>

              <button
                type="button"
                onClick={toggleAdminScanner}
                className="rounded-full bg-zinc-900 border border-zinc-800 px-8 py-3.5 text-xs font-bold tracking-wider text-zinc-400 hover:text-white transition-all cursor-pointer"
              >
                CLOSE CAMERA SCAN
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Scan QR Button (Paytm style, synced with selected theme color!) */}
      {!adminScannerOpen && (
        <button
          onClick={toggleAdminScanner}
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2.5 rounded-full px-8 py-3.5 text-sm font-extrabold text-white active:scale-95 transition-all cursor-pointer whitespace-nowrap shadow-lg ${
            brandColor === 'gold' ? 'bg-gradient-to-r from-amber-600 via-[#cca43b] to-yellow-600 border border-amber-400/20 shadow-amber-500/20' :
            brandColor === 'pink' ? 'bg-gradient-to-r from-pink-600 via-pink-500 to-rose-600 border border-pink-400/20 shadow-pink-500/20' :
            brandColor === 'purple' ? 'bg-gradient-to-r from-purple-600 via-purple-500 to-violet-600 border border-purple-400/20 shadow-purple-500/20' :
            brandColor === 'emerald' ? 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 border border-emerald-400/20 shadow-emerald-500/20' :
            'bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 border border-blue-400/20 shadow-blue-500/20'
          }`}
        >
          <QrCode className="h-5 w-5 text-white animate-pulse" />
          <span>Scan QR</span>
        </button>
      )}

      {/* Scan Results Overlay Alert Modal */}
      <AnimatePresence>
        {scanningResult !== 'idle' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className={`w-full max-w-sm rounded-3xl border p-6 text-center space-y-6 shadow-2xl ${
                scanningResult === 'valid' 
                  ? 'bg-zinc-950 border-emerald-500/20 shadow-emerald-500/5' 
                  : 'bg-zinc-950 border-red-500/20 shadow-red-500/5'
              }`}
            >
              {/* Result Icon */}
              <div className="flex justify-center">
                {scanningResult === 'valid' && (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    <UserCheck className="h-8 w-8" />
                  </div>
                )}
                {scanningResult === 'already_used' && (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-bounce">
                    <AlertTriangle className="h-8 w-8" />
                  </div>
                )}
                {(scanningResult === 'invalid' || scanningResult === 'banned') && (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-400 border border-red-500/30">
                    <XCircle className="h-8 w-8" />
                  </div>
                )}
              </div>

              {/* Status Header */}
              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">GATE VALIDATION</span>
                <h2 className="text-2xl font-extrabold tracking-wide uppercase text-white">
                  {scanningResult === 'valid' && 'ENTRY ALLOWED'}
                  {scanningResult === 'already_used' && 'ALREADY SCANNED'}
                  {scanningResult === 'invalid' && 'INVALID SIGNATURE'}
                  {scanningResult === 'banned' && 'BLACKLISTED PASS'}
                </h2>
              </div>

              {/* Attendee details */}
              <div className="rounded-2xl bg-zinc-900/60 border border-zinc-850 p-5 text-left">
                <span className="text-[9px] text-zinc-500 uppercase tracking-widest block">GUEST RECORD</span>
                <span className="text-xl font-bold mt-1 block text-white">{scanningDetails.name}</span>
                
                <span className={`inline-block mt-3 rounded-full px-3 py-0.5 text-[10px] font-semibold uppercase ${
                  scanningDetails.ticketType === 'VIP' ? 'bg-[#ffe082]/10 text-[#ffe082] border border-[#ffe082]/20' : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                }`}>
                  {scanningDetails.ticketType} PASS
                </span>

                <div className="mt-4 border-t border-zinc-800/80 pt-3 text-xs space-y-2 text-zinc-400">
                  {scanningResult === 'valid' && (
                    <div className="flex justify-between">
                      <span>Assigned Gate:</span>
                      <span className="font-semibold text-emerald-400">Admin Console</span>
                    </div>
                  )}
                  {scanningResult === 'already_used' && (
                    <>
                      <div className="flex justify-between">
                        <span>Original Scan:</span>
                        <span className="font-semibold text-amber-400">
                          {scanningDetails.usedAt ? new Date(scanningDetails.usedAt).toLocaleTimeString() : 'N/A'}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-500 mt-2 leading-relaxed">
                        Ticket credentials have already been checked in.
                      </p>
                    </>
                  )}
                  {scanningDetails.message && (
                    <p className="text-[10px] text-red-400 text-center font-medium mt-2">
                      {scanningDetails.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Resume scanner button */}
              <button
                onClick={() => setScanningResult('idle')}
                className="w-full flex items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold tracking-wider text-black transition-all active:scale-95 cursor-pointer bg-white hover:bg-zinc-200"
              >
                <UserCheck className="h-4 w-4" />
                CONFIRM & RESUME
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
