import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyQRToken } from '@/lib/qrCrypto';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { qrToken, gate, scannerDevice, scanDate } = body;

    if (!qrToken) {
      return NextResponse.json({ error: 'Missing qrToken' }, { status: 400 });
    }

    const deviceName = scannerDevice || 'Gate Mobile App';
    const gateName = gate || 'Main Entry Gate';
    
    // Default scan date (Oct 18 = Day 1, Oct 19 = Day 2)
    const activeScanDate = scanDate || 'Oct 18';

    // 1. Cryptographically verify QR token signature
    let payload;
    try {
      payload = verifyQRToken(qrToken);
    } catch (err) {
      console.warn('QR verification signature mismatch:', err);
      return NextResponse.json({ status: 'invalid', message: 'Cryptographic signature mismatch. Counterfeit or fake ticket.' });
    }

    const { i: ticketId, n: payloadName, t: payloadTicketType } = payload;

    // 2. Fetch live ticket state from database
    let ticket = null;
    let ticketError = null;
    try {
      const res = await supabaseAdmin
        .from('tickets')
        .select('id, ticket_type, valid_days, is_used, used_at, day_1_scanned, day_1_scanned_at, day_2_scanned, day_2_scanned_at, is_banned, users(name)')
        .eq('id', ticketId)
        .maybeSingle();
      ticket = res.data;
      ticketError = res.error;
    } catch (dbEx) {
      console.warn('DB query exception during scan check:', dbEx);
    }

    const name = (ticket as any)?.users?.name || payloadName || 'Guest';
    const ticketType = ticket?.ticket_type || payloadTicketType || '2-Day Season Pass';
    const validDays = ticket?.valid_days || (payloadTicketType?.toLowerCase().includes('day 1') ? 'day_1' : payloadTicketType?.toLowerCase().includes('day 2') ? 'day_2' : 'both');

    // 3. Blacklist check
    if (ticket && ticket.is_banned) {
      return NextResponse.json({
        status: 'banned',
        guestName: name,
        ticketType,
        message: 'Guest has been blacklisted. Entry denied by Security.'
      });
    }

    // 4. Date Validity Enforcement
    if (activeScanDate === 'Oct 18' && validDays === 'day_2') {
      return NextResponse.json({
        status: 'invalid_date',
        guestName: name,
        ticketType,
        message: 'Invalid Pass Date! This pass is valid for Day 2 (Oct 19) Only.'
      });
    }

    if (activeScanDate === 'Oct 19' && validDays === 'day_1') {
      return NextResponse.json({
        status: 'invalid_date',
        guestName: name,
        ticketType,
        message: 'Invalid Pass Date! This pass was valid for Day 1 (Oct 18) Only.'
      });
    }

    // 5. Today's Duplicate Entry Check
    if (activeScanDate === 'Oct 18' && ticket?.day_1_scanned) {
      return NextResponse.json({
        status: 'already_used',
        guestName: name,
        ticketType,
        usedAt: ticket.day_1_scanned_at,
        message: `Already checked in today (Day 1) at ${new Date(ticket.day_1_scanned_at || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      });
    }

    if (activeScanDate === 'Oct 19' && ticket?.day_2_scanned) {
      return NextResponse.json({
        status: 'already_used',
        guestName: name,
        ticketType,
        usedAt: ticket.day_2_scanned_at,
        message: `Already checked in today (Day 2) at ${new Date(ticket.day_2_scanned_at || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      });
    }

    // Single-use fallback check if not multi-day tracked
    if (ticket?.is_used && validDays !== 'both' && !ticket.day_1_scanned && !ticket.day_2_scanned) {
      return NextResponse.json({
        status: 'already_used',
        guestName: name,
        ticketType,
        usedAt: ticket.used_at,
        message: `Ticket already used at ${new Date(ticket.used_at || '').toLocaleTimeString()}`
      });
    }

    // 6. Execute atomic update
    const now = new Date().toISOString();
    try {
      const updatePayload: any = { is_used: true, used_at: now };
      if (activeScanDate === 'Oct 18') {
        updatePayload.day_1_scanned = true;
        updatePayload.day_1_scanned_at = now;
      } else {
        updatePayload.day_2_scanned = true;
        updatePayload.day_2_scanned_at = now;
      }

      await supabaseAdmin
        .from('tickets')
        .update(updatePayload)
        .eq('id', ticketId);

      // Log checkin record
      await supabaseAdmin
        .from('checkins')
        .insert({
          ticket_id: ticketId,
          scan_date: activeScanDate,
          gate: gateName,
          scanner_device: deviceName,
          online_or_offline: 'online',
          timestamp: now
        });

    } catch (updateEx) {
      console.warn('DB update exception during scan, payload cryptographically verified:', updateEx);
    }

    return NextResponse.json({
      status: 'valid',
      guestName: name,
      ticketType,
      validDays,
      scanDate: activeScanDate,
      entryTime: now,
      message: `Welcome to Rangilo Raas! Entry Granted for ${activeScanDate}.`
    });

  } catch (error) {
    console.error('Error in scan ticket API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
