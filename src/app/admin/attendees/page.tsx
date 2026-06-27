'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Compass, 
  Search, 
  Download, 
  ArrowLeft, 
  UserX, 
  UserCheck, 
  Trash2, 
  Copy, 
  Check,
  RefreshCcw,
  AlertOctagon,
  Sparkles
} from 'lucide-react';
import { motion } from 'framer-motion';

interface Attendee {
  id: string; // Ticket ID
  name: string;
  phone: string;
  email: string;
  ticket_type: string;
  qr_token: string;
  is_used: boolean;
  used_at: string | null;
  is_banned: boolean;
}

export default function AttendeeDirectory() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchAttendees = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tickets/offline-list');
      if (!res.ok) throw new Error('Failed to fetch offline list');
      const data = await res.json();
      if (data.success && data.tickets) {
        setAttendees(data.tickets);
      }
    } catch (err) {
      console.error(err);
      alert('Could not download attendee logs.');
    } finally {
      setLoading(false);
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
    fetchAttendees();
  }, [router]);

  // Filter and Search logic
  const filteredAttendees = attendees.filter((item) => {
    const matchesSearch = 
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.phone.includes(search) ||
      item.id.toLowerCase().includes(search.toLowerCase());
    
    if (filterType === 'All') return matchesSearch;
    if (filterType === 'Checked In') return matchesSearch && item.is_used;
    if (filterType === 'Remaining') return matchesSearch && !item.is_used;
    if (filterType === 'VIP') return matchesSearch && item.ticket_type === 'VIP';
    if (filterType === 'Blacklisted') return matchesSearch && item.is_banned;
    return matchesSearch;
  });

  // Action: Toggle Blacklist
  const handleToggleBlacklist = async (ticketId: string, currentBanned: boolean) => {
    const confirmation = window.confirm(
      currentBanned 
        ? "Revoke blacklist? This guest will be allowed entry again." 
        : "Blacklist this guest? Access QR scans will be immediately blocked."
    );
    if (!confirmation) return;

    try {
      const res = await fetch('/api/tickets/admin-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle-blacklist',
          ticketId,
          isBanned: !currentBanned
        })
      });

      if (!res.ok) throw new Error('API action failed');
      fetchAttendees();
    } catch (err) {
      console.error(err);
      alert('Action failed.');
    }
  };

  // Action: Toggle Check-in Override
  const handleToggleCheckin = async (ticketId: string, currentUsed: boolean) => {
    try {
      const res = await fetch('/api/tickets/admin-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle-checkin',
          ticketId,
          isUsed: !currentUsed
        })
      });

      if (!res.ok) throw new Error('API action failed');
      fetchAttendees();
    } catch (err) {
      console.error(err);
      alert('Action failed.');
    }
  };

  // Action: Delete/Revoke Ticket Pass
  const handleDeleteTicket = async (ticketId: string) => {
    const confirmation = window.confirm("Are you sure you want to revoke this pass? This completely deletes the ticket from the system database.");
    if (!confirmation) return;

    try {
      const res = await fetch('/api/tickets/admin-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete-ticket',
          ticketId
        })
      });

      if (!res.ok) throw new Error('API action failed');
      fetchAttendees();
    } catch (err) {
      console.error(err);
      alert('Deletion failed.');
    }
  };

  // Action: Copy Shareable URL
  const handleCopyLink = (qrToken: string, id: string) => {
    const passLink = `${window.location.origin}/?ticket=${qrToken}`;
    navigator.clipboard.writeText(passLink);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Action: Export directory to CSV
  const handleExportCSV = () => {
    if (filteredAttendees.length === 0) {
      alert('No data to export.');
      return;
    }

    const headers = ['Ticket ID', 'Name', 'Phone', 'Email', 'Ticket Type', 'Checked In', 'Check-in Time', 'Banned Status'];
    const rows = filteredAttendees.map(a => [
      a.id,
      a.name,
      `"${a.phone}"`,
      a.email,
      a.ticket_type,
      a.is_used ? 'YES' : 'NO',
      a.used_at ? new Date(a.used_at).toLocaleString() : 'N/A',
      a.is_banned ? 'YES' : 'NO'
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `vanguard_attendee_list_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!authorized) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#060608] text-zinc-500 text-xs tracking-[0.3em] uppercase">
        Verifying Admin Credentials...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060608] text-white">
      {/* Header */}
      <header className="border-b border-zinc-900 bg-black/40 px-6 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/admin" className="rounded-xl bg-zinc-950 border border-zinc-900 p-2.5 text-zinc-400 hover:text-white">
              <ArrowLeft className="h-4 w-4" />
            </a>
            <div>
              <h1 className="text-xl font-bold tracking-widest">ATTENDEE DIRECTORY</h1>
              <p className="text-xs text-zinc-500 font-light">Manage registrations, blacklist overrides, and entry logs</p>
            </div>
          </div>
          
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 rounded-xl bg-[#cca43b] px-5 py-2.5 text-xs font-bold text-black hover:bg-[#ffe082] transition-all"
          >
            <Download className="h-4 w-4" />
            EXPORT TO CSV
          </button>
        </div>
      </header>

      {/* Main Panel */}
      <main className="mx-auto max-w-6xl px-6 py-10 space-y-6">
        
        {/* Filters and Search Bar */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Search Box */}
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search by Name, Phone, or Ticket ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl bg-zinc-950 border border-zinc-900 pl-10 pr-4 py-3 text-sm gold-border-glow"
            />
          </div>

          {/* Filter Categories */}
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            {['All', 'Checked In', 'Remaining', 'VIP', 'Blacklisted'].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`rounded-xl px-4 py-2.5 text-xs font-semibold border transition-all ${
                  filterType === type 
                    ? 'bg-[#cca43b] border-[#cca43b] text-zinc-950' 
                    : 'bg-zinc-950 border-zinc-900 text-zinc-400 hover:text-white'
                }`}
              >
                {type}
              </button>
            ))}
            
            <button 
              onClick={fetchAttendees}
              className="rounded-xl bg-zinc-950 border border-zinc-900 p-2.5 text-zinc-400 hover:text-white"
            >
              <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Directory Listing Table */}
        <div className="glass-panel rounded-3xl border border-zinc-900 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-zinc-900 text-zinc-500 text-xs font-semibold uppercase bg-black/20">
                  <th className="py-4 px-6">Attendee Info</th>
                  <th className="py-4 px-4">Ticket Type</th>
                  <th className="py-4 px-4">Pass Sharing Link</th>
                  <th className="py-4 px-4">Gate Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-zinc-500">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#cca43b] border-t-transparent mx-auto"></div>
                      <span className="block mt-3 text-xs tracking-wider">LOADING DIRECTORY...</span>
                    </td>
                  </tr>
                ) : filteredAttendees.length > 0 ? (
                  filteredAttendees.map((attendee) => (
                    <tr key={attendee.id} className={`hover:bg-zinc-950/40 ${attendee.is_banned ? 'bg-red-950/5' : ''}`}>
                      {/* Name & contact */}
                      <td className="py-4 px-6">
                        <div className="font-semibold text-white text-base">{attendee.name}</div>
                        <div className="text-xs text-zinc-500 mt-0.5 space-x-2">
                          <span>{attendee.phone}</span>
                          <span>•</span>
                          <span>{attendee.email}</span>
                        </div>
                      </td>
                      
                      {/* Ticket Type */}
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs border font-medium ${
                          attendee.ticket_type === 'VIP' ? 'border-[#cca43b] text-[#ffe082] bg-[#cca43b]/5' : 
                          attendee.ticket_type === 'Couple' ? 'border-pink-500/30 text-pink-400' : 'border-zinc-800 text-zinc-400'
                        }`}>
                          {attendee.ticket_type === 'VIP' && <Sparkles className="h-3 w-3 text-[#cca43b]" />}
                          {attendee.ticket_type}
                        </span>
                      </td>

                      {/* URL Sharing */}
                      <td className="py-4 px-4">
                        <button
                          onClick={() => handleCopyLink(attendee.qr_token, attendee.id)}
                          className="flex items-center gap-1 text-xs text-[#cca43b] hover:text-[#ffe082]"
                        >
                          {copiedId === attendee.id ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                              <span className="text-emerald-400 font-semibold">Link Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" />
                              <span>Copy QR Link</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Entry Status */}
                      <td className="py-4 px-4">
                        {attendee.is_banned ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 border border-red-500/20 px-2.5 py-0.5 text-xs font-semibold text-red-400">
                            <AlertOctagon className="h-3.5 w-3.5" /> BANNED
                          </span>
                        ) : attendee.is_used ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                              CHECKED IN
                            </span>
                            <div className="text-[10px] text-zinc-500">
                              {new Date(attendee.used_at || '').toLocaleTimeString()}
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-zinc-900 border border-zinc-850 px-2.5 py-0.5 text-xs font-medium text-zinc-500">
                            REMAINING
                          </span>
                        )}
                      </td>

                      {/* Admin Controls */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex gap-2 justify-end">
                          
                          {/* Force check-in button toggle */}
                          <button
                            onClick={() => handleToggleCheckin(attendee.id, attendee.is_used)}
                            disabled={attendee.is_banned}
                            className={`rounded-lg p-2 border transition-all ${
                              attendee.is_used 
                                ? 'bg-zinc-950 border-zinc-900 text-zinc-500 hover:text-white' 
                                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                            }`}
                            title={attendee.is_used ? "Cancel check-in override" : "Force manual check-in override"}
                          >
                            <UserCheck className="h-4 w-4" />
                          </button>

                          {/* Blacklist toggle */}
                          <button
                            onClick={() => handleToggleBlacklist(attendee.id, attendee.is_banned)}
                            className={`rounded-lg p-2 border transition-all ${
                              attendee.is_banned 
                                ? 'bg-red-500/15 border-red-500/30 text-red-400 hover:bg-red-500/25' 
                                : 'bg-zinc-950 border-zinc-900 text-zinc-500 hover:text-red-400'
                            }`}
                            title={attendee.is_banned ? "Remove from blacklist" : "Add to event blacklist"}
                          >
                            <UserX className="h-4 w-4" />
                          </button>

                          {/* Revoke/Delete */}
                          <button
                            onClick={() => handleDeleteTicket(attendee.id)}
                            className="rounded-lg bg-zinc-950 border border-zinc-900 p-2 text-zinc-500 hover:text-red-500 hover:border-red-950 transition-all"
                            title="Revoke and delete pass"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-zinc-600 font-light">
                      No attendee registrations match search query.
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
