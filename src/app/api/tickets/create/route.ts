import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { signQRToken } from '@/lib/qrCrypto';
import { cleanPassCategory } from '@/lib/formatters';
import { randomUUID } from 'crypto';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, phone, email, age, gender, instagram, ticket_type, payment_method, collected_by, payment_ref, price } = body;

    // Validation
    if (!name || !phone || !ticket_type) {
      return NextResponse.json(
        { error: 'Missing required fields: name, phone, ticket_type' },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();
    const cleanPhone = phone.trim();

    // Clean ticket category so that prices are never stored in category or QR payload
    const cleanCategory = cleanPassCategory(ticket_type);

    // Determine valid_days from explicit parameter or ticket_type string
    let valid_days: 'day_1' | 'day_2' | 'both' = body.valid_days || 'both';
    if (!body.valid_days) {
      const lowerType = ticket_type.toLowerCase();
      if (lowerType.includes('day 1') && !lowerType.includes('2-day')) {
        valid_days = 'day_1';
      } else if (lowerType.includes('day 2') && !lowerType.includes('2-day')) {
        valid_days = 'day_2';
      }
    }

    const ticketId = randomUUID();

    // Cryptographically sign the QR token without any price in payload
    const qrToken = signQRToken({
      i: ticketId,
      n: trimmedName,
      t: cleanCategory,
      v: valid_days
    });

    try {
      let userId = randomUUID();
      // Check if user exists with BOTH phone AND matching name
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id, name')
        .eq('phone', cleanPhone)
        .ilike('name', trimmedName)
        .maybeSingle();

      if (existingUser?.id) {
        userId = existingUser.id;
      } else {
        const { data: newUser } = await supabaseAdmin
          .from('users')
          .insert({
            name: trimmedName,
            phone: cleanPhone,
            email: email || `${cleanPhone.replace(/\D/g, '') || Date.now()}@rangiloraas.com`,
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

      // Record custom price in payment_method / payment_ref for internal auditing
      let formattedPaymentMethod = payment_method || (payment_ref ? `UPI (${payment_ref})` : 'Online UPI');
      if (price !== undefined && price !== null && String(price).trim() !== '') {
        const cleanPriceStr = String(price).replace(/[^\d.]/g, '');
        if (cleanPriceStr && !formattedPaymentMethod.includes('₹')) {
          formattedPaymentMethod = `${formattedPaymentMethod} (₹${cleanPriceStr})`;
        }
      }

      await supabaseAdmin
        .from('tickets')
        .insert({
          id: ticketId,
          user_id: userId,
          ticket_type: cleanCategory,
          valid_days,
          qr_token: qrToken,
          is_used: false,
          is_banned: false,
          day_1_scanned: false,
          day_2_scanned: false,
          payment_method: formattedPaymentMethod,
          payment_ref: payment_ref || (price ? `Price: ₹${price}` : null),
          collected_by: collected_by || 'Online Guest Portal'
        });
    } catch (dbErr) {
      console.warn('Database connection notice during ticket creation. Issued cryptographically signed pass:', dbErr);
    }

    return NextResponse.json({
      success: true,
      ticketId,
      ticketType: cleanCategory,
      validDays: valid_days,
      qrToken,
      guestName: trimmedName
    });

  } catch (error) {
    console.error('Error in tickets create API route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
