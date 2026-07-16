import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { signQRToken } from '@/lib/qrCrypto';
import { verifyAdminRequest, extractVIPTableName, checkTableReservationConflict } from '@/lib/ticketValidation';
import { randomUUID } from 'crypto';

export async function POST(request: Request) {
  try {
    const authError = verifyAdminRequest(request);
    if (authError) return authError;

    const body = await request.json();
    const { name, phone, email, age, gender, instagram, ticket_type, payment_method, collected_by } = body;

    // Validation
    if (!name || !phone || !email || !age || !gender || !ticket_type) {
      return NextResponse.json(
        { error: 'Missing required fields: name, phone, email, age, gender, ticket_type' },
        { status: 400 }
      );
    }

    const parsedAge = parseInt(String(age), 10);
    if (isNaN(parsedAge) || parsedAge < 21) {
      return NextResponse.json(
        { error: 'Age Limit Restriction: Guests must be 21 years of age or older to enter Club Nirvana.' },
        { status: 400 }
      );
    }

    // Check table reservation uniqueness if this pass is for a VIP Table
    const extractedTable = extractVIPTableName(ticket_type, body.table_number);
    if (extractedTable) {
      const { conflict, assignedHost } = await checkTableReservationConflict(supabaseAdmin, extractedTable);
      if (conflict) {
        return NextResponse.json(
          { error: `Table Reservation Conflict: "${extractedTable}" is already signed and assigned to ${assignedHost}. Cannot issue another pass for "${extractedTable}".` },
          { status: 409 }
        );
      }
    }

    const ticketId = randomUUID();

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
        // Insert ticket into DB if user was found/created with explicit UUID
        await supabaseAdmin
          .from('tickets')
          .insert({
            id: ticketId,
            user_id: userId,
            ticket_type,
            qr_token: `TEMP_${ticketId}`,
            is_used: false,
            is_banned: false,
            payment_method: payment_method || 'Complimentary',
            collected_by: collected_by || 'Super Admin'
          });
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

    // Best-effort update or upsert of token in database so foreign keys work reliably
    try {
      const { data: updatedRows } = await supabaseAdmin
        .from('tickets')
        .update({ 
          qr_token: qrToken,
          payment_method: payment_method || 'Complimentary',
          collected_by: collected_by || 'Super Admin'
        })
        .eq('id', ticketId)
        .select('id');

      if (!updatedRows || updatedRows.length === 0) {
        // Insert fallback record with UUID if user link failed
        await supabaseAdmin.from('tickets').insert({
          id: ticketId,
          ticket_type,
          qr_token: qrToken,
          is_used: false,
          is_banned: false,
          payment_method: payment_method || 'Complimentary',
          collected_by: collected_by || 'Super Admin'
        });
      }
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
