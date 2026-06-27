import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, ticketId, isBanned, isUsed } = body;

    if (!action || !ticketId) {
      return NextResponse.json({ error: 'Missing action or ticketId' }, { status: 400 });
    }

    if (action === 'toggle-blacklist') {
      const { data, error } = await supabaseAdmin
        .from('tickets')
        .update({ is_banned: isBanned })
        .eq('id', ticketId)
        .select('*')
        .single();

      if (error) {
        console.error('Error toggling blacklist state:', error);
        return NextResponse.json({ error: 'Failed to update blacklist state' }, { status: 500 });
      }

      return NextResponse.json({ success: true, ticket: data });
    }

    if (action === 'toggle-checkin') {
      const now = new Date().toISOString();
      const { data, error } = await supabaseAdmin
        .from('tickets')
        .update({ 
          is_used: isUsed,
          used_at: isUsed ? now : null 
        })
        .eq('id', ticketId)
        .select('*')
        .single();

      if (error) {
        console.error('Error toggling checkin state:', error);
        return NextResponse.json({ error: 'Failed to update check-in state' }, { status: 500 });
      }

      // Log checkin event if checked in
      if (isUsed) {
        await supabaseAdmin.from('checkins').insert({
          ticket_id: ticketId,
          gate: 'Admin Panel Override',
          scanner_device: 'Web Admin console',
          online_or_offline: 'online',
          timestamp: now
        });
      }

      return NextResponse.json({ success: true, ticket: data });
    }

    if (action === 'delete-ticket') {
      // First fetch the ticket to find the associated user
      const { data: ticket, error: fetchError } = await supabaseAdmin
        .from('tickets')
        .select('user_id')
        .eq('id', ticketId)
        .single();

      if (fetchError || !ticket) {
        console.error('Error fetching ticket for deletion:', fetchError);
        return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
      }

      // Delete ticket (which cascades or we delete manually)
      const { error: deleteTicketError } = await supabaseAdmin
        .from('tickets')
        .delete()
        .eq('id', ticketId);

      if (deleteTicketError) {
        console.error('Error deleting ticket:', deleteTicketError);
        return NextResponse.json({ error: 'Failed to delete ticket' }, { status: 500 });
      }

      // Check if user has any other tickets. If not, delete user profile
      const { data: otherTickets } = await supabaseAdmin
        .from('tickets')
        .select('id')
        .eq('user_id', ticket.user_id);

      if (!otherTickets || otherTickets.length === 0) {
        await supabaseAdmin.from('users').delete().eq('id', ticket.user_id);
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unsupported action value' }, { status: 400 });

  } catch (error) {
    console.error('Error in admin actions API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
