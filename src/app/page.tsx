'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Sparkles, 
  Copy, 
  Check, 
  Phone,
  QrCode,
  Share2,
  Ticket,
  User,
  Zap,
  Send,
  ShieldCheck,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'qrcode';

export default function GuestPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-[#070210] text-white">
        <div className="relative text-center">
          <div className="h-14 w-14 animate-spin rounded-full border-4 border-red-600 border-t-transparent mx-auto"></div>
          <div className="mt-4 text-xs font-bold tracking-widest text-red-400">LOADING RANGILO RAAS...</div>
        </div>
      </div>
    }>
      <GuestPageContent />
    </Suspense>
  );
}

function GuestPageContent() {
  const searchParams = useSearchParams();
  const ticketToken = searchParams.get('ticket');

  // Form State for Ticket Generation
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [passCategory, setPassCategory] = useState('2-Day Pass - Couple (Phase 1)');
  const [genderCategory, setGenderCategory] = useState('Couple');
  const [collectedBy, setCollectedBy] = useState('House of Chaos');
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  // Generation & View State
  const [generatedToken, setGeneratedToken] = useState<string | null>(ticketToken);
  const [qrUrl, setQrUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [ticketData, setTicketData] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recentGeneratedTicket, setRecentGeneratedTicket] = useState<any>(null);

  // Parse and generate QR code whenever token is present
  useEffect(() => {
    const activeToken = generatedToken || ticketToken;
    if (activeToken) {
      QRCode.toDataURL(activeToken, { width: 350, margin: 2, color: { dark: '#000000', light: '#ffffff' } })
        .then(url => setQrUrl(url))
        .catch(err => console.error('QR generation error:', err));

      try {
        const parts = activeToken.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
          setTicketData({
            ticketId: payload.i,
            name: payload.n || 'Valued Guest',
            ticketType: payload.t || 'Rangilo Raas Pass',
            validDays: payload.v || 'both'
          });
        }
      } catch (_) {}
    }
  }, [generatedToken, ticketToken]);

  // Handle Pass Generation & WhatsApp Dispatch
  const handleGeneratePass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName || !guestPhone) {
      alert('Please enter Guest Name and Phone Number.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/tickets/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: guestName,
          phone: guestPhone,
          gender: genderCategory,
          ticket_type: passCategory,
          payment_method: paymentMethod,
          collected_by: collectedBy
        })
      });

      const data = await res.json();

      if (data.success && data.qrToken) {
        const passLinkUrl = `${window.location.origin}/?ticket=${data.qrToken}`;
        
        const ticketInfo = {
          guestName,
          guestPhone,
          ticketType: passCategory,
          qrToken: data.qrToken,
          passLinkUrl
        };

        setRecentGeneratedTicket(ticketInfo);
        setGeneratedToken(data.qrToken);

        // Construct WhatsApp Share Message
        let cleanNumber = guestPhone.replace(/\D/g, '');
        if (cleanNumber.length === 10) cleanNumber = '91' + cleanNumber;

        const message = `Hey *${guestName}*! 💃🕺\n\nHere is your official Entry Pass for *RANGILO RAAS 2026* (Organized by *House of Chaos*)!\n\n📅 Dates: *18 & 19 OCT 2026*\n⏰ Time: *7:00 PM ONWARDS*\n🎟️ Pass Category: *${passCategory}*\n📍 Venue: *Filos 24/7, Jodhpur*\n\nYour Pass Link: ${passLinkUrl}\n\nPlease show this QR code at the entrance gate for scanning! See you at the Garba grounds! 🎉`;

        const waUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
        window.open(waUrl, '_blank');

        // Reset inputs
        setGuestName('');
        setGuestPhone('');
      } else {
        alert(data.error || 'Failed to generate ticket pass.');
      }
    } catch (err) {
      console.error('Error issuing ticket:', err);
      alert('Network error while issuing pass.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyLink = () => {
    const activeToken = generatedToken || ticketToken;
    const url = window.location.origin + '?ticket=' + activeToken;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWhatsAppAgain = () => {
    const activeToken = generatedToken || ticketToken;
    const name = ticketData?.name || recentGeneratedTicket?.guestName || 'Guest';
    const type = ticketData?.ticketType || recentGeneratedTicket?.ticketType || 'Rangilo Raas Pass';
    const phoneNum = recentGeneratedTicket?.guestPhone || '';
    let cleanNumber = phoneNum.replace(/\D/g, '');
    if (cleanNumber.length === 10) cleanNumber = '91' + cleanNumber;

    const url = window.location.origin + '?ticket=' + activeToken;
    const message = `Hey *${name}*! 💃🕺\n\nHere is your Entry Pass for *RANGILO RAAS 2026* (House of Chaos)!\n\n🎟️ Category: *${type}*\n📅 Dates: *18 & 19 OCT 2026*\n📍 Venue: *Filos 24/7, Jodhpur*\n\nPass Link: ${url}`;
    
    const waUrl = cleanNumber ? `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}` : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  // IF VIEWING A PASS (e.g. opened via WhatsApp ticket link or just generated)
  if (generatedToken || ticketToken) {
    return (
      <div className="min-h-screen bg-[#090212] text-white selection:bg-red-600 selection:text-white pb-12">
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-red-600/20 blur-[140px] rounded-full"></div>
          <div className="absolute bottom-0 right-0 w-[400px] h-[300px] bg-amber-600/15 blur-[120px] rounded-full"></div>
        </div>

        <div className="relative z-10 max-w-md mx-auto px-4 pt-6">
          <div className="text-center mb-4">
            {/* Official Calligraphy Logo */}
            <img 
              src="/IMG_3217.PNG" 
              alt="रंगीलो रास Logo" 
              className="h-28 mx-auto object-contain drop-shadow-[0_0_20px_rgba(220,38,38,0.4)]"
            />
            <p className="text-[11px] font-black text-amber-400 tracking-widest uppercase mt-1">BY HOUSE OF CHAOS • JODHPUR</p>
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
                <div className="text-2xl font-black text-white capitalize mt-0.5">{ticketData?.name || recentGeneratedTicket?.guestName || 'Valued Guest'}</div>
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

            {/* QR Code */}
            <div className="bg-white p-4 rounded-2xl text-center shadow-xl border border-red-500/20 mb-4">
              {qrUrl ? (
                <img src={qrUrl} alt="Gate Pass QR" className="w-60 h-60 mx-auto rounded-lg" />
              ) : (
                <div className="w-60 h-60 mx-auto flex items-center justify-center bg-zinc-100 rounded-lg text-zinc-500 text-xs">
                  Generating QR Pass...
                </div>
              )}
              <div className="mt-2 text-[10px] font-black tracking-widest text-zinc-800 uppercase">
                SHOW THIS QR CODE AT ENTRANCE GATE
              </div>
            </div>

            <div className="text-center text-[10px] text-zinc-500 font-mono tracking-widest">
              PASS CATEGORY: {ticketData?.ticketType || recentGeneratedTicket?.ticketType || 'Rangilo Raas Pass'}
            </div>
          </motion.div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 mt-5">
            <button
              onClick={shareWhatsAppAgain}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-lg transition"
            >
              <Share2 className="w-4 h-4" />
              WhatsApp Share
            </button>

            <button
              onClick={copyLink}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white font-black text-xs border border-zinc-700 transition"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Link Copied!' : 'Copy Pass Link'}
            </button>
          </div>

          <div className="text-center mt-6">
            <button 
              onClick={() => { setGeneratedToken(null); setRecentGeneratedTicket(null); window.history.replaceState({}, '', '/'); }}
              className="text-xs font-bold text-red-400 hover:underline"
            >
              + Issue Another Pass & Share via WhatsApp
            </button>
          </div>
        </div>
      </div>
    );
  }

  // DEFAULT MAIN PAGE: TICKET ISSUANCE & WHATSAPP DISPATCHER
  return (
    <div className="min-h-screen bg-[#090212] text-white selection:bg-red-600 selection:text-white pb-20">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-red-600/20 blur-[160px] rounded-full"></div>
        <div className="absolute bottom-0 right-0 w-[500px] h-[350px] bg-amber-600/15 blur-[140px] rounded-full"></div>
      </div>

      <header className="relative z-10 border-b border-zinc-800/80 backdrop-blur-xl bg-zinc-950/60 sticky top-0">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/madsphere_logo.png" alt="MadSphere Logo" className="h-5 object-contain" />
            <span className="text-[10px] tracking-[0.25em] font-semibold text-zinc-500 uppercase pt-0.5">RANGILO RAAS 2026</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold tracking-widest px-2.5 py-1 rounded-full bg-red-600/20 text-red-400 border border-red-600/30 uppercase">
              HOUSE OF CHAOS
            </span>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-md mx-auto px-4 pt-4">
        {/* Calligraphy Header Logo */}
        <div className="text-center mb-6">
          <img 
            src="/IMG_3217.PNG" 
            alt="रंगीलो रास Logo" 
            className="h-32 mx-auto object-contain drop-shadow-[0_0_25px_rgba(220,38,38,0.5)] mb-2"
          />
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-black tracking-widest bg-red-600/20 border border-red-600/30 text-red-400 uppercase">
            <Sparkles className="w-3.5 h-3.5 text-red-400" />
            18 & 19 OCT 2026 • FILOS 24/7, JODHPUR
          </span>
        </div>

        {/* Event Info & Official Pricing Reference Card */}
        <div className="bg-zinc-900/90 border border-red-600/30 rounded-3xl p-6 shadow-2xl backdrop-blur-xl space-y-5">
          <div className="text-center border-b border-zinc-800 pb-4">
            <h2 className="text-xl font-black tracking-wide text-white">RANGILO RAAS 2026</h2>
            <p className="text-xs text-amber-400 font-bold mt-1">THE BIGGEST GARBA FESTIVAL OF JODHPUR</p>
            <p className="text-[11px] text-zinc-400 mt-0.5">Organized by House of Chaos</p>
          </div>

          {/* Pricing Tiers Box */}
          <div className="space-y-3">
            <div className="rounded-2xl bg-zinc-950 p-4 border border-zinc-800 space-y-2">
              <div className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Ticket className="w-4 h-4 text-amber-400" />
                2-DAY PHASE 1 PASSES (18 & 19 OCT)
              </div>
              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div className="bg-zinc-900/80 p-2 rounded-xl border border-zinc-800">
                  <div className="text-[10px] text-zinc-400 font-bold uppercase">SOLO</div>
                  <div className="text-sm font-black text-white mt-0.5">₹699/-</div>
                </div>
                <div className="bg-zinc-900/80 p-2 rounded-xl border border-zinc-800">
                  <div className="text-[10px] text-zinc-400 font-bold uppercase">COUPLE</div>
                  <div className="text-sm font-black text-white mt-0.5">₹999/-</div>
                </div>
                <div className="bg-zinc-900/80 p-2 rounded-xl border border-zinc-800">
                  <div className="text-[10px] text-zinc-400 font-bold uppercase">GROUP OF 10</div>
                  <div className="text-xs font-black text-amber-400 mt-1">₹5,999/-</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-zinc-950 p-4 border border-zinc-800 space-y-2">
              <div className="text-xs font-black text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-red-400" />
                SINGLE DAY EARLY BIRD PASSES (DAY 1 / DAY 2)
              </div>
              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div className="bg-zinc-900/80 p-2 rounded-xl border border-zinc-800">
                  <div className="text-[10px] text-zinc-400 font-bold uppercase">SOLO</div>
                  <div className="text-sm font-black text-white mt-0.5">₹599/-</div>
                </div>
                <div className="bg-zinc-900/80 p-2 rounded-xl border border-zinc-800">
                  <div className="text-[10px] text-zinc-400 font-bold uppercase">COUPLE</div>
                  <div className="text-sm font-black text-white mt-0.5">₹899/-</div>
                </div>
                <div className="bg-zinc-900/80 p-2 rounded-xl border border-zinc-800">
                  <div className="text-[10px] text-zinc-400 font-bold uppercase">GROUP OF 10</div>
                  <div className="text-xs font-black text-red-400 mt-1">₹4,999/-</div>
                </div>
              </div>
            </div>
          </div>

          {/* Secure Access Notice */}
          <div className="rounded-2xl bg-red-950/20 border border-red-500/20 p-4 text-center space-y-1.5">
            <ShieldCheck className="w-5 h-5 text-red-400 mx-auto" />
            <div className="text-xs font-black text-white uppercase tracking-wider">OFFICIAL ORGANIZER PASS ISSUANCE</div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Passes are created and issued directly by official House of Chaos organizers via WhatsApp. If you already received your pass link on WhatsApp, click the link to view your QR code.
            </p>
          </div>

        </div>
      </main>
    </div>
  );
}
