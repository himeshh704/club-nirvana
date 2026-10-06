import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { signQRToken } from '@/lib/qrCrypto';
import { randomUUID } from 'crypto';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, phone, email, age, gender, instagram, ticket_type, payment_method, collected_by, payment_ref } = body;

    // Validation
    if (!name || !phone || !ticket_type) {
      return NextResponse.json(
        { error: 'Missing required fields: name, phone, ticket_type' },
        { status: 400 }
      );
    }

    // Determine valid_days from ticket_type string
    let valid_days: 'day_1' | 'day_2' | 'both' = 'both';
    const lowerType = ticket_type.toLowerCase();
    if (lowerType.includes('day 1') && !lowerType.includes('2-day')) {
      valid_days = 'day_1';
    } else if (lowerType.includes('day 2') && !lowerType.includes('2-day')) {
      valid_days = 'day_2';
    }

    const ticketId = randomUUID();

    // Cryptographically sign the QR token
    const qrToken = signQRToken({
      i: ticketId,
      n: name,
      t: ticket_type,
      v: valid_days
    });

    try {
      let userId = randomUUID();
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('phone', phone)
        .maybeSingle();

      if (existingUser?.id) {
        userId = existingUser.id;
      } else {
        const { data: newUser } = await supabaseAdmin
          .from('users')
          .insert({
            name,
            phone,
            email: email || `${phone}@rangiloraas.com`,
            age: parseInt(String(age || '20'), 10),
            gender: gender || 'General',
            instagram: instagram || null
          })
          .select('id')
          .single();

        if (newUser?.id) {
          userId = newUser.id;
        }
      }

      await supabaseAdmin
        .from('tickets')
        .insert({
          id: ticketId,
          user_id: userId,
          ticket_type,
          valid_days,
          qr_token: qrToken,
          is_used: false,
          is_banned: false,
          day_1_scanned: false,
          day_2_scanned: false,
          payment_method: payment_method || (payment_ref ? `UPI (${payment_ref})` : 'Online UPI'),
          collected_by: collected_by || 'Online Guest Portal'
        });
    } catch (dbErr) {
      console.warn('Database connection notice during ticket creation. Issued cryptographically signed pass:', dbErr);
    }

    return NextResponse.json({
      success: true,
      ticketId,
      ticketType: ticket_type,
      validDays: valid_days,
      qrToken,
      guestName: name
    });

  } catch (error) {
    console.error('Error in tickets create API route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
