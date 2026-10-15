/**
 * RAVENCRY USSD Service — State Machine Handler
 *
 * Africa's Talking USSD works via text accumulation:
 *   - Each user response is appended to `text` separated by `*`
 *   - Empty text = initial dial (root menu)
 *   - "1" = selected option 1
 *   - "1*Amina" = option 1 then entered "Amina"
 *   - "1*Amina*8*Kano*today 2pm" = complete report flow
 *
 * We parse `text.split('*')` to determine depth and branch.
 * No DynamoDB needed for menu state — AT handles it natively.
 * DynamoDB is only used for rate limiting (3 reports/phone/24h).
 */

import { createHash } from 'crypto';

import {
  ROOT_MENU,
  REPORT_NAME_PROMPT,
  REPORT_AGE_PROMPT,
  REPORT_LGA_PROMPT,
  REPORT_WHEN_PROMPT,
  REPORT_RATE_LIMITED,
  REPORT_INVALID_AGE,
  SIGHTING_CASE_ID_PROMPT,
  SIGHTING_LOCATION_PROMPT,
  SIGHTING_CASE_NOT_FOUND,
  ALERT_LGA_PROMPT,
  ALERT_NONE_ACTIVE,
  SUBSCRIBE_MENU,
  SUBSCRIBE_LGA_PROMPT,
  UNSUBSCRIBE_SUCCESS,
  INVALID_OPTION,
  SERVICE_ERROR,
  reportSuccess,
  sightingSuccess,
  formatAlertForUSSD,
  subscribeSuccess,
} from './menus';

import {
  createCase,
  caseExists,
  createSighting,
  getLatestAlertByLGA,
  upsertSubscriber,
  removeSubscriber,
} from './db';

import {
  checkRateLimit,
  incrementReportCount,
} from './session';

// ── Types ───────────────────────────────────────────────────────────────────

export interface USSDRequest {
  sessionId: string;
  serviceCode: string;
  phoneNumber: string;
  text: string;
  networkCode?: string;
}

// ── Phone Hashing ───────────────────────────────────────────────────────────

/**
 * SHA-256 hash of phone number for privacy-safe storage.
 * Matches the pattern used in cases.reporter_phone.
 */
export function hashPhone(phone: string): string {
  return createHash('sha256').update(phone.trim()).digest('hex');
}

// ── Main Handler ────────────────────────────────────────────────────────────

/**
 * Process a USSD request and return the response string.
 * Response is prefixed with CON (continue) or END (terminate).
 */
export async function handleUSSD(req: USSDRequest): Promise<string> {
  const { text, phoneNumber } = req;

  // Parse accumulated text into steps
  const steps = text.split('*').filter(Boolean);

  try {
    // Root menu (no input yet)
    if (steps.length === 0) {
      return ROOT_MENU;
    }

    const branch = steps[0];

    switch (branch) {
      case '1':
        return await handleReport(steps, phoneNumber);
      case '2':
        return await handleSighting(steps, phoneNumber);
      case '3':
        return await handleAlertLookup(steps);
      case '4':
        return await handleSubscription(steps, phoneNumber);
      default:
        return INVALID_OPTION;
    }
  } catch (err) {
    console.error(
      `[ussd] Handler error for session ${req.sessionId}:`,
      err instanceof Error ? err.message : err,
    );
    return SERVICE_ERROR;
  }
}

// ── Branch 1: Report Missing Person ─────────────────────────────────────────

