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

  // Parse token client-side (Base64 decode JWT payload without validation just for UI display,
  // the server will validate cryptographically upon actual scan check-in)
  useEffect(() => {
    if (ticketToken) {
      try {
        const parts = ticketToken.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          setTicketData({
            ticketId: payload.ticketId,
            userId: payload.userId,
            ticketType: payload.ticketType || 'Regular',
            name: payload.name || 'Valued Guest',
            createdAt: payload.createdAt
          });

          // Generate QR code URL
          QRCode.toDataURL(ticketToken, {
            errorCorrectionLevel: 'H',
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

  // Event info helper
  const EVENT = {
    title: "VANGUARD // NOTHING",
    subtitle: "AN EXCLUSIVE MULTISENSORY CLUB EXPERIENCE",
    date: "To Be Disclosed",
    time: "9:00 PM - 4:00 AM",
    venue: "Club Nirvana",
    address: "Jodhpur",
    organizerUPI: "clubnirvana@upi",
    organizerWhatsapp: "+91 98765 43210"
  };

  // RENDER TICKET VIEW
  if (ticketToken && ticketData) {
    const isVIP = ticketData.ticketType === 'VIP';
    const isCouple = ticketData.ticketType === 'Couple';
    const isGuestList = ticketData.ticketType === 'Guest List' || ticketData.ticketType === 'Staff';
    
    let typeBadgeColor = 'border-zinc-500 text-zinc-300 bg-zinc-950/40';
    let typeBorderGlow = '';
    
    if (isVIP) {
      typeBadgeColor = 'border-[#cca43b] text-[#ffe082] bg-[#cca43b]/10';
      typeBorderGlow = 'shadow-[0_0_15px_rgba(204,164,59,0.2)] border-[#cca43b]/40';
    } else if (isCouple) {
      typeBadgeColor = 'border-pink-500 text-pink-300 bg-pink-950/20';
      typeBorderGlow = 'shadow-[0_0_15px_rgba(236,72,153,0.15)] border-pink-500/30';
    }

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#060608] px-4 py-12 text-white print:bg-white print:text-black">
        {/* Glow Effects in background */}
        <div className="absolute top-1/4 left-1/2 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-[#cca43b] opacity-10 blur-[100px] print:hidden"></div>

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="w-full max-w-md print:max-w-full"
        >
          {/* Header */}
          <div className="mb-6 text-center print:hidden">
            <h2 className="text-xs font-semibold tracking-[0.3em] text-[#cca43b]">YOUR ENTRY PASS</h2>
            <h1 className="mt-1 text-2xl font-bold tracking-wider text-white">VANGUARD // CLUB</h1>
          </div>

          {/* Ticket Card Container */}
          <div 
            ref={ticketRef}
            className={`glass-panel relative overflow-hidden rounded-3xl p-6 text-white border border-zinc-800 ${typeBorderGlow} print:border-none print:shadow-none print:bg-white print:text-black`}
          >
            {/* VIP Card Accent line */}
            {isVIP && (
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-amber-200 via-[#cca43b] to-amber-700"></div>
            )}
            {isCouple && (
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-pink-400 via-pink-600 to-rose-700"></div>
            )}

            {/* Logo and Type */}
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4 print:border-zinc-300">
              <div>
                <span className="text-lg font-bold tracking-widest text-white print:text-black">VANGUARD</span>
                <span className="ml-1 text-xs text-[#cca43b] font-medium tracking-[0.2em]">{isVIP ? 'VIP ACCESS' : 'ECLIPSE'}</span>
              </div>
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold tracking-wider ${typeBadgeColor}`}>
                {ticketData.ticketType.toUpperCase()}
              </span>
            </div>

            {/* Event Meta */}
            <div className="mt-5 space-y-3">
              <h3 className="text-xl font-bold text-white print:text-black">{EVENT.title}</h3>
              <div className="flex items-center text-sm text-zinc-400 print:text-zinc-700">
                <Calendar className="mr-2 h-4 w-4 text-[#cca43b]" />
                <span>{EVENT.date}</span>
              </div>
              <div className="flex items-center text-sm text-zinc-400 print:text-zinc-700">
                <Clock className="mr-2 h-4 w-4 text-[#cca43b]" />
                <span>{EVENT.time}</span>
              </div>
              <div className="flex items-center text-sm text-zinc-400 print:text-zinc-700">
                <MapPin className="mr-2 h-4 w-4 text-[#cca43b]" />
                <span>{EVENT.venue}</span>
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
              className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-[#cca43b] py-3.5 text-sm font-semibold tracking-wider text-zinc-950 transition-all hover:bg-[#ffe082] active:scale-95 shadow-lg shadow-[#cca43b]/10 cursor-pointer"
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
      <div className="flex h-screen flex-col items-center justify-center bg-[#060608] px-4 text-white text-center">
        <div className="rounded-3xl border border-red-500/20 bg-red-950/20 p-8 max-w-md">
          <h2 className="text-xl font-bold text-red-400">Invalid Ticket Pass</h2>
          <p className="mt-3 text-zinc-400 text-sm">
            This link appears to be broken or corrupted. Please make sure you copied the entire URL sent by the organizer.
          </p>
          <a
            href="/"
            className="mt-6 inline-block rounded-xl bg-zinc-900 border border-zinc-800 px-6 py-2.5 text-xs font-semibold tracking-wider text-[#cca43b] hover:bg-zinc-800"
          >
            RETURN TO EVENT DETAILS
          </a>
        </div>
      </div>
    );
  }

  // DEFAULT EVENT LANDING PAGE (NO TICKET SEARCH PARAM)
  return (
    <div className="relative min-h-screen bg-[#060608] text-white">
      {/* Absolute Decorative elements */}
      <div className="absolute top-10 left-10 -z-10 h-96 w-96 rounded-full bg-purple-900/10 blur-[150px]"></div>
      <div className="absolute bottom-10 right-10 -z-10 h-96 w-96 rounded-full bg-amber-900/10 blur-[150px]"></div>

      {/* Luxury Navbar */}
      <header className="border-b border-white/5 bg-black/30 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2">
            <Compass className="h-6 w-6 text-[#cca43b] animate-spin-slow" />
            <span className="text-xl font-bold tracking-[0.25em] text-white">VANGUARD</span>
          </div>
          <div className="flex gap-4">
            <a 
              href="/staff/dashboard" 
              className="rounded-full border border-white/10 px-4 py-1.5 text-xs font-semibold tracking-wider text-zinc-400 hover:border-[#cca43b] hover:text-white transition-all"
            >
              GATE SCANNER
            </a>
            <a 
              href="/admin" 
              className="rounded-full bg-[#cca43b] px-4 py-1.5 text-xs font-semibold tracking-wider text-black hover:bg-[#ffe082] transition-all"
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
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3.5 py-1 text-xs text-[#ffe082]">
              <Sparkles className="h-3.5 w-3.5" />
              <span>OFFICIAL ANNOUNCEMENT</span>
            </div>
            
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
              <span className="block text-zinc-400 text-2xl font-semibold tracking-[0.3em] uppercase mb-2">EXPERIENCE</span>
              {EVENT.title}
            </h1>
            
            <p className="text-base sm:text-lg text-zinc-400 font-light">
              {EVENT.subtitle}. Immerse yourself in state-of-the-art production, spatial audio design, and premium dark luxury aesthetics.
            </p>

            {/* Countdown / Lineup */}
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
                  <Calendar className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <h4 className="font-semibold text-zinc-250 text-sm">{EVENT.date}</h4>
                  <p className="text-xs text-zinc-500">{EVENT.time}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-zinc-900 p-2.5 text-[#cca43b]">
                  <MapPin className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <h4 className="font-semibold text-zinc-250 text-sm">{EVENT.venue}</h4>
                  <p className="text-xs text-zinc-500">{EVENT.address}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-white/5 py-8 text-center text-xs text-zinc-600">
        &copy; {new Date().getFullYear()} Vanguard Noir Experience. Cryptographically Signed Pass Engine.
      </footer>
    </div>
  );
}
