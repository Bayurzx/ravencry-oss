/**
 * RAVENCRY USSD Service — Menu Text Constants & Formatters
 *
 * All user-facing text for the USSD menu tree.
 * USSD display limit: ~182 characters per screen.
 * Prefix: CON (continue session) or END (terminate session).
 */

// ── Root Menu ───────────────────────────────────────────────────────────────

export const ROOT_MENU =
  'CON Welcome to RAVENCRY 🇳🇬\n' +
  'Report & find missing persons\n\n' +
  '1. Report missing person\n' +
  '2. I saw a missing person\n' +
  '3. Latest alert in my area\n' +
  '4. Subscribe / Unsubscribe';

// ── Branch 1: Report Missing Person ─────────────────────────────────────────

export const REPORT_NAME_PROMPT =
  'CON Enter the name of the missing person:';

export const REPORT_AGE_PROMPT =
  'CON Enter their age (number):';

export const REPORT_LGA_PROMPT =
  'CON Where were they last seen?\n(Enter LGA or area name):';

export const REPORT_WHEN_PROMPT =
  'CON When were they last seen?\n(e.g. today 2pm, yesterday):';

export function reportSuccess(caseId: string): string {
  return (
    `END Report received.\n` +
    `Case ID: ${caseId}\n` +
    `Share this ID with police.\n` +
    `RAVENCRY will alert your area.\n` +
    `Thank you.`
  );
}

export const REPORT_RATE_LIMITED =
  'END You have reached the maximum reports for today.\n' +
  'For urgent cases, call 112.';

export const REPORT_INVALID_AGE =
  'CON Please enter a valid age (number between 0-120):';

// ── Branch 2: Sighting ──────────────────────────────────────────────────────

export const SIGHTING_CASE_ID_PROMPT =
  'CON Enter the Case ID from the alert\n(e.g. NR-2026-000001):';

export const SIGHTING_LOCATION_PROMPT =
  'CON Where did you see them?\n(Enter location or area):';

export function sightingSuccess(): string {
  return (
    'END Sighting recorded.\n' +
    'Thank you for helping.\n' +
    'Investigators will follow up.'
  );
}

export const SIGHTING_CASE_NOT_FOUND =
  'END Case ID not found.\n' +
  'Please check the ID and try again.\n' +
  'Dial *384*72836# to retry.';

// ── Branch 3: Latest Alert ──────────────────────────────────────────────────

export const ALERT_LGA_PROMPT =
  'CON Enter your LGA or area name:';

/**
 * Format an active alert for USSD display.
 * Truncated to fit USSD screen (~182 chars).
 */
export function formatAlertForUSSD(alert: {
  case_id: string;
  full_name: string;
  age_estimate?: number | null;
  last_seen_lga?: string | null;
  alert_tier?: string | null;
  last_seen_time?: string | null;
}): string {
  const parts: string[] = [];

  // Tier badge
  const tier = alert.alert_tier === 'FLASH' ? '🚨 FLASH' : '⚠️ ALERT';
  parts.push(tier);

  // Name + age
  let nameAge = alert.full_name;
  if (alert.age_estimate) {
    nameAge += `, age ${alert.age_estimate}`;
  }
  parts.push(nameAge);

  // Location
  if (alert.last_seen_lga) {
    parts.push(`Last seen: ${alert.last_seen_lga}`);
  }

  // Case ID for sighting
  parts.push(`Case: ${alert.case_id}`);
  parts.push('Dial *384*72836# > 2 to report sighting');

  const body = parts.join('\n');

  // Truncate if needed (END prefix = 4 chars)
  if (body.length > 178) {
    return 'END ' + body.substring(0, 175) + '...';
  }
  return 'END ' + body;
}

export const ALERT_NONE_ACTIVE =
  'END No active alerts in your area.\n' +
  'Dial *384*72836# > 4 to subscribe\n' +
  'and receive future alerts.';

// ── Branch 4: Subscribe / Unsubscribe ───────────────────────────────────────

export const SUBSCRIBE_MENU =
  'CON 1. Subscribe to alerts\n' +
  '2. Unsubscribe from alerts';

export const SUBSCRIBE_LGA_PROMPT =
  'CON Enter your LGA to receive\nalerts for missing persons:';

export function subscribeSuccess(lga: string): string {
  return (
    `END Subscribed to ${lga} alerts.\n` +
    `You will receive SMS when someone\n` +
    `goes missing in your area.`
  );
}

export const UNSUBSCRIBE_SUCCESS =
  'END Unsubscribed.\n' +
  'You will no longer receive alerts.\n' +
  'Dial *384*72836# > 4 > 1 to re-subscribe.';

// ── Error / Fallback ────────────────────────────────────────────────────────

export const INVALID_OPTION =
  'CON Invalid option. Please try again:\n\n' +
  '1. Report missing person\n' +
  '2. I saw a missing person\n' +
  '3. Latest alert in my area\n' +
  '4. Subscribe / Unsubscribe';

export const SERVICE_ERROR =
  'END Service temporarily unavailable.\n' +
  'Please try again or call 112\n' +
  'for emergencies.';