async function handleReport(steps: string[], phoneNumber: string): Promise<string> {
  const depth = steps.length;

  // Step 1: Ask for name
  if (depth === 1) {
    // Check rate limit before starting report flow
    const phoneHash = hashPhone(phoneNumber);
    const rateLimit = await checkRateLimit(phoneHash);
    if (!rateLimit.allowed) {
      return REPORT_RATE_LIMITED;
    }
    return REPORT_NAME_PROMPT;
  }

  // Step 2: Got name, ask for age
  if (depth === 2) {
    return REPORT_AGE_PROMPT;
  }

  // Step 3: Got age, validate and ask for LGA
  if (depth === 3) {
    const ageInput = steps[2].trim();
    const age = parseInt(ageInput, 10);
    if (isNaN(age) || age < 0 || age > 120) {
      // Invalid age — but AT already accumulated it.
      // We can't go back in USSD, so we accept it and move on.
      // The age will be stored as null in the database.
    }
    return REPORT_LGA_PROMPT;
  }

  // Step 4: Got LGA, ask for when
  if (depth === 4) {
    return REPORT_WHEN_PROMPT;
  }

  // Step 5: Got all fields — create the case
  if (depth === 5) {
    const name = steps[1].trim();
    const ageInput = steps[2].trim();
    const lga = steps[3].trim();
    const when = steps[4].trim();

    // Parse age (nullable)
    const age = parseInt(ageInput, 10);
    const validAge = (!isNaN(age) && age >= 0 && age <= 120) ? age : null;

    // Validate minimum fields
    if (!name) {
      return SERVICE_ERROR;
    }

    const phoneHash = hashPhone(phoneNumber);

    // Re-check rate limit (in case of race condition)
    const rateLimit = await checkRateLimit(phoneHash);
    if (!rateLimit.allowed) {
      return REPORT_RATE_LIMITED;
    }

    // Create the case in Aurora
    const caseId = await createCase({
      name,
      age: validAge,
      lastSeenLGA: lga,
      lastSeenWhen: when,
      phoneHash,
    });

    // Increment rate limit counter
    await incrementReportCount(phoneHash);

    console.log(
      `[ussd] Case created: ${caseId} by ${phoneNumber.substring(0, 7)}***`,
    );

    return reportSuccess(caseId);
  }

  // Beyond expected depth
  return SERVICE_ERROR;
}

// ── Branch 2: Report Sighting ───────────────────────────────────────────────

async function handleSighting(steps: string[], phoneNumber: string): Promise<string> {
  const depth = steps.length;

  // Step 1: Ask for case ID
  if (depth === 1) {
    return SIGHTING_CASE_ID_PROMPT;
  }

  // Step 2: Got case ID, ask for location
  if (depth === 2) {
    const caseId = steps[1].trim().toUpperCase();
    // Validate case ID exists before asking for location
    const exists = await caseExists(caseId);
    if (!exists) {
      return SIGHTING_CASE_NOT_FOUND;
    }
    return SIGHTING_LOCATION_PROMPT;
  }

  // Step 3: Got location — create sighting
  if (depth === 3) {
    const caseId = steps[1].trim().toUpperCase();
    const location = steps[2].trim();
    const phoneHash = hashPhone(phoneNumber);

    await createSighting({
      caseId,
      location,
      phoneHash,
    });

    console.log(
      `[ussd] Sighting recorded for ${caseId} by ${phoneNumber.substring(0, 7)}***`,
    );

    return sightingSuccess();
  }

  return SERVICE_ERROR;
}

// ── Branch 3: Latest Alert in Area ──────────────────────────────────────────

async function handleAlertLookup(steps: string[]): Promise<string> {
  const depth = steps.length;

  // Step 1: Ask for LGA
  if (depth === 1) {
    return ALERT_LGA_PROMPT;
  }

  // Step 2: Got LGA — look up latest alert
  if (depth === 2) {
    const lga = steps[1].trim();
    const alert = await getLatestAlertByLGA(lga);

    if (!alert) {
      return ALERT_NONE_ACTIVE;
    }

    return formatAlertForUSSD(alert);
  }

  return SERVICE_ERROR;
}

// ── Branch 4: Subscribe / Unsubscribe ───────────────────────────────────────

async function handleSubscription(steps: string[], phoneNumber: string): Promise<string> {
  const depth = steps.length;

  // Step 1: Show subscribe/unsubscribe options
  if (depth === 1) {
    return SUBSCRIBE_MENU;
  }

  const subChoice = steps[1];

  // Subscribe flow
  if (subChoice === '1') {
    // Step 2: Ask for LGA
    if (depth === 2) {
      return SUBSCRIBE_LGA_PROMPT;
    }

    // Step 3: Got LGA — subscribe
    if (depth === 3) {
      const lga = steps[2].trim();
      const phoneHash = hashPhone(phoneNumber);

      await upsertSubscriber(phoneHash, lga);

      console.log(
        `[ussd] Subscriber added for ${lga} by ${phoneNumber.substring(0, 7)}***`,
      );

      return subscribeSuccess(lga);
    }
  }

  // Unsubscribe flow
  if (subChoice === '2') {
    const phoneHash = hashPhone(phoneNumber);
    await removeSubscriber(phoneHash);

    console.log(
      `[ussd] Subscriber removed: ${phoneNumber.substring(0, 7)}***`,
    );

    return UNSUBSCRIBE_SUCCESS;
  }

  return INVALID_OPTION;
}
