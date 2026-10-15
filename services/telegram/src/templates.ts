/**
 * RAVENCRY Telegram Alert Templates
 *
 * Formats FLASH and PRIORITY alert messages for Telegram channels.
 * Uses MarkdownV2 parse mode for bold, italic, and link formatting.
 * Falls back to plain text if MarkdownV2 fails (Telegram parse errors).
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
  clothing_desc?: string | null;
  photo_url?: string | null;
  alert_tier: 'FLASH' | 'PRIORITY' | 'ROUTINE';
}

// ---- Emoji & Labels ------------------------------------------------------

const TIER_EMOJI: Record<string, string> = {
  FLASH: '🔴',
  PRIORITY: '🟠',
  ROUTINE: '🟢',
};

const TIER_LABEL: Record<string, string> = {
  FLASH: '🚨 FLASH ALERT',
  PRIORITY: '⚠️ PRIORITY ALERT',
  ROUTINE: 'ℹ️ ROUTINE',
};

// ---- MarkdownV2 Escaping --------------------------------------------------

/**
 * Escape Telegram MarkdownV2 special characters.
 * Characters to escape: _ * [ ] ( ) ~ ` > # + - = | { } . !
 */
export function escapeMarkdownV2(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}

// ---- Format Functions -----------------------------------------------------

/**
 * Format a FLASH alert caption (MarkdownV2).
 * Used with sendPhoto to the public alert channel.
 */
export function formatFlashAlert(c: AlertCase): string {
  const e = escapeMarkdownV2;

  const lines = [
    `${TIER_EMOJI.FLASH} *${e(TIER_LABEL.FLASH)}* ${TIER_EMOJI.FLASH}`,
    '',
    `*Missing Person:* ${e(c.person_name)}`,
    c.age_estimate ? `*Age:* ${e(String(c.age_estimate))}` : null,
    c.gender ? `*Gender:* ${e(c.gender)}` : null,
    '',
    c.last_seen_location
      ? `*Last Seen:* ${e(c.last_seen_location)}`
      : c.last_seen_lga
        ? `*LGA:* ${e(c.last_seen_lga)}${c.last_seen_state ? `, ${e(c.last_seen_state)}` : ''}`
        : null,
    c.last_seen_time ? `*When:* ${e(c.last_seen_time)}` : null,
    '',
    c.clothing_desc ? `*Clothing:* ${e(c.clothing_desc)}` : null,
    c.description ? `*Details:* ${e(c.description)}` : null,
    '',
    '_If you have any information, please report immediately._',
    '',
    `📞 *Report:* Send /report or dial \\*384*72836#`,
    `👁️ *Sighting:* Send /sighting`,
    `🔍 *Case ID:* \`${c.case_id}\``,
  ];

  return lines.filter(Boolean).join('\n');
}

/**
 * Format a FLASH alert as plain text (fallback if MarkdownV2 fails).
 */
export function formatFlashAlertPlain(c: AlertCase): string {
  const lines = [
    `🔴🚨 FLASH ALERT 🔴`,
    '',
    `Missing Person: ${c.person_name}`,
    c.age_estimate ? `Age: ${c.age_estimate}` : null,
    c.gender ? `Gender: ${c.gender}` : null,
    '',
    c.last_seen_location
      ? `Last Seen: ${c.last_seen_location}`
      : c.last_seen_lga
        ? `LGA: ${c.last_seen_lga}${c.last_seen_state ? `, ${c.last_seen_state}` : ''}`
        : null,
    c.last_seen_time ? `When: ${c.last_seen_time}` : null,
    '',
    c.clothing_desc ? `Clothing: ${c.clothing_desc}` : null,
    c.description ? `Details: ${c.description}` : null,
    '',
    'If you have any information, please report immediately.',
    '',
    `Report: send /report or dial *384*72836#`,
    `Sighting: send /sighting`,
    `Case ID: ${c.case_id}`,
  ];

  return lines.filter(Boolean).join('\n');
}

/**
 * Format a PRIORITY alert caption (MarkdownV2).
 */
export function formatPriorityAlert(c: AlertCase): string {
  const e = escapeMarkdownV2;

  const lines = [
    `${TIER_EMOJI.PRIORITY} *${e(TIER_LABEL.PRIORITY)}*`,
    '',
    `*Missing Person:* ${e(c.person_name)}`,
    c.age_estimate ? `*Age:* ${e(String(c.age_estimate))}` : null,
    '',
    c.last_seen_location
      ? `*Last Seen:* ${e(c.last_seen_location)}`
      : c.last_seen_lga
        ? `*LGA:* ${e(c.last_seen_lga)}`
        : null,
    c.last_seen_time ? `*When:* ${e(c.last_seen_time)}` : null,
    '',
    `🔍 *Case ID:* \`${c.case_id}\`,`,
  ];

  return lines.filter(Boolean).join('\n');
}

/**
 * Format an OPS notification (sent to private ops channel).
 */
export function formatOpsNotification(c: AlertCase, event: string): string {
  const e = escapeMarkdownV2;

  return [
    `🛠️ *OPS Notification*`,
    `*Event:* ${e(event)}`,
    `*Case ID:* \`${c.case_id}\`,`,
    `*Person:* ${e(c.person_name)}`,
    `*Tier:* ${e(c.alert_tier)}`,
    `*Time:* ${e(new Date().toISOString())}`,
  ].join('\n');
}
