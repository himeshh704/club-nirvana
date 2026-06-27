'use client';

import { useState, useEffect } from 'react';
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
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';

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
    linkUrl: string;
    qrDataUrl: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

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

  useEffect(() => {
    const auth = localStorage.getItem('staff_authenticated');
    const role = localStorage.getItem('staff_role');
    
    if (auth !== 'true' || role !== 'Admin') {
      router.push('/staff/login');
      return;
    }
    
    setAuthorized(true);
    fetchMetrics();
    
    // Auto-refresh stats every 30 seconds
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, [router]);

  // Form Submit Handler
  const handleGenerateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !email) {
      alert('Please fill in Name, Phone, and Email.');
      return;
    }

    setGenerating(true);
    try {
      const response = await fetch('/api/tickets/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          email,
          age,
          gender,
          instagram,
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
        
        // Generate client QR code display
        const qrUrl = await QRCode.toDataURL(data.qrToken, { margin: 2 });

        setGeneratedTicket({
          ticketId: data.ticketId,
          ticketType: data.ticketType,
          qrToken: data.qrToken,
          guestName: data.guestName,
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
      const response = await fetch(generatedTicket.qrDataUrl);
      const blob = await response.blob();
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

  return (
    <div className="min-h-screen bg-[#060608] text-white">
      {/* Navbar */}
      <header className="border-b border-zinc-900 bg-black/40 px-6 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Compass className="h-6 w-6 text-[#cca43b]" />
            <h1 className="text-xl font-bold tracking-widest">VANGUARD CONTROL</h1>
          </div>
          <div className="flex gap-4">
            <a href="/" className="rounded-full border border-white/5 px-4 py-1.5 text-xs text-zinc-400 hover:text-white transition-all">GUEST PORTAL</a>
            <a href="/admin/attendees" className="rounded-full border border-white/5 px-4 py-1.5 text-xs text-zinc-400 hover:text-white transition-all">ATTENDEE DIRECTORY</a>
            <a href="/staff/dashboard" className="rounded-full bg-zinc-900 border border-zinc-800 px-4 py-1.5 text-xs text-[#cca43b] hover:bg-zinc-800 transition-all">LAUNCH SCANNER</a>
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
              <Ticket className="h-4 w-4 text-[#cca43b]" />
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
              <UserCheck className="h-4 w-4 text-[#cca43b]" />
            </div>
            {loadingStats ? (
              <div className="h-8 w-16 animate-pulse bg-zinc-800 rounded mt-2"></div>
            ) : (
              <h2 className="text-3xl font-extrabold mt-1 tracking-wide">{stats.checkedIn}</h2>
            )}
            <div className="mt-2 w-full bg-zinc-950 rounded-full h-1.5">
              <div className="bg-[#cca43b] h-1.5 rounded-full" style={{ width: `${percentCheckedIn}%` }}></div>
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
              <Sparkles className="h-4 w-4 text-[#ffe082]" />
            </div>
            {loadingStats ? (
              <div className="h-8 w-16 animate-pulse bg-zinc-800 rounded mt-2"></div>
            ) : (
              <h2 className="text-3xl font-extrabold mt-1 tracking-wide text-[#ffe082]">{stats.vipGuests}</h2>
            )}
            <p className="text-[10px] text-[#ffe082]/60 mt-2">VIP lounge credentials</p>
          </div>
        </div>

        {/* Action Panel Grid */}
        <div className="grid gap-8 lg:grid-cols-12">
          
          {/* Quick Ticket Generator */}
          <div className="lg:col-span-7 space-y-6">
            <div className="glass-panel rounded-3xl p-6 border border-zinc-900 shadow-xl">
              <div className="flex items-center gap-2 border-b border-zinc-850 pb-4 mb-6">
                <PlusCircle className="h-5 w-5 text-[#cca43b]" />
                <h3 className="text-lg font-bold tracking-wide">QUICK TICKET PASS GENERATOR</h3>
              </div>

              <form onSubmit={handleGenerateTicket} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs text-zinc-500 uppercase tracking-wider block">Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="john@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-xl bg-zinc-950 border border-zinc-900 px-4 py-3 text-sm gold-border-glow"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-zinc-500 uppercase tracking-wider block">Instagram Handle (Optional)</label>
                    <input
                      type="text"
                      placeholder="@johndoe"
                      value={instagram}
                      onChange={(e) => setInstagram(e.target.value)}
                      className="w-full rounded-xl bg-zinc-950 border border-zinc-900 px-4 py-3 text-sm gold-border-glow"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs text-zinc-500 uppercase tracking-wider block">Age</label>
                    <input
                      type="number"
                      required
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
                      <option>Male</option>
                      <option>Female</option>
                      <option>Other</option>
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
                  className="mt-4 w-full rounded-xl bg-[#cca43b] py-3.5 text-sm font-semibold tracking-wider text-black transition-all hover:bg-[#ffe082] active:scale-95 disabled:opacity-50"
                >
                  {generating ? 'GENERATING SECURE QR...' : 'CREATE TICKET & SIGN QR'}
                </button>
              </form>
            </div>
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
    </div>
  );
}
