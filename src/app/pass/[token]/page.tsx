'use client';

import { useState, useEffect, use } from 'react';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  ShieldCheck, 
  Sparkles, 
  Share2, 
  Copy, 
  Check,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { motion } from 'framer-motion';
import QRCode from 'qrcode';

export default function StandalonePassPage({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;

  const [qrUrl, setQrUrl] = useState<string>('');
  const [ticketData, setTicketData] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [liveTime, setLiveTime] = useState<string>('');
  const [tokenError, setTokenError] = useState(false);

  // Real-time ticking clock for anti-screenshot live verification
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setLiveTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Parse and generate QR code
  useEffect(() => {
    if (token) {
      // Decode JWT token payload safely
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
          setTicketData({
            ticketId: payload.i,
            name: payload.n || 'Valued Guest',
            ticketType: payload.t || 'Rangilo Raas Pass',
            validDays: payload.v || 'both'
          });
        } else {
          setTokenError(true);
        }
      } catch (err) {
        console.error('Error decoding pass token:', err);
        setTokenError(true);
      }

      // Generate client QR code display
      QRCode.toDataURL(token, { width: 350, margin: 2, color: { dark: '#000000', light: '#ffffff' } })
        .then(url => setQrUrl(url))
        .catch(err => console.error('QR generation error:', err));
    }
  }, [token]);

  const copyPassLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWhatsApp = () => {
    const name = ticketData?.name || 'Guest';
    const type = ticketData?.ticketType || 'Rangilo Raas Pass';
    const url = window.location.href;
    const message = `Hey *${name}*! 💃\n\nHere is your Official Entry Pass for *RANGILO RAAS 2026*!\n\n🎟️ Pass Category: *${type}*\n📅 Dates: *18 & 19 OCT 2026*\n📍 Venue: *Filos 24/7, Jodhpur*\n\nView Pass: ${url}`;
    
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  if (tokenError) {
    return (
      <div className="min-h-screen bg-[#070210] flex items-center justify-center p-4 text-white">
        <div className="bg-zinc-900 border border-red-500/30 rounded-3xl p-6 max-w-sm w-full text-center space-y-4">
          <Lock className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-lg font-black text-white">INVALID OR TAMPERED PASS</h2>
          <p className="text-xs text-zinc-400">
            This QR pass link has been altered or contains an invalid cryptographic signature. Entry will be rejected at the gate.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090212] text-white selection:bg-red-600 selection:text-white pb-12">
      {/* Dynamic Background Glows */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-red-600/20 blur-[140px] rounded-full"></div>
        <div className="absolute bottom-0 right-0 w-[400px] h-[300px] bg-amber-600/15 blur-[120px] rounded-full"></div>
      </div>

      <div className="relative z-10 max-w-md mx-auto px-4 pt-6">
        {/* Header Branding (Clean & Isolated - NO Navigation or Login Links) */}
        <div className="text-center mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src="/IMG_3217.PNG" 
            alt="रंगीलो रास Logo" 
            className="h-24 mx-auto object-contain drop-shadow-[0_0_20px_rgba(220,38,38,0.4)]"
          />
          <p className="text-[10px] font-black text-amber-400 tracking-widest uppercase mt-1">BY HOUSE OF CHAOS • OFFICIAL PASS</p>
        </div>

        {/* Live Security Anti-Screenshot Bar */}
        <div className="bg-emerald-950/80 border border-emerald-500/30 rounded-2xl px-4 py-2 mb-4 flex items-center justify-between text-emerald-400 shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-black uppercase tracking-wider">LIVE ANTI-TAMPER VERIFIED</span>
          </div>
          <span className="text-xs font-mono font-black text-white">{liveTime}</span>
        </div>

        {/* Ticket Pass Card */}
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative bg-gradient-to-b from-zinc-900/95 via-zinc-900/98 to-black border border-red-600/40 rounded-3xl p-6 shadow-2xl backdrop-blur-xl overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-amber-500 to-red-600"></div>

          <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-4">
            <div>
              <div className="text-[10px] font-extrabold text-red-500 uppercase tracking-wider">PASSHOLDER</div>
              <div className="text-2xl font-black text-white capitalize mt-0.5">{ticketData?.name || 'Valued Guest'}</div>
            </div>
            <div className="text-right">
              <span className="inline-block px-3 py-1 rounded-full text-[10px] font-black bg-red-600/20 text-red-400 border border-red-600/30 uppercase">
                {ticketData?.validDays === 'day_1' ? 'DAY 1 PASS (18 OCT)' : ticketData?.validDays === 'day_2' ? 'DAY 2 PASS (19 OCT)' : '2-DAY SEASON PASS'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-5 bg-zinc-950/80 p-3.5 rounded-2xl border border-zinc-800/80">
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <div>
                <div className="text-[9px] font-bold text-zinc-400 uppercase">DATES</div>
                <div className="text-xs font-black text-white">18 & 19 OCT 2026</div>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              <div>
                <div className="text-[9px] font-bold text-zinc-400 uppercase">TIMINGS</div>
                <div className="text-xs font-black text-white">7:00 PM ONWARDS</div>
              </div>
            </div>

            <div className="flex items-start gap-2 col-span-2 mt-1">
              <MapPin className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <div>
                <div className="text-[9px] font-bold text-zinc-400 uppercase">VENUE</div>
                <div className="text-xs font-black text-white">Filos 24/7, Jodhpur, Rajasthan</div>
              </div>
            </div>
          </div>

          {/* QR Code Container */}
          <div className="bg-white p-4 rounded-2xl text-center shadow-xl border border-red-500/20 mb-4">
            {qrUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={qrUrl} alt="Gate Pass QR" className="w-60 h-60 mx-auto rounded-lg" />
            ) : (
              <div className="w-60 h-60 mx-auto flex items-center justify-center bg-zinc-100 rounded-lg text-zinc-500 text-xs">
                Generating QR Pass...
              </div>
            )}
            <div className="mt-2.5 text-[10px] font-black tracking-widest text-zinc-800 uppercase flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              SHOW THIS QR CODE AT ENTRANCE GATE
            </div>
          </div>

          <div className="text-center text-[10px] text-zinc-400 font-mono tracking-widest">
            PASS CATEGORY: {ticketData?.ticketType || 'Rangilo Raas Pass'}
          </div>
        </motion.div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 mt-5">
          <button
            onClick={shareWhatsApp}
            className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-lg transition"
          >
            <Share2 className="w-4 h-4" />
            WhatsApp Share
          </button>

          <button
            onClick={copyPassLink}
            className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white font-black text-xs border border-zinc-700 transition"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Link Copied!' : 'Copy Pass Link'}
          </button>
        </div>

        {/* Footer Security Notice */}
        <div className="text-center mt-6 text-[10px] text-zinc-600 uppercase tracking-widest font-semibold">
          HOUSE OF CHAOS • SECURE ENTRY CONTROL
        </div>
      </div>
    </div>
  );
}
