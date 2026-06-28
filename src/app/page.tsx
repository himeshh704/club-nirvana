'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Sparkles, 
  Download, 
  Copy, 
  Check, 
  ShieldCheck, 
  Phone,
  QrCode,
  Compass
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'qrcode';

// Wrap the main guest content in Suspense for Next.js SearchParams compatibility
export default function GuestPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-[#060608] text-white">
        <div className="relative">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-[#cca43b] border-t-transparent"></div>
          <div className="mt-4 text-sm tracking-widest text-zinc-400">LOADING VANGUARD...</div>
        </div>
      </div>
    }>
      <GuestPageContent />
    </Suspense>
  );
}

interface DecodedToken {
  ticketId: string;
  userId: string;
  ticketType: string;
  name: string;
  createdAt: string;
}

function GuestPageContent() {
  const searchParams = useSearchParams();
  const ticketToken = searchParams.get('ticket');
  
  const [qrUrl, setQrUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [ticketData, setTicketData] = useState<DecodedToken | null>(null);
  const [tokenError, setTokenError] = useState<boolean>(false);
  const ticketRef = useRef<HTMLDivElement>(null);

  const [eventSettings, setEventSettings] = useState({
    title: "VANGUARD // NOTHING",
    subtitle: "AN EXCLUSIVE MULTISENSORY CLUB EXPERIENCE",
    date: "To Be Disclosed",
    time: "9:00 PM - 4:00 AM",
    venue: "Club Nirvana",
    address: "Jodhpur",
    accent_color: "gold"
  });

  // Fetch dynamic branding/event configurations
  useEffect(() => {
    fetch('/api/event/settings')
      .then(res => res.json())
      .then(data => {
        if (data && data.title) {
          setEventSettings(data);
        }
      })
      .catch(err => console.error('Failed to load branding configurations:', err));
  }, []);

  // Parse token client-side (Base64 decode JWT payload without validation just for UI display,
  // the server will validate cryptographically upon actual scan check-in)
  useEffect(() => {
    if (ticketToken) {
      try {
        const parts = ticketToken.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          const ticketId = payload.i || payload.ticketId;
          const name = payload.n || payload.name || 'Valued Guest';
          const ticketType = payload.t || payload.ticketType || 'Regular';
          
          setTicketData({
            ticketId,
            userId: payload.userId || '',
            ticketType,
            name,
            createdAt: payload.createdAt || ''
          });

          // Generate QR code URL (Level L error correction minimizes density/dot count for instant scanning)
          QRCode.toDataURL(ticketToken, {
            errorCorrectionLevel: 'L',
            margin: 2,
            color: {
              dark: '#000000',
              light: '#ffffff'
            }
          }).then(url => {
            setQrUrl(url);
          });
        } else {
          setTokenError(true);
        }
      } catch (err) {
        console.error('Failed to parse ticket token:', err);
        setTokenError(true);
      }
    }
  }, [ticketToken]);

  // Copy Ticket Link
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Trigger Print/Download Layout or Native Share on mobile
  const handleDownload = async () => {
    if (!qrUrl || !ticketData) return;
    try {
      // Direct base64 to Blob conversion (fixes Safari/Chrome mobile fetch failures)
      const byteString = atob(qrUrl.split(',')[1]);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: 'image/png' });
      const filename = `vanguard-pass-${ticketData.name.toLowerCase().replace(/\s+/g, '-')}.png`;
      const file = new File([blob], filename, { type: 'image/png' });
      
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Vanguard Entry Pass',
          text: `My QR entrance pass for VANGUARD // NOTHING!`
        });
      } else {
        const link = document.createElement('a');
        link.href = qrUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Error sharing pass:', error);
      window.print();
    }
  };

  // Dynamic theme configurations mapping
  const themeMap: Record<string, { 
    text: string; 
    border: string; 
    borderPulse: string; 
    glow: string; 
    badge: string; 
    topGrad: string;
    bg: string;
    hoverBg: string;
  }> = {
    gold: {
      text: 'text-[#cca43b]',
      border: 'border-[#cca43b]/40',
      borderPulse: 'shadow-[0_0_15px_rgba(204,164,59,0.2)] border-[#cca43b]/40',
      glow: 'bg-[#cca43b]',
      badge: 'border-[#cca43b] text-[#ffe082] bg-[#cca43b]/10',
      topGrad: 'from-amber-200 via-[#cca43b] to-amber-700',
      bg: 'bg-[#cca43b]',
      hoverBg: 'hover:bg-[#ffe082]'
    },
    pink: {
      text: 'text-pink-400',
      border: 'border-pink-500/40',
      borderPulse: 'shadow-[0_0_15px_rgba(236,72,153,0.2)] border-pink-500/35',
      glow: 'bg-pink-500',
      badge: 'border-pink-500 text-pink-300 bg-pink-950/20',
      topGrad: 'from-pink-300 via-pink-500 to-rose-700',
      bg: 'bg-pink-600',
      hoverBg: 'hover:bg-pink-500'
    },
    purple: {
      text: 'text-purple-400',
      border: 'border-purple-500/40',
      borderPulse: 'shadow-[0_0_15px_rgba(168,85,247,0.2)] border-purple-500/35',
      glow: 'bg-purple-500',
      badge: 'border-purple-500 text-purple-300 bg-purple-950/20',
      topGrad: 'from-violet-300 via-purple-500 to-fuchsia-700',
      bg: 'bg-purple-600',
      hoverBg: 'hover:bg-purple-500'
    },
    emerald: {
      text: 'text-emerald-400',
      border: 'border-emerald-500/40',
      borderPulse: 'shadow-[0_0_15px_rgba(16,185,129,0.2)] border-emerald-500/35',
      glow: 'bg-emerald-500',
      badge: 'border-emerald-500 text-emerald-300 bg-emerald-950/20',
      topGrad: 'from-teal-300 via-emerald-500 to-emerald-700',
      bg: 'bg-emerald-600',
      hoverBg: 'hover:bg-emerald-500'
    },
    blue: {
      text: 'text-blue-400',
      border: 'border-blue-500/40',
      borderPulse: 'shadow-[0_0_15px_rgba(59,130,246,0.2)] border-blue-500/35',
      glow: 'bg-blue-500',
      badge: 'border-blue-500 text-blue-300 bg-blue-950/20',
      topGrad: 'from-cyan-300 via-blue-500 to-indigo-700',
      bg: 'bg-blue-600',
      hoverBg: 'hover:bg-blue-500'
    }
  };

  const currentTheme = themeMap[eventSettings.accent_color] || themeMap.gold;

  // RENDER TICKET VIEW
  if (ticketToken && ticketData) {
    const isVIP = ticketData.ticketType === 'VIP';
    const isCouple = ticketData.ticketType === 'Couple';
    
    let typeBadgeColor = 'border-zinc-500 text-zinc-300 bg-zinc-950/40';
    let typeBorderGlow = '';
    
    if (isVIP) {
      typeBadgeColor = currentTheme.badge;
      typeBorderGlow = currentTheme.borderPulse;
    } else if (isCouple) {
      typeBadgeColor = 'border-pink-500 text-pink-300 bg-pink-950/20';
      typeBorderGlow = 'shadow-[0_0_15px_rgba(236,72,153,0.15)] border-pink-500/30';
    } else {
      typeBorderGlow = `border-zinc-800 hover:${currentTheme.border} transition-colors`;
    }

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#060608] px-4 py-12 text-white print:bg-white print:text-black">
        {/* Glow Effects in background */}
        <div className={`absolute top-1/4 left-1/2 -z-10 h-72 w-72 -translate-x-1/2 rounded-full ${currentTheme.glow} opacity-10 blur-[100px] print:hidden`}></div>

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="w-full max-w-md print:max-w-full"
        >
          {/* Header */}
          <div className="mb-6 text-center print:hidden">
            <h2 className={`text-xs font-semibold tracking-[0.3em] ${currentTheme.text}`}>YOUR ENTRY PASS</h2>
            <h1 className="mt-1 text-2xl font-bold tracking-wider text-white">{eventSettings.title}</h1>
          </div>

          {/* Ticket Card Container */}
          <div 
            ref={ticketRef}
            className={`glass-panel relative overflow-hidden rounded-3xl p-6 text-white border border-zinc-800 ${typeBorderGlow} print:border-none print:shadow-none print:bg-white print:text-black`}
          >
            {/* VIP Card Accent line */}
            {isVIP && (
              <div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${currentTheme.topGrad}`}></div>
            )}
            {isCouple && (
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-pink-400 via-pink-600 to-rose-700"></div>
            )}

            {/* Logo and Type */}
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4 print:border-zinc-300">
              <div className="flex flex-col gap-1.5 items-start">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/madsphere_logo.png" alt="MadSphere Logo" className="h-3.5 object-contain print:hidden" />
                <span className="text-sm font-extrabold tracking-widest text-white print:block hidden">MADSPHERE</span>
                <span className={`text-[9px] ${currentTheme.text} font-semibold tracking-[0.25em]`}>{isVIP ? 'VIP ACCESS' : 'SECURE PASS'}</span>
              </div>
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold tracking-wider ${typeBadgeColor}`}>
                {ticketData.ticketType.toUpperCase()}
              </span>
            </div>

            {/* Event Meta */}
            <div className="mt-5 space-y-3">
              <h3 className="text-xl font-bold text-white print:text-black">{eventSettings.title}</h3>
              <div className="flex items-center text-sm text-zinc-400 print:text-zinc-700">
                <Calendar className={`mr-2 h-4 w-4 ${currentTheme.text}`} />
                <span>{eventSettings.date}</span>
              </div>
              <div className="flex items-center text-sm text-zinc-400 print:text-zinc-700">
                <Clock className={`mr-2 h-4 w-4 ${currentTheme.text}`} />
                <span>{eventSettings.time}</span>
              </div>
              <div className="flex items-center text-sm text-zinc-400 print:text-zinc-700">
                <a 
                  href={`https://maps.google.com/?q=${encodeURIComponent(eventSettings.venue + ' ' + eventSettings.address)}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex items-center text-sm text-zinc-400 hover:text-white transition-all print:text-zinc-700 group cursor-pointer"
                >
                  <MapPin className={`mr-2 h-4 w-4 ${currentTheme.text} group-hover:scale-110 transition-transform`} />
                  <span className="underline decoration-dashed decoration-zinc-600 hover:decoration-white">{eventSettings.venue}, {eventSettings.address}</span>
                </a>
              </div>
            </div>

            {/* Attendee Details */}
            <div className="mt-6 rounded-2xl bg-zinc-950/60 p-4 border border-zinc-900 print:bg-zinc-100 print:border-zinc-200">
              <span className="text-xs tracking-wider text-zinc-500 uppercase">Guest Name</span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-lg font-semibold text-white print:text-black">{ticketData.name}</span>
                {isVIP && <Sparkles className="h-5 w-5 text-[#ffe082] animate-pulse" />}
              </div>
              
              <div className="mt-3 flex items-center justify-between border-t border-zinc-900/60 pt-3 text-xs text-zinc-500">
                <div>
                  <span className="block uppercase">Pass Code</span>
                  <span className="font-mono text-zinc-300 font-semibold print:text-black">{ticketData.ticketId.slice(0, 8).toUpperCase()}</span>
                </div>
                <div className="text-right">
                  <span className="block uppercase">Status</span>
                  <span className="flex items-center font-medium text-emerald-400">
                    <ShieldCheck className="mr-1 h-3.5 w-3.5" /> SECURED
                  </span>
                </div>
              </div>
            </div>

            {/* QR Code Section */}
            <div className="mt-6 flex flex-col items-center justify-center border-t border-dashed border-zinc-800 pt-6 print:border-zinc-300">
              <div className="relative rounded-2xl bg-white p-3 shadow-xl">
                {qrUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qrUrl} alt="QR Code Ticket" className="h-44 w-44" />
                ) : (
                  <div className="flex h-44 w-44 items-center justify-center bg-zinc-100 text-black">
                    <QrCode className="h-10 w-10 animate-pulse text-zinc-400" />
                  </div>
                )}
              </div>
              
              <p className="mt-4 text-center text-xs tracking-wider text-zinc-500 print:text-zinc-700">
                Present this QR code at the entrance.<br />
                It will be scanned once to authorize admission.
              </p>
            </div>
          </div>

          {/* Action Buttons (Hidden on Print) */}
          <div className="mt-6 flex gap-4 print:hidden">
            <button
              onClick={handleCopyLink}
              className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-zinc-900 border border-zinc-800 py-3.5 text-sm font-semibold tracking-wider text-white transition-all hover:bg-zinc-800 active:scale-95"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-emerald-400" />
                  COPIED LINK
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 text-zinc-400" />
                  COPY PASS LINK
                </>
              )}
            </button>
            
            <button
              onClick={handleDownload}
              className={`flex-1 flex items-center justify-center gap-2 rounded-2xl ${currentTheme.bg} ${currentTheme.hoverBg} py-3.5 text-sm font-semibold tracking-wider text-zinc-950 transition-all active:scale-95 shadow-lg shadow-black/10 cursor-pointer`}
            >
              <Download className="h-4 w-4" />
              SHARE / SAVE
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // RENDER DUMMY / INVALID TOKEN ERROR
  if (ticketToken && tokenError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#060608] px-6 text-center text-white">
        <div className="rounded-3xl border border-red-500/20 bg-red-950/10 p-8 max-w-md">
          <QrCode className="mx-auto h-16 w-16 text-red-500" />
          <h2 className="mt-6 text-xl font-bold text-white">Invalid Ticket Pass</h2>
          <p className="mt-3 text-sm text-zinc-400">
            This verification link is invalid, expired, or has been tampered with. Please ask the organizer to issue a new pass.
          </p>
          <a
            href="/"
            className="mt-6 inline-block rounded-xl bg-zinc-900 border border-zinc-800 px-6 py-2.5 text-xs font-semibold text-zinc-300 hover:text-white"
          >
            GO TO HOME
          </a>
        </div>
      </div>
    );
  }

  // DEFAULT LANDING VIEW: PUBLIC INFO
  return (
    <div className="flex min-h-screen flex-col bg-[#060608] text-white">
      {/* Dynamic Theme Glow Effects */}
      <div className={`absolute top-0 left-1/4 -z-10 h-96 w-96 rounded-full ${currentTheme.glow} opacity-5 blur-[120px]`}></div>
      <div className={`absolute top-1/3 right-1/4 -z-10 h-[400px] w-[400px] rounded-full ${currentTheme.glow} opacity-5 blur-[150px]`}></div>

      {/* Header bar */}
      <header className="border-b border-white/5 bg-black/40 px-6 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/madsphere_logo.png" alt="MadSphere Logo" className="h-5 object-contain" />
            <span className="text-[9px] tracking-[0.3em] font-semibold text-zinc-500 uppercase pt-0.5">QR GENERATOR</span>
          </div>
          
          <div className="flex items-center gap-4">
            <a 
              href="/admin" 
              className={`rounded-full ${currentTheme.bg} ${currentTheme.hoverBg} px-4 py-1.5 text-xs font-semibold tracking-wider text-black transition-all`}
            >
              ADMIN PANEL
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="mx-auto max-w-4xl px-6 py-12 md:py-24 text-center">
        <div className="space-y-8 flex flex-col items-center">
          
          {/* Hero Details */}
          <div className="space-y-6 max-w-2xl mx-auto">
            <div className={`inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950 px-3.5 py-1 text-xs ${currentTheme.text}`}>
              <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              <span>OFFICIAL ANNOUNCEMENT</span>
            </div>
            
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
              <span className="block text-zinc-400 text-2xl font-semibold tracking-[0.3em] uppercase mb-2">EXPERIENCE</span>
              {eventSettings.title}
            </h1>
            
            <p className="text-base sm:text-lg text-zinc-400 font-light">
              {eventSettings.subtitle}. Immerse yourself in state-of-the-art production, spatial audio design, and premium dark luxury aesthetics.
            </p>

            {/* Lineup */}
            <div className="grid grid-cols-2 gap-6 border-t border-white/5 pt-6 mx-auto max-w-md">
              <div>
                <span className="text-xs uppercase text-zinc-500 tracking-wider font-semibold">Lineup</span>
                <span className="block mt-1 font-semibold text-zinc-200">KAYLA (Berlin)</span>
                <span className="block text-sm text-zinc-400 font-light">DEEP NOIR / TECHNO</span>
              </div>
              <div>
                <span className="text-xs uppercase text-zinc-500 tracking-wider font-semibold">Support</span>
                <span className="block mt-1 font-semibold text-zinc-200">AETHER SOUNDS</span>
                <span className="block text-sm text-zinc-400 font-light">MELODIC PROGRESSIVE</span>
              </div>
            </div>

            {/* Info Cards */}
            <div className="flex flex-col sm:flex-row justify-center items-center gap-6 pt-6 border-t border-white/5">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-zinc-900 p-2.5 text-[#cca43b]">
                  <Calendar className={`h-5 w-5 ${currentTheme.text}`} />
                </div>
                <div className="text-left">
                  <h4 className="font-semibold text-zinc-200 text-sm">{eventSettings.date}</h4>
                  <p className="text-xs text-zinc-500">{eventSettings.time}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-zinc-900 p-2.5 text-[#cca43b]">
                  <MapPin className={`h-5 w-5 ${currentTheme.text}`} />
                </div>
                <div className="text-left">
                  <h4 className="font-semibold text-zinc-200 text-sm">{eventSettings.venue}</h4>
                  <p className="text-xs text-zinc-500">{eventSettings.address}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-zinc-900 bg-black/80 py-12 text-zinc-500">
        <div className="mx-auto max-w-4xl px-6">
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
    </div>
  );
}
