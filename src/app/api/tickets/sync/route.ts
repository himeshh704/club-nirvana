import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

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
    const body = await request.json();
    const { checkins, device } = body as { checkins: SyncCheckinItem[]; device: string };

    if (!checkins || !Array.isArray(checkins) || checkins.length === 0) {
      return NextResponse.json({ success: true, syncedIds: [], message: 'No records to sync' });
    }

    const deviceName = device || 'Offline Gate Terminal';
    const syncedIds: number[] = [];
    let conflictsResolved = 0;
    let successfulSyncs = 0;

    for (const item of checkins) {
      const { ticket_id, scanner_device, gate, timestamp, id } = item;

      // 1. Fetch current database state for this ticket
      const { data: ticket, error: fetchError } = await supabaseAdmin
        .from('tickets')
        .select('id, is_used, used_at, is_banned')
        .eq('id', ticket_id)
        .maybeSingle();

      if (fetchError || !ticket) {
        console.error(`Sync error: Ticket ${ticket_id} fetch failed or missing.`, fetchError);
        // Continue processing other tickets, skip this one to avoid blocking sync queue
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
          timestamp
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
          scanner_device,
          online_or_offline: 'offline',
          timestamp
        });
      } else {
        // Ticket is valid and unused. Perform standard check-in update.
        const { error: updateError } = await supabaseAdmin
          .from('tickets')
          .update({
            is_used: true,
            used_at: timestamp
          })
          .eq('id', ticket_id);

        if (updateError) {
          console.error(`Sync error updating ticket state for ${ticket_id}:`, updateError);
          continue;
        }

        // Log the check-in record
        await supabaseAdmin.from('checkins').insert({
          ticket_id,
          gate,
          scanner_device,
          online_or_offline: 'offline',
          timestamp
        });

        successfulSyncs++;
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
