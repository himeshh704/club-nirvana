import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyQRToken } from '@/lib/qrCrypto';
import { verifyAdminRequest } from '@/lib/ticketValidation';

export async function POST(request: Request) {
  try {
    const authError = verifyAdminRequest(request);
    if (authError) return authError;

    const body = await request.json();
    const { qrToken, gate, scannerDevice } = body;

    if (!qrToken) {
      return NextResponse.json({ error: 'Missing qrToken' }, { status: 400 });
    }

    const deviceName = scannerDevice || 'Online Browser';
    const gateName = gate || 'Main Gate';

    // 1. Verify cryptographic token signature
    let payload;
    try {
      payload = verifyQRToken(qrToken);
    } catch (err) {
      console.warn('QR verification signature mismatch:', err);
      return NextResponse.json({ status: 'invalid', message: 'Cryptographic signature mismatch. Possible fake ticket.' });
    }

    const { i: ticketId, n: payloadName, t: payloadTicketType } = payload;

    // 2. Fetch the latest live ticket status from Supabase database (joining user name)
    let ticket = null;
    let ticketError = null;
    try {
      const res = await supabaseAdmin
        .from('tickets')
        .select('id, is_used, used_at, is_banned, ticket_type, users(name)')
        .eq('id', ticketId)
        .maybeSingle();
      ticket = res.data;
      ticketError = res.error;
    } catch (dbEx) {
      console.warn('DB query exception during scan check:', dbEx);
    }

    if (ticketError || !ticket) {
      console.warn('Ticket not found or DB error during scan, relying on cryptographically verified payload:', ticketError || 'Missing row');
      
      // Check if checkin record already exists for this ticketId using limit(1) to avoid PGRST116
      try {
        const { data: existingCheckins } = await supabaseAdmin
          .from('checkins')
          .select('id, timestamp')
          .eq('ticket_id', ticketId)
          .limit(1);

        if (existingCheckins && existingCheckins.length > 0) {
          const existingCheckin = existingCheckins[0];
          return NextResponse.json({
            status: 'already_used',
            guestName: payloadName || 'VIP Guest',
            ticketType: payloadTicketType || 'Regular',
            usedAt: existingCheckin.timestamp,
            message: `Already checked in at ${new Date(existingCheckin.timestamp || '').toLocaleTimeString()}`
          });
        }
      } catch (_) {}

      const now = new Date().toISOString();

      // Ensure ticket exists in tickets table to satisfy checkins_ticket_id_fkey foreign key constraint!
      try {
        await supabaseAdmin.from('tickets').insert({
          id: ticketId,
          user_id: null,
          ticket_type: payloadTicketType || 'VIP',
          qr_token: qrToken,
          is_used: true,
          used_at: now,
          is_banned: false
        });
      } catch (insertErr) {
        console.warn('Could not auto-create missing ticket before checkin (might already exist):', insertErr);
      }

      // Log checkin safely
      try {
        await supabaseAdmin.from('checkins').insert({
          ticket_id: ticketId,
          gate: gateName,
          scanner_device: deviceName,
          online_or_offline: 'online',
          timestamp: now
        });
      } catch (_) {}

      return NextResponse.json({
        status: 'valid',
        guestName: payloadName || 'VIP Guest',
        ticketType: payloadTicketType || 'Regular',
        entryTime: now
      });
    }

    const name = (ticket as any)?.users?.name || payloadName || 'Guest';
    const ticketType = ticket.ticket_type || payloadTicketType || 'Regular';

    // 3. Check if blacklisted / banned
    if (ticket.is_banned) {
      return NextResponse.json({
        status: 'banned',
        guestName: name,
        ticketType,
        message: 'This guest has been blacklisted. Entry denied.'
      });
    }

    // 4. Check if already checked in
    if (ticket.is_used) {
      return NextResponse.json({
        status: 'already_used',
        guestName: name,
        ticketType,
        usedAt: ticket.used_at,
        message: `Already checked in at ${new Date(ticket.used_at || '').toLocaleTimeString()}`
      });
    }

    // 5. Mark as checked in (used) in database atomically
    const now = new Date().toISOString();
    try {
      const { data: updatedRows, error: updateError } = await supabaseAdmin
        .from('tickets')
        .update({
          is_used: true,
          used_at: now
        })
        .eq('id', ticketId)
        .eq('is_used', false)
        .select('id');

      if (updateError) {
        console.warn('Error updating ticket used status in DB:', updateError);
      } else if (!updatedRows || updatedRows.length === 0) {
        // Race condition: ticket was marked used between select and update by concurrent scan
        return NextResponse.json({
          status: 'already_used',
          guestName: name,
          ticketType,
          usedAt: now,
          message: 'Ticket checked in by another gate scanner concurrently.'
        });
      }
    } catch (updateEx) {
      console.warn('Exception updating ticket used status:', updateEx);
    }

    // 6. Log checkin event record
    try {
      const { error: checkinError } = await supabaseAdmin
        .from('checkins')
        .insert({
          ticket_id: ticketId,
          gate: gateName,
          scanner_device: deviceName,
          online_or_offline: 'online',
          timestamp: now
        });

      if (checkinError) {
        console.warn('Error logging check-in record:', checkinError);
      }
    } catch (_) {}

    return NextResponse.json({
      status: 'valid',
      guestName: name,
      ticketType,
      entryTime: now
    });

  } catch (error) {
    console.error('Error in scan ticket API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
