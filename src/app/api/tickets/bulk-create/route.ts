import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { signQRToken } from '@/lib/qrCrypto';

interface BulkGuestInput {
  name: string;
  phone: string;
  email?: string;
  age?: string | number;
  gender?: string;
  ticket_type?: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const guests: BulkGuestInput[] = body.guests;

    if (!Array.isArray(guests) || guests.length === 0) {
      return NextResponse.json(
        { error: 'Invalid payload: guests must be a non-empty array' },
        { status: 400 }
      );
    }

    if (guests.length > 200) {
      return NextResponse.json(
        { error: 'Bulk limit exceeded: Maximum 200 guests per batch request' },
        { status: 400 }
      );
    }

    const results = [];
    let createdCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const guest of guests) {
      const name = guest.name?.trim();
      const phone = guest.phone?.trim();
      const email = guest.email?.trim() || 'guest@clubnirvana.com';
      const age = parseInt(String(guest.age || 21), 10) || 21;
      const gender = guest.gender?.trim() || 'Unspecified';
      const ticket_type = guest.ticket_type?.trim() || 'Regular';

      if (!name || !phone) {
        results.push({
          name: name || 'Unknown',
          phone: phone || '',
          email,
          ticketType: ticket_type,
          status: 'ERROR',
          message: 'Missing Name or Phone'
        });
        errorCount++;
        continue;
      }

      try {
        // Check for existing user by phone
        const { data: existingUser } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('phone', phone)
          .maybeSingle();

        let userId = existingUser?.id;

        if (userId) {
          // Check existing ticket
          const { data: existingTicket } = await supabaseAdmin
            .from('tickets')
            .select('id, qr_token, ticket_type')
            .eq('user_id', userId)
            .maybeSingle();

          if (existingTicket) {
            results.push({
              name,
              phone,
              email,
              ticketType: existingTicket.ticket_type,
              ticketId: existingTicket.id,
              qrToken: existingTicket.qr_token,
              status: 'SKIPPED',
              message: 'Guest already has an active pass',
              linkUrl: `/?ticket=${existingTicket.qr_token}`
            });
            skippedCount++;
            continue;
          }
        } else {
          // Create user profile
          const { data: newUser, error: createError } = await supabaseAdmin
            .from('users')
            .insert({
              name,
              phone,
              email,
              age,
              gender
            })
            .select('id')
            .single();

          if (createError || !newUser) {
            results.push({
              name,
              phone,
              email,
              ticketType: ticket_type,
              status: 'ERROR',
              message: createError?.message || 'Failed to insert user profile'
            });
            errorCount++;
            continue;
          }

          userId = newUser.id;
        }

        const allowedTypes = ['Regular', 'VIP', 'Couple', 'Staff', 'Guest List'];
        const normalizedTicketType = allowedTypes.includes(ticket_type)
          ? ticket_type
          : ticket_type === 'VVIP'
          ? 'VIP'
          : ticket_type === 'Couple'
          ? 'Couple'
          : 'Regular';

        // Insert ticket
        const { data: tempTicket, error: ticketError } = await supabaseAdmin
          .from('tickets')
          .insert({
            user_id: userId,
            ticket_type: normalizedTicketType,
            qr_token: `BULK_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            is_used: false,
            is_banned: false
          })
          .select('id')
          .single();

        if (ticketError || !tempTicket) {
          results.push({
            name,
            phone,
            email,
            ticketType: ticket_type,
            status: 'ERROR',
            message: ticketError?.message || 'Failed to insert ticket row'
          });
          errorCount++;
          continue;
        }

        const ticketId = tempTicket.id;
        const qrToken = signQRToken({
          i: ticketId,
          n: name,
          t: ticket_type
        });

        // Update token
        const { error: updateError } = await supabaseAdmin
          .from('tickets')
          .update({ qr_token: qrToken })
          .eq('id', ticketId);

        if (updateError) {
          results.push({
            name,
            phone,
            email,
            ticketType: ticket_type,
            status: 'ERROR',
            message: 'Failed to update token signature'
          });
          errorCount++;
          continue;
        }

        results.push({
          name,
          phone,
          email,
          ticketType: ticket_type,
          ticketId,
          qrToken,
          status: 'CREATED',
          message: 'Pass created successfully',
          linkUrl: `/?ticket=${qrToken}`
        });
        createdCount++;
      } catch (innerError: any) {
        results.push({
          name,
          phone,
          email,
          ticketType: ticket_type,
          status: 'ERROR',
          message: innerError?.message || 'Unexpected row error'
        });
        errorCount++;
      }
    }

    return NextResponse.json({
      success: true,
      totalProcessed: guests.length,
      created: createdCount,
      skipped: skippedCount,
      errors: errorCount,
      results
    });
  } catch (error: any) {
    console.error('Bulk create API error:', error);
    return NextResponse.json(
      { error: 'Internal server error during bulk import' },
      { status: 500 }
    );
  }
}
