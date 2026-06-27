import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyQRToken } from '@/lib/qrCrypto';

export async function POST(request: Request) {
  try {
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

    const { ticketId, name, ticketType } = payload;

    // 2. Fetch the latest live ticket status from Supabase database
    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from('tickets')
      .select('id, is_used, used_at, is_banned')
      .eq('id', ticketId)
      .maybeSingle();

    if (ticketError) {
      console.error('Database error fetching ticket:', ticketError);
      return NextResponse.json({ error: 'Database verification failed' }, { status: 500 });
    }

    if (!ticket) {
      return NextResponse.json({ status: 'invalid', message: 'Ticket does not exist in the database.' });
    }

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

    // 5. Mark as checked in (used) in database
    const now = new Date().toISOString();
    const { error: updateError } = await supabaseAdmin
      .from('tickets')
      .update({
        is_used: true,
        used_at: now
      })
      .eq('id', ticketId);

    if (updateError) {
      console.error('Error updating ticket used status:', updateError);
      return NextResponse.json({ error: 'Failed to complete check-in database operation' }, { status: 500 });
    }

    // 6. Log checkin event record
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
      console.error('Error logging check-in record:', checkinError);
      // We don't fail check-in itself since the ticket was already marked as used, but we log the issue
    }

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
