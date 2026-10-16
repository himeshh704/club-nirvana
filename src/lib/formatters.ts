/**
 * Utility functions for ticketing formatting and category sanitization.
 */

/**
 * Strips prices, currency symbols, and cover credit amounts from ticket category strings.
 * Ensures no price is displayed on guest pass, in QR codes, or in WhatsApp share messages.
 * 
 * Examples:
 *   "2-Day Phase 1 - Solo (₹699)" -> "2-Day Phase 1 - Solo"
 *   "2-Day Phase 1 - Couple (₹999/-)" -> "2-Day Phase 1 - Couple"
 *   "Small Table (₹7,999 | ₹2,500 Cover | 4-6 Guests) [Table 1 - 6 Guests]" 
 *     -> "Small Table (4-6 Guests) [Table 1 - 6 Guests]"
 *   "VIP Pass ₹1500" -> "VIP Pass"
 */
export function cleanPassCategory(category?: string | null): string {
  if (!category) return 'Official Pass';
  return category
    // Remove (₹7,999 | ₹2,500 Cover | 4-6 Guests) -> (4-6 Guests)
    .replace(/\(\s*₹[\d,]+(?:\s*\/\s*-)?(?:\s*\|\s*₹[\d,]+(?:\s*Cover)?)*(?:\s*\|\s*([^)]+))?\)/gi, (_, extra) => extra ? `(${extra.trim()})` : '')
    // Remove standard price in parens: (₹699), (₹699/-), (Rs. 699), (Rs 699), ($699)
    .replace(/\s*\(\s*(?:₹|rs\.?|inr|\$)?\s*[\d,]+(?:\s*\/\s*-)?\s*\)/gi, '')
    // Remove standalone currency + amount: ₹699, ₹699/-, Rs. 699
    .replace(/\s*(?:₹|rs\.?|inr)\s*[\d,]+(?:\s*\/\s*-)?/gi, '')
    // Clean up any double spaces or dangling hyphens/pipes
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+-\s*$/, '')
    .trim();
}

/**
 * Extracts the exact guest / member headcount from a ticket category or payload count.
 * Handles groups (e.g. 6 guests, 8 guests), couples (2), or single admissions (1).
 */
export function getTicketGuestCount(ticketType?: string | null, payloadCount?: number): number {
  if (typeof payloadCount === 'number' && payloadCount > 0) {
    return payloadCount;
  }
  if (!ticketType) return 1;

  // 1. TOP PRIORITY: Look for explicit customized group reservation in brackets: [Group / Table - 10 Guests]
  const bracketMatch = ticketType.match(/\[[^\]]*?-\s*(\d+)\s*(?:Guests?|Members?|Pax|Persons?)[^\]]*?\]/i);
  if (bracketMatch && bracketMatch[1]) {
    const parsed = parseInt(bracketMatch[1], 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }

  // 2. Look for explicit count in parens or format like (10 Guests) or - 10 Pax
  const match = ticketType.match(/(?:\[[^\].]*?-\s*|\(|\b)(\d+)\s*(?:Guests?|Members?|Pax|Persons?)/i);
  if (match && match[1]) {
    const parsed = parseInt(match[1], 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }

  // 3. Look for Couple passes
  if (ticketType.toLowerCase().includes('couple')) {
    return 2;
  }

  // Default single admission
  return 1;
}

/**
 * Returns structured group details including guest count, group/table name, and whether it's a group pass.
 */
export function getGroupDetails(ticketType?: string | null, payloadCount?: number, payloadTable?: string): {
  isGroup: boolean;
  count: number;
  groupName?: string;
  label: string;
} {
  const count = getTicketGuestCount(ticketType, payloadCount);
  const isGroup = count > 1 || (!!ticketType && /group|table|vip lounge/i.test(ticketType));

  let groupName = payloadTable?.trim() || undefined;
  if (!groupName && ticketType) {
    const groupMatch = ticketType.match(/\[(.*?)\s*-\s*\d+\s*(?:Guests?|Members?|Pax)/i);
    if (groupMatch && groupMatch[1]) {
      groupName = groupMatch[1].trim();
    }
  }

  const label = count > 1
    ? (ticketType?.toLowerCase().includes('couple') ? 'Couple Pass (2 Guests)' : `Group Pass (${count} Members)`)
    : 'Single Pass (1 Guest)';

  return { isGroup, count, groupName, label };
}
