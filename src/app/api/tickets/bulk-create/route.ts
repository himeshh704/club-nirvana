import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { signQRToken } from '@/lib/qrCrypto';
import { verifyAdminRequest, extractVIPTableName, checkTableReservationConflict } from '@/lib/ticketValidation';
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
    const authError = verifyAdminRequest(request);
    if (authError) return authError;

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

    const results: any[] = [];
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    // Process guests in concurrent chunks of 15 for 10x throughput and to prevent serverless execution timeouts
    const CHUNK_SIZE = 15;
    for (let i = 0; i < guests.length; i += CHUNK_SIZE) {
      const chunk = guests.slice(i, i + CHUNK_SIZE);
      const chunkPromises = chunk.map(async (guest) => {
        const name = guest.name?.trim();
        const phone = guest.phone?.trim();
        const email = guest.email?.trim() || `${phone}@placeholder.clubnirvana.local`;
        const age = guest.age ? parseInt(String(guest.age), 10) : 21;
        const gender = guest.gender || 'Not Specified';
        const ticket_type = guest.ticket_type?.trim() || 'Regular';

        if (!name || !phone) {
          return {
            name: name || 'Unknown',
            phone: phone || 'Unknown',
            ticketType: ticket_type,
            status: 'ERROR',
            message: 'Name and Phone Number are mandatory'
          };
        }

        if (isNaN(age) || age < 21) {
          return {
            name,
            phone,
            ticketType: ticket_type,
            status: 'ERROR',
            message: 'Age Limit Restriction: Guests must be 21+ to enter Club Nirvana'
          };
        }

        try {
          // Check if table reservation is taken if this pass is for a VIP Table
          const extractedTable = extractVIPTableName(ticket_type);
          if (extractedTable) {
            const { conflict, assignedHost } = await checkTableReservationConflict(supabaseAdmin, extractedTable);
            if (conflict) {
              return {
                name,
                phone,
                ticketType: ticket_type,
                status: 'ERROR',
                message: `Table Conflict: "${extractedTable}" already assigned to ${assignedHost}`
              };
            }
          }

          // Check if user exists
          const { data: existingUser } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('phone', phone)
            .maybeSingle();

          let userId = existingUser?.id;

          if (userId) {
            // Check if guest already has a ticket of this exact type
            const { data: existingTicket } = await supabaseAdmin
              .from('tickets')
              .select('id, ticket_type')
              .eq('user_id', userId)
              .eq('ticket_type', ticket_type)
              .maybeSingle();

            if (existingTicket) {
              return {
                name,
                phone,
                email,
                ticketType: ticket_type,
                status: 'SKIPPED',
                message: `Guest already has a ${ticket_type} pass`
              };
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
              return {
                name,
                phone,
                email,
                ticketType: ticket_type,
                status: 'ERROR',
                message: createError?.message || 'Failed to create user record'
              };
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
              is_banned: false,
              payment_method: 'Complimentary',
              collected_by: 'Super Admin'
            });

          if (ticketError) {
            return {
              name,
              phone,
              email,
              ticketType: ticket_type,
              status: 'ERROR',
              message: ticketError.message || 'Failed to insert ticket row'
            };
          }

          return {
            name,
            phone,
            email,
            ticketType: ticket_type,
            ticketId,
            qrToken,
            status: 'CREATED',
            message: 'Pass created successfully',
            linkUrl: `/?ticket=${qrToken}`
          };
        } catch (innerError: any) {
          return {
            name,
            phone,
            email,
            ticketType: ticket_type,
            status: 'ERROR',
            message: innerError?.message || 'Unexpected row error'
          };
        }
      });

      const chunkResults = await Promise.all(chunkPromises);
      for (const res of chunkResults) {
        results.push(res);
        if (res.status === 'CREATED') successCount++;
        else if (res.status === 'SKIPPED') skippedCount++;
        else if (res.status === 'ERROR') errorCount++;
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
