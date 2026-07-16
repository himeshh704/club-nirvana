import { NextResponse } from 'next/server';

/**
 * Validates whether an incoming request to a privileged ticketing API route
 * includes the valid Admin API secret header (x-admin-key), or if running in local development mode without a configured secret.
 */
export function verifyAdminRequest(request: Request): NextResponse | null {
  const adminSecret = process.env.ADMIN_API_SECRET || process.env.NEXT_PUBLIC_ADMIN_API_SECRET;
  
  // If no secret is defined and we are in local dev, log a warning but allow for development
  if (!adminSecret && process.env.NODE_ENV !== 'production') {
    return null;
  }

  // If secret is defined (or in production where it must be checked), verify header
  const headerKey = request.headers.get('x-admin-key');
  if (adminSecret && headerKey === adminSecret) {
    return null;
  }

  // If no match or missing in production without header
  if (process.env.NODE_ENV === 'production' && (!headerKey || headerKey !== adminSecret)) {
    return NextResponse.json(
      { error: 'Unauthorized: Valid admin API header (x-admin-key) required for this action.' },
      { status: 401 }
    );
  }

  return null;
}

/**
 * Extracts a normalized VIP table reservation string from ticket_type or explicit tableNumber.
 * Example: "[Table 1 - VIP Lounge]" -> "Table 1 - VIP Lounge"
 */
export function extractVIPTableName(ticketType: string | undefined, tableNumber?: string): string | null {
  if (tableNumber && tableNumber.trim()) {
    const trimmed = tableNumber.trim();
    return trimmed.toLowerCase().includes('table') ? trimmed : `Table ${trimmed}`;
  }

  if (!ticketType) return null;
  const bracketMatch = ticketType.match(/\[(Table\s*[^-\]]+)[\s-]/i);
  if (bracketMatch && bracketMatch[1]) {
    return bracketMatch[1].trim();
  }

  if (ticketType.toLowerCase().includes('table')) {
    return ticketType.trim();
  }

  return null;
}

/**
 * Checks whether a VIP table is already reserved and signed.
 * Uses .limit(1) to avoid PGRST116 multiple-row query errors.
 */
export async function checkTableReservationConflict(
  supabaseAdmin: any,
  tableName: string
): Promise<{ conflict: boolean; assignedHost?: string }> {
  try {
    const { data: existingTableTickets, error } = await supabaseAdmin
      .from('tickets')
      .select('id, ticket_type, users(name, phone)')
      .ilike('ticket_type', `%${tableName}%`)
      .limit(1);

    if (error) {
      console.warn(`Table check warning for "${tableName}":`, error.message);
      return { conflict: false };
    }

    if (existingTableTickets && existingTableTickets.length > 0) {
      const assignedHost = (existingTableTickets[0] as any)?.users?.name || 'an existing VIP Host';
      return { conflict: true, assignedHost };
    }

    return { conflict: false };
  } catch (err: any) {
    console.warn(`Exception checking table reservation conflict for "${tableName}":`, err.message);
    return { conflict: false };
  }
}
