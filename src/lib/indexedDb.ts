import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface OfflineTicket {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  ticket_type: string;
  qr_token: string;
  is_used: boolean;
  used_at: string | null;
  is_banned: boolean;
}

export interface OfflineCheckin {
  id?: number;
  ticket_id: string;
  scanner_device: string;
  gate: string;
  online_or_offline: 'online' | 'offline';
  timestamp: string;
  synced: boolean;
}

interface EventScannerDB extends DBSchema {
  tickets: {
    key: string; // qr_token
    value: OfflineTicket;
    indexes: { 'by-id': string };
  };
  checkins: {
    key: number;
    value: OfflineCheckin;
    indexes: { 'by-synced': number };
  };
}

const DB_NAME = 'event_scanner_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<EventScannerDB>> | null = null;

export function getDB() {
  if (typeof window === 'undefined') return null;
  if (!dbPromise) {
    dbPromise = openDB<EventScannerDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Tickets store (lookup by token)
        const ticketStore = db.createObjectStore('tickets', { keyPath: 'qr_token' });
        ticketStore.createIndex('by-id', 'id');

        // Checkins store (auto-incrementing ID)
        const checkinStore = db.createObjectStore('checkins', { keyPath: 'id', autoIncrement: true });
        checkinStore.createIndex('by-synced', 'synced' as any); // IndexedDB custom boolean representation (we'll store 0 or 1, or just query manually)
      },
    });
  }
  return dbPromise;
}

/**
 * Saves a list of valid tickets to IndexedDB for offline scanning.
 * Clears old tickets.
 */
export async function saveTicketsOffline(tickets: OfflineTicket[]): Promise<void> {
  const db = await getDB();
  if (!db) return;

  const tx = db.transaction(['tickets'], 'readwrite');
  const store = tx.objectStore('tickets');

  await store.clear();
  for (const ticket of tickets) {
    await store.put(ticket);
  }
  await tx.done;
}

/**
 * Gets the number of tickets cached locally.
 */
export async function getCachedTicketsCount(): Promise<number> {
  const db = await getDB();
  if (!db) return 0;
  return db.count('tickets');
}

/**
 * Retrieves an offline ticket by its signed QR token.
 */
export async function getOfflineTicketByToken(qrToken: string): Promise<OfflineTicket | undefined> {
  const db = await getDB();
  if (!db) return undefined;
  return db.get('tickets', qrToken);
}

/**
 * Logs a checkin in IndexedDB.
 * Updates the ticket's local used state in the tickets store to prevent duplicate entry offline.
 */
export async function logOfflineCheckin(
  ticketId: string,
  qrToken: string,
  gate: string,
  scannerDevice: string
): Promise<{ status: 'success' | 'already_used' | 'banned' | 'not_found' }> {
  const db = await getDB();
  if (!db) return { status: 'not_found' };

  // Fetch ticket to update local status
  const ticket = await db.get('tickets', qrToken);
  if (!ticket) {
    return { status: 'not_found' };
  }

  if (ticket.is_banned) {
    return { status: 'banned' };
  }

  if (ticket.is_used) {
    return { status: 'already_used' };
  }

  // Update ticket as used locally
  ticket.is_used = true;
  ticket.used_at = new Date().toISOString();

  const tx = db.transaction(['tickets', 'checkins'], 'readwrite');
  await tx.objectStore('tickets').put(ticket);

  // Add offline check-in log
  const newCheckin: OfflineCheckin = {
    ticket_id: ticketId,
    scanner_device: scannerDevice,
    gate: gate,
    online_or_offline: 'offline',
    timestamp: new Date().toISOString(),
    synced: false
  };

  await tx.objectStore('checkins').add(newCheckin);
  await tx.done;

  return { status: 'success' };
}

/**
 * Retrieves all unsynced local checkin records.
 */
export async function getUnsyncedCheckins(): Promise<OfflineCheckin[]> {
  const db = await getDB();
  if (!db) return [];

  const checkins = await db.getAll('checkins');
  return checkins.filter(c => !c.synced);
}

/**
 * Marks a list of local check-ins as synced.
 */
export async function markCheckinsSynced(ids: number[]): Promise<void> {
  const db = await getDB();
  if (!db) return;

  const tx = db.transaction(['checkins'], 'readwrite');
  const store = tx.objectStore('checkins');

  for (const id of ids) {
    const record = await store.get(id);
    if (record) {
      record.synced = true;
      await store.put(record);
    }
  }
  await tx.done;
}

/**
 * Clears all cached tickets and checkins.
 */
export async function clearLocalData(): Promise<void> {
  const db = await getDB();
  if (!db) return;

  const tx = db.transaction(['tickets', 'checkins'], 'readwrite');
  await tx.objectStore('tickets').clear();
  await tx.objectStore('checkins').clear();
  await tx.done;
}
