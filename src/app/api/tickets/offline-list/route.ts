import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  try {
    // Fetch tickets and join with users to get names/phones
    const { data: ticketsData, error } = await supabaseAdmin
      .from('tickets')
      .select(`
        id,
        user_id,
        ticket_type,
        qr_token,
        is_used,
        used_at,
        is_banned,
        payment_method,
        collected_by,
        users (
          name,
          phone
        )
      `);

    if (error) {
      console.error('Error fetching offline ticket list:', error);
      return NextResponse.json({ error: 'Failed to fetch tickets from database' }, { status: 500 });
    }

    // Map to a clean flat structure for client IndexedDB consumption
    const flatTickets = (ticketsData || []).map((t: any) => ({
      id: t.id,
      user_id: t.user_id,
      name: t.users?.name || 'Unknown',
      phone: t.users?.phone || '',
      ticket_type: t.ticket_type,
      qr_token: t.qr_token,
      is_used: t.is_used,
      used_at: t.used_at,
      is_banned: t.is_banned,
      payment_method: t.payment_method || 'Complimentary',
      collected_by: t.collected_by || 'Super Admin'
    }));

    return NextResponse.json({
      success: true,
      tickets: flatTickets
    });

  } catch (error) {
    console.error('Error in offline list API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
