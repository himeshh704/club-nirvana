import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { cleanPassCategory } from '@/lib/formatters';

export async function GET() {
  try {
    // Fetch tickets and join with users to get names/phones
    const { data: ticketsData, error } = await supabaseAdmin
      .from('tickets')
      .select(`
        id,
        user_id,
        ticket_type,
        valid_days,
        qr_token,
        is_used,
        used_at,
        is_banned,
        day_1_scanned,
        day_2_scanned,
        payment_method,
        collected_by,
        created_at,
        users (
          name,
          phone
        )
      `);

    if (error) {
      console.error('Error fetching offline ticket list:', error);
      return NextResponse.json({ success: true, tickets: [], error: 'Failed to fetch tickets from database' });
    }

    // Map to a clean flat structure for client IndexedDB consumption
    const flatTickets = (ticketsData || []).map((t: any) => {
      // Decode JWT token payload safely to recover the attendee's real individual name
      let attendeeName = t.users?.name || 'Unknown';
      try {
        if (t.qr_token) {
          const parts = t.qr_token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
            if (payload && payload.n && typeof payload.n === 'string' && payload.n.trim()) {
              attendeeName = payload.n.trim();
            }
          }
        }
      } catch (_) {}

      return {
        id: t.id,
        user_id: t.user_id,
        name: attendeeName,
        phone: t.users?.phone || '',
        ticket_type: cleanPassCategory(t.ticket_type),
        raw_ticket_type: t.ticket_type,
        valid_days: t.valid_days || 'both',
        qr_token: t.qr_token,
        is_used: t.is_used,
        used_at: t.used_at,
        is_banned: t.is_banned,
        day_1_scanned: t.day_1_scanned || false,
        day_2_scanned: t.day_2_scanned || false,
        payment_method: t.payment_method || 'Complimentary',
        collected_by: t.collected_by || 'Super Admin',
        created_at: t.created_at || new Date().toISOString()
      };
    });

    return NextResponse.json({
      success: true,
      tickets: flatTickets
    });

  } catch (error) {
    console.error('Error in offline list API:', error);
    return NextResponse.json({ success: true, tickets: [], error: 'Internal server error' });
  }
}
