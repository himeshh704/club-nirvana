import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyAdminRequest } from '@/lib/ticketValidation';

interface SyncCheckinItem {
  id: number; // Client-side IndexedDB local ID
  ticket_id: string;
  scanner_device: string;
  gate: string;
  online_or_offline: 'offline';
  timestamp: string;
}

export async function POST(request: Request) {
  try {
    const authError = verifyAdminRequest(request);
    if (authError) return authError;

    const body = await request.json();
    const { checkins, device } = body as { checkins: SyncCheckinItem[]; device: string };

    if (!checkins || !Array.isArray(checkins) || checkins.length === 0) {
      return NextResponse.json({ success: true, syncedIds: [], message: 'No records to sync' });
    }

    if (checkins.length > 500) {
      return NextResponse.json(
        { error: 'Maximum sync batch size is 500 check-ins per payload' },
        { status: 400 }
      );
    }

    const deviceName = device || 'Offline Gate Terminal';
    const syncedIds: number[] = [];
    let conflictsResolved = 0;
    let successfulSyncs = 0;

    for (const item of checkins) {
      const { ticket_id, scanner_device, gate, timestamp, id } = item;
      const validTimestamp = timestamp && !isNaN(Date.parse(timestamp)) ? timestamp : new Date().toISOString();

      // 1. Fetch current database state for this ticket
      const { data: ticket, error: fetchError } = await supabaseAdmin
        .from('tickets')
        .select('id, is_used, used_at, is_banned')
        .eq('id', ticket_id)
        .maybeSingle();

      if (fetchError || !ticket) {
        console.warn(`Sync warning: Ticket ${ticket_id} missing in DB during sync. Creating fallback ticket row to satisfy foreign keys.`);
        try {
          await supabaseAdmin.from('tickets').insert({
            id: ticket_id,
            user_id: null,
            ticket_type: 'VIP (Offline Synced)',
            qr_token: `OFFLINE_${ticket_id}`,
            is_used: true,
            used_at: validTimestamp,
            is_banned: false
          });

          await supabaseAdmin.from('checkins').insert({
            ticket_id,
            gate: gate || 'Offline Gate',
            scanner_device: scanner_device || deviceName,
            online_or_offline: 'offline',
            timestamp: validTimestamp
          });
          syncedIds.push(id);
          successfulSyncs++;
        } catch (fallbackErr) {
          console.error(`Sync failure for offline ticket ${ticket_id}:`, fallbackErr);
        }
        continue;
      }

      // If guest is banned, we log the check-in but don't mark as a standard valid check-in
      if (ticket.is_banned) {
        conflictsResolved++;
        // Log illegal check-in event
        await supabaseAdmin.from('checkins').insert({
          ticket_id,
          gate: gate || 'Denied Gate',
          scanner_device: scanner_device || deviceName,
          online_or_offline: 'offline',
          timestamp: validTimestamp
        });
        syncedIds.push(id);
        continue;
      }

      // 2. Resolve duplicates
      if (ticket.is_used) {
        // The ticket is already used in the database.
        // This is a duplicate checkin conflict!
        conflictsResolved++;
        console.warn(`Sync conflict: Ticket ${ticket_id} was already check-in. Logging duplicate check-in.`);

        // We insert this scan in the checkins table for audit trail
        await supabaseAdmin.from('checkins').insert({
          ticket_id,
          gate,
          scanner_device: scanner_device || deviceName,
          online_or_offline: 'offline',
          timestamp: validTimestamp
        });
      } else {
        // Ticket is valid and unused. Perform atomic check-in update (`eq('is_used', false)`).
        const { data: updatedRows, error: updateError } = await supabaseAdmin
          .from('tickets')
          .update({
            is_used: true,
            used_at: validTimestamp
          })
          .eq('id', ticket_id)
          .eq('is_used', false)
          .select('id');

        if (updateError) {
          console.error(`Sync error updating ticket state for ${ticket_id}:`, updateError);
          continue;
        } else if (!updatedRows || updatedRows.length === 0) {
          // Race condition occurred between our select and our update!
          conflictsResolved++;
          console.warn(`Sync conflict (race condition): Ticket ${ticket_id} marked used concurrently.`);
          await supabaseAdmin.from('checkins').insert({
            ticket_id,
            gate,
            scanner_device: scanner_device || deviceName,
            online_or_offline: 'offline',
            timestamp: validTimestamp
          });
        } else {
          // Log the successful check-in record
          await supabaseAdmin.from('checkins').insert({
            ticket_id,
            gate,
            scanner_device: scanner_device || deviceName,
            online_or_offline: 'offline',
            timestamp: validTimestamp
          });

          successfulSyncs++;
        }
      }

      syncedIds.push(id);
    }

    // Write a sync log
    await supabaseAdmin.from('sync_logs').insert({
      device: deviceName,
      status: conflictsResolved > 0 ? 'conflict_resolved' : 'success',
      records_synced: syncedIds.length
    });

    return NextResponse.json({
      success: true,
      syncedIds,
      summary: {
        total: checkins.length,
        successful: successfulSyncs,
        conflicts: conflictsResolved
      }
    });

  } catch (error) {
    console.error('Error in batch sync API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
