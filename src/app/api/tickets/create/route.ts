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

    let ticketId = `TICKET_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    try {
      // 1. Create or retrieve the user in Supabase (optional best-effort sync)
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('phone', phone)
        .maybeSingle();

      let userId = existingUser?.id;

      if (!userId) {
        const { data: newUser } = await supabaseAdmin
          .from('users')
          .insert({
            name,
            phone,
            email,
            age: parseInt(age, 10) || 21,
            gender,
            instagram: instagram || null
          })
          .select('id')
          .single();

        if (newUser) {
          userId = newUser.id;
        }
      }

      if (userId) {
        // Insert ticket into DB if user was found/created
        const { data: tempTicket } = await supabaseAdmin
          .from('tickets')
          .insert({
            user_id: userId,
            ticket_type,
            qr_token: `TEMP_${Date.now()}`,
            is_used: false,
            is_banned: false
          })
          .select('id')
          .single();

        if (tempTicket) {
          ticketId = tempTicket.id;
        }
      }
    } catch (dbErr) {
      console.warn('Database sync warning during ticket creation, continuing with cryptographic generation:', dbErr);
    }

    // Cryptographically sign the QR token
    const qrToken = signQRToken({
      i: ticketId,
      n: name,
      t: ticket_type
    });

    // Best-effort update of token in database
    try {
      await supabaseAdmin
        .from('tickets')
        .update({ qr_token: qrToken })
        .eq('id', ticketId);
    } catch (e) {
      // Ignore DB update error
    }

    return NextResponse.json({
      success: true,
      ticketId,
      ticketType: ticket_type,
      qrToken,
      guestName: name
    });

  } catch (error) {
    console.error('Error in tickets create API route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
