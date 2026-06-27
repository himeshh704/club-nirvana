import { getUnsyncedCheckins, markCheckinsSynced } from './indexedDb';

/**
 * Pushes unsynced offline checkin logs from IndexedDB to the database via API.
 * Resolves local synced flags on successful responses.
 */
export async function syncOfflineScans(deviceName: string): Promise<{
  success: boolean;
  totalSynced: number;
  conflicts: number;
  error?: string;
}> {
  try {
    const unsynced = await getUnsyncedCheckins();
    if (unsynced.length === 0) {
      return { success: true, totalSynced: 0, conflicts: 0 };
    }

    console.log(`[Sync Engine] Pushing ${unsynced.length} unsynced scans to server...`);

    const response = await fetch('/api/tickets/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        checkins: unsynced,
        device: deviceName
      })
    });

    if (!response.ok) {
      throw new Error(`Sync request failed with status: ${response.status}`);
    }

    const result = await response.json();
    if (result.success && result.syncedIds && result.syncedIds.length > 0) {
      // Mark records in IndexedDB as synced
      await markCheckinsSynced(result.syncedIds);
      return {
        success: true,
        totalSynced: result.summary.successful,
        conflicts: result.summary.conflicts
      };
    }

    return { success: false, totalSynced: 0, conflicts: 0, error: 'Server returned failure sync state' };

  } catch (error: any) {
    console.error('[Sync Engine] Error syncing scans:', error);
    return {
      success: false,
      totalSynced: 0,
      conflicts: 0,
      error: error.message || 'Unknown network error'
    };
  }
}
