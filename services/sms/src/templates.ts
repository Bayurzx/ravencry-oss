/**
 * RAVENCRY SMS Alert Templates
 *
 * Formats FLASH and PRIORITY alert messages for SMS delivery.
 * SMS messages are constrained to 160 characters (single SMS) when possible,
 * with multi-part SMS fallback for FLASH alerts (up to 918 chars = 6 segments).
 *
 * Africa's Talking concatenates long messages automatically; we optimize
 * for readability within the per-segment budget (~153 chars/segment for multi-part).
 */

// ---- Types ---------------------------------------------------------------

export interface AlertCase {
  case_id: string;
  person_name: string;
  age_estimate?: number | null;
  gender?: string;
  last_seen_location?: string | null;
  last_seen_lga?: string | null;
  last_seen_state?: string | null;
  last_seen_time?: string | null;
  circumstance?: string;
  description?: string | null;
  alert_tier: 'FLASH' | 'PRIORITY' | 'ROUTINE';
}

// ---- SMS Character Limits ------------------------------------------------

const MAX_SINGLE_SMS = 160;       // Single SMS: 160 chars (GSM-7)
const MAX_MULTI_SEGMENT = 153;    // Per-segment for concatenated SMS (UDH header takes 7 bytes)

// ---- Format Functions -----------------------------------------------------

/**
 * Format a FLASH alert for SMS broadcast.
 *
 * Designed for maximum information density within ~2-3 SMS segments.
 * Includes: tier marker, name, age, location, time, and reporting CTA.
 */
export function formatFlashAlert(c: AlertCase): string {
  const ageStr = c.age_estimate ? `, Age ${c.age_estimate}` : '';
  const genderStr = c.gender ? ` ${c.gender}` : '';
  const locStr = c.last_seen_location || c.last_seen_lga || '';
  const stateStr = c.last_seen_state ? `, ${c.last_seen_state}` : '';
  const timeStr = c.last_seen_time ? ` ${c.last_seen_time}` : '';

  return [
    'FLASH ALERT:',
    `${c.person_name}${ageStr}${genderStr} missing.`,
    `Last seen: ${locStr}${stateStr}${timeStr}.`,
    c.description ? `${c.description.slice(0, 60)}` : '',
    'Report info: dial *384*72836# or send /report on Telegram.',
  ]
    .filter(Boolean)
    .join(' ');
}

/**
 * Format a PRIORITY alert for SMS broadcast.
 *
 * Single segment (≤160 chars). Concise — name, location, and CTA only.
 */
export function formatPriorityAlert(c: AlertCase): string {
  const ageStr = c.age_estimate ? ` (${c.age_estimate})` : '';
  const locStr = c.last_seen_location || c.last_seen_lga || '';
  const stateStr = c.last_seen_state ? `, ${c.last_seen_state}` : '';

  return [
    `PRIORITY: ${c.person_name}${ageStr} missing near ${locStr}${stateStr}.`,
    'Have info? Call 112 or *384*72836#.',
  ].join(' ');
}

/**
 * Get the appropriate SMS template for a given tier.
 */
export function formatAlert(c: AlertCase): string {
  switch (c.alert_tier) {
    case 'FLASH':
      return formatFlashAlert(c);
    case 'PRIORITY':
      return formatPriorityAlert(c);
    default:
      return formatPriorityAlert(c);
  }
}
