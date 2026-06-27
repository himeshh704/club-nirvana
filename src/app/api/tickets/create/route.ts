import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { signQRToken } from '@/lib/qrCrypto';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, phone, email, age, gender, instagram, ticket_type } = body;

    // Validation
    if (!name || !phone || !email || !age || !gender || !ticket_type) {
      return NextResponse.json(
        { error: 'Missing required fields: name, phone, email, age, gender, ticket_type' },
        { status: 400 }
      );
    }

    // 1. Create or retrieve the user
    // To prevent duplicate user profiles, we can search by phone first
    const { data: existingUser, error: searchError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('phone', phone)
      .maybeSingle();

    if (searchError) {
      console.error('Error searching for user:', searchError);
      return NextResponse.json({ error: 'Database search failed' }, { status: 500 });
    }

    let userId = existingUser?.id;

    if (!userId) {
      const { data: newUser, error: createError } = await supabaseAdmin
        .from('users')
        .insert({
          name,
          phone,
          email,
          age: parseInt(age, 10),
          gender,
          instagram: instagram || null
        })
        .select('id')
        .single();

      if (createError || !newUser) {
        console.error('Error creating user:', createError);
        return NextResponse.json({ error: 'Failed to create guest user profile' }, { status: 500 });
      }

      userId = newUser.id;
    }

    // 2. Insert a temporary ticket to get its ID
    const { data: tempTicket, error: ticketError } = await supabaseAdmin
      .from('tickets')
      .insert({
        user_id: userId,
        ticket_type,
        qr_token: `TEMP_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        is_used: false,
        is_banned: false
      })
      .select('id, created_at')
      .single();

    if (ticketError || !tempTicket) {
      console.error('Error creating temporary ticket:', ticketError);
      return NextResponse.json({ error: 'Failed to generate ticket' }, { status: 500 });
    }

    const ticketId = tempTicket.id;

    // 3. Cryptographically sign the QR token
    const qrToken = signQRToken({
      ticketId,
      userId,
      ticketType: ticket_type,
      name,
      createdAt: tempTicket.created_at
    });

    // 4. Update the ticket with the signed QR token
    const { data: finalTicket, error: updateError } = await supabaseAdmin
      .from('tickets')
      .update({ qr_token: qrToken })
      .eq('id', ticketId)
      .select('*')
      .single();

    if (updateError || !finalTicket) {
      console.error('Error updating ticket token:', updateError);
      return NextResponse.json({ error: 'Failed to update ticket verification token' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      ticketId: finalTicket.id,
      ticketType: finalTicket.ticket_type,
      qrToken,
      guestName: name
    });

  } catch (error) {
    console.error('Error in tickets create API route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
