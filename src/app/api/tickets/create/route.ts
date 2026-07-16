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

    // 1. Create or retrieve the user in Supabase
    let userId = null;
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('phone', phone)
      .maybeSingle();

    if (existingUser?.id) {
      userId = existingUser.id;
    } else {
      const { data: newUser, error: userError } = await supabaseAdmin
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

      if (userError || !newUser) {
        console.error('Error creating user record:', userError);
        return NextResponse.json(
          { error: `Database error creating guest profile: ${userError?.message || 'Unknown error'}` },
          { status: 500 }
        );
      }
      userId = newUser.id;
    }

    // 2. Cryptographically sign the QR token
    const qrToken = signQRToken({
      i: ticketId,
      n: name,
      t: ticket_type
    });

    // 3. Insert ticket cleanly into database
    const { error: ticketError } = await supabaseAdmin
      .from('tickets')
      .insert({
        id: ticketId,
        user_id: userId,
        ticket_type,
        qr_token: qrToken,
        is_used: false,
        is_banned: false,
        payment_method: payment_method || 'Complimentary',
        collected_by: collected_by || 'Super Admin'
      });

    if (ticketError) {
      console.error('Error inserting ticket into database:', ticketError);
      const isCheckConstraint = ticketError.code === '23514' || ticketError.message?.includes('tickets_ticket_type_check');
      const isNotNullConstraint = ticketError.code === '23502';
      
      let errorMsg = `Database error saving ticket: ${ticketError.message}`;
      if (isCheckConstraint) {
        errorMsg = `Database Check Constraint Violation ("tickets_ticket_type_check").\n\nYour Supabase database currently restricts ticket types. To allow VIP Tables and all custom tiers, please run this exact 1-line SQL query in your Supabase Dashboard SQL Editor:\n\nALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_ticket_type_check;`;
      } else if (isNotNullConstraint) {
        errorMsg = `Database Schema Violation: ${ticketError.message}`;
      }

      return NextResponse.json(
        { error: errorMsg },
        { status: 500 }
      );
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
