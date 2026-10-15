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
