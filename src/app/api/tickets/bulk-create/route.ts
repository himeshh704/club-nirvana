import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { signQRToken } from '@/lib/qrCrypto';
import { randomUUID } from 'crypto';

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
        { error: 'Invalid input: guests must be a non-empty array' },
        { status: 400 }
      );
    }

    if (guests.length > 500) {
      return NextResponse.json(
        { error: 'Maximum batch size is 500 guests per upload' },
        { status: 400 }
      );
    }

    const results = [];
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (const guest of guests) {
      const name = guest.name?.trim();
      const phone = guest.phone?.trim();
      const email = guest.email?.trim() || `${phone}@placeholder.clubnirvana.local`;
      const age = guest.age ? parseInt(String(guest.age), 10) : 21;
      const gender = guest.gender || 'Not Specified';
      const ticket_type = guest.ticket_type?.trim() || 'Regular';

      if (!name || !phone) {
        results.push({
          name: name || 'Unknown',
          phone: phone || 'Unknown',
          ticketType: ticket_type,
          status: 'ERROR',
          message: 'Name and Phone Number are mandatory'
        });
        errorCount++;
        continue;
      }

      if (isNaN(age) || age < 21) {
        results.push({
          name,
          phone,
          ticketType: ticket_type,
          status: 'ERROR',
          message: 'Age Limit Restriction: Guests must be 21+ to enter Club Nirvana'
        });
        errorCount++;
        continue;
      }

      try {
        // Check if table reservation is taken if this pass is for a VIP Table
        const extractedTable = ticket_type.match(/\[(Table\s*[^-\]]+)[\s-]/i)?.[1]?.trim() || (ticket_type.toLowerCase().includes('table') ? ticket_type : null);
        if (extractedTable && extractedTable.toLowerCase().includes('table')) {
          try {
            const { data: existingTableTickets } = await supabaseAdmin
              .from('tickets')
              .select('id, ticket_type, users(name)')
              .ilike('ticket_type', `%${extractedTable}%`)
              .limit(1);

            if (existingTableTickets && existingTableTickets.length > 0) {
              const assignedHost = (existingTableTickets[0] as any)?.users?.name || 'an existing VIP Host';
              results.push({
                name,
                phone,
                ticketType: ticket_type,
                status: 'ERROR',
                message: `Table Conflict: "${extractedTable}" already assigned to ${assignedHost}`
              });
              errorCount++;
              continue;
            }
          } catch (_) {}
        }

        // Check if user exists
        const { data: existingUser } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('phone', phone)
          .maybeSingle();

        let userId = existingUser?.id;

        if (userId) {
          // Check if guest already has a ticket of this exact type or if we should skip duplicates
          const { data: existingTicket } = await supabaseAdmin
            .from('tickets')
            .select('id, ticket_type')
            .eq('user_id', userId)
            .eq('ticket_type', ticket_type)
            .maybeSingle();

          if (existingTicket) {
            results.push({
              name,
              phone,
              email,
              ticketType: ticket_type,
              status: 'SKIPPED',
              message: `Guest already has a ${ticket_type} pass`
            });
            skippedCount++;
            continue;
          }
        } else {
          // Create new user
          const { data: newUser, error: createError } = await supabaseAdmin
            .from('users')
            .insert({
              name,
              phone,
              email,
              age: isNaN(age) ? 21 : age,
              gender,
              instagram: null
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
              message: createError?.message || 'Failed to create user record'
            });
            errorCount++;
            continue;
          }

          userId = newUser.id;
        }

        const allowedTypes = ['Regular', 'VIP', 'Couple', 'Staff', 'Guest List'];
        const normalizedTicketType = allowedTypes.includes(ticket_type) || ticket_type.toLowerCase().includes('table')
          ? ticket_type
          : ticket_type === 'VVIP'
          ? 'VIP'
          : ticket_type === 'Couple'
          ? 'Couple'
          : 'Regular';

        const ticketId = randomUUID();
        const qrToken = signQRToken({
          i: ticketId,
          n: name,
          t: normalizedTicketType
        });

        // Insert ticket with explicit UUID
        const { error: ticketError } = await supabaseAdmin
          .from('tickets')
          .insert({
            id: ticketId,
            user_id: userId,
            ticket_type: normalizedTicketType,
            qr_token: qrToken,
            is_used: false,
            is_banned: false
          });

        if (ticketError) {
          results.push({
            name,
            phone,
            email,
            ticketType: ticket_type,
            status: 'ERROR',
            message: ticketError.message || 'Failed to insert ticket row'
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
        successCount++;
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
      created: successCount,
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
