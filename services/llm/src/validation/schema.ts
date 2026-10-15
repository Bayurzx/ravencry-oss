/**
 * RAVENCRY LLM Output Validation
 *
 * Post-LLM guard: validates the structure of QW-01 extraction output
 * before passing it downstream. LLMs are probabilistic — this catches
 * missing fields, wrong types, and out-of-range values.
 */

import type { ExtractionResult } from '../providers/base';

const VALID_GENDERS = new Set(['male', 'female', 'unknown']);
const VALID_CIRCUMSTANCES = new Set(['abduction', 'missing', 'witnessed_kidnapping', 'unknown']);
const VALID_LANGUAGES = new Set(['english', 'hausa', 'yoruba', 'igbo', 'pidgin', 'mixed']);
const VALID_AGE_UNITS = new Set(['years', 'months']);

export interface ValidationError {
  field: string;
  issue: string;
}

/**
 * Validates that a parsed LLM output conforms to the ExtractionResult schema.
 * Returns an array of errors — empty array means valid.
 * This is NOT strict: missing optional fields are logged but not treated as errors.
 * Only malformed required fields (wrong types, invalid enums) are flagged.
 */
export function validateExtractionOutput(
  parsed: Record<string, unknown>,
): ValidationError[] {
  const errors: ValidationError[] = [];

  // --- Required fields (must be present with correct type) ---
  const requiredStringOrNull = ['person_name', 'last_seen_location', 'last_seen_lga', 'last_seen_state'];
  for (const field of requiredStringOrNull) {
    const val = parsed[field];
    if (val !== null && val !== undefined && typeof val !== 'string') {
      errors.push({ field, issue: `expected string|null, got ${typeof val}` });
    }
  }

  // gender enum
  if (parsed.gender !== undefined && !VALID_GENDERS.has(parsed.gender as string)) {
    errors.push({ field: 'gender', issue: `invalid value "${parsed.gender}"` });
  }

  // circumstance enum
  if (parsed.circumstance !== undefined && !VALID_CIRCUMSTANCES.has(parsed.circumstance as string)) {
    errors.push({ field: 'circumstance', issue: `invalid value "${parsed.circumstance}"` });
  }

  // language_detected enum
  if (parsed.language_detected !== undefined && !VALID_LANGUAGES.has(parsed.language_detected as string)) {
    errors.push({ field: 'language_detected', issue: `invalid value "${parsed.language_detected}"` });
  }

  // age_estimate: number or null
  if (parsed.age_estimate !== null && parsed.age_estimate !== undefined && typeof parsed.age_estimate !== 'number') {
    errors.push({ field: 'age_estimate', issue: `expected number|null, got ${typeof parsed.age_estimate}` });
  }

  // age_unit enum (if present)
  const ageUnit = parsed.age_unit;
  if (ageUnit !== null && ageUnit !== undefined && !VALID_AGE_UNITS.has(ageUnit as string)) {
    errors.push({ field: 'age_unit', issue: `invalid value "${ageUnit}"` });
  }

  // confidence: number 0-1
  if (parsed.confidence !== undefined) {
    if (typeof parsed.confidence !== 'number') {
      errors.push({ field: 'confidence', issue: `expected number, got ${typeof parsed.confidence}` });
    } else if (parsed.confidence < 0 || parsed.confidence > 1) {
      errors.push({ field: 'confidence', issue: `out of range: ${parsed.confidence}` });
    }
  }

  // num_victims: number, default 1
  if (parsed.num_victims !== undefined && typeof parsed.num_victims !== 'number') {
    errors.push({ field: 'num_victims', issue: `expected number, got ${typeof parsed.num_victims}` });
  }

  // weapons_mentioned: array of strings
  if (parsed.weapons_mentioned !== undefined) {
    if (!Array.isArray(parsed.weapons_mentioned)) {
      errors.push({ field: 'weapons_mentioned', issue: `expected array, got ${typeof parsed.weapons_mentioned}` });
    }
  }

  // missing_critical_fields: array of strings
  if (parsed.missing_critical_fields !== undefined) {
    if (!Array.isArray(parsed.missing_critical_fields)) {
      errors.push({ field: 'missing_critical_fields', issue: `expected array, got ${typeof parsed.missing_critical_fields}` });
    }
  }

  return errors;
}

// ============================================================================
// QW-02 Classification output validation
// ============================================================================

const VALID_TIERS = new Set(['FLASH', 'PRIORITY', 'ROUTINE']);
const VALID_ACTIONS = new Set(['immediate_broadcast', 'operator_review', 'log_only']);

export function validateClassifyOutput(
  parsed: Record<string, unknown>,
): ValidationError[] {
  const errors: ValidationError[] = [];

  // tier: required FLASH|PRIORITY|ROUTINE
  if (parsed.tier !== undefined && !VALID_TIERS.has(parsed.tier as string)) {
    errors.push({ field: 'tier', issue: `invalid value "${parsed.tier}"` });
  }

  // reasoning: should be a non-empty string
  if (parsed.reasoning !== undefined && (typeof parsed.reasoning !== 'string' || (parsed.reasoning as string).length === 0)) {
    errors.push({ field: 'reasoning', issue: `expected non-empty string` });
  }

  // is_child, is_hotspot: boolean
  if (parsed.is_child !== undefined && typeof parsed.is_child !== 'boolean') {
    errors.push({ field: 'is_child', issue: `expected boolean, got ${typeof parsed.is_child}` });
  }
  if (parsed.is_hotspot !== undefined && typeof parsed.is_hotspot !== 'boolean') {
    errors.push({ field: 'is_hotspot', issue: `expected boolean, got ${typeof parsed.is_hotspot}` });
  }

  // escalating_factors, de_escalating_factors: string arrays
  for (const f of ['escalating_factors', 'de_escalating_factors']) {
    if (parsed[f] !== undefined && !Array.isArray(parsed[f])) {
      errors.push({ field: f, issue: `expected array, got ${typeof parsed[f]}` });
    }
  }

  // recommended_action: immediate_broadcast|operator_review|log_only
  if (parsed.recommended_action !== undefined && !VALID_ACTIONS.has(parsed.recommended_action as string)) {
    errors.push({ field: 'recommended_action', issue: `invalid value "${parsed.recommended_action}"` });
  }

  // confidence: number 0-1
  if (parsed.confidence !== undefined) {
    if (typeof parsed.confidence !== 'number') {
      errors.push({ field: 'confidence', issue: `expected number, got ${typeof parsed.confidence}` });
    } else if (parsed.confidence < 0 || parsed.confidence > 1) {
      errors.push({ field: 'confidence', issue: `out of range: ${parsed.confidence}` });
    }
  }

  return errors;
}

// ============================================================================
// QW-03 OSINT classification output validation
// ============================================================================

const VALID_OSINT_TIERS = new Set(['FLASH', 'PRIORITY', 'ROUTINE', 'IGNORE']);

export function validateOSINTOutput(
  parsed: Record<string, unknown>,
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (parsed.actionable !== undefined && typeof parsed.actionable !== 'boolean') {
    errors.push({ field: 'actionable', issue: `expected boolean, got ${typeof parsed.actionable}` });
  }

  if (parsed.tier !== undefined && !VALID_OSINT_TIERS.has(parsed.tier as string)) {
    errors.push({ field: 'tier', issue: `invalid value "${parsed.tier}"` });
  }

  if (parsed.create_draft_case !== undefined && typeof parsed.create_draft_case !== 'boolean') {
    errors.push({ field: 'create_draft_case', issue: `expected boolean, got ${typeof parsed.create_draft_case}` });
  }

  return errors;
}

// ============================================================================
// QW-04 Anti-fake output validation
// ============================================================================

const VALID_ANTIFAKE_VERDICTS = new Set(['legitimate', 'suspicious', 'hold_for_review', 'likely_fake']);

export function validateAntiFakeOutput(
  parsed: Record<string, unknown>,
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (parsed.verdict !== undefined && !VALID_ANTIFAKE_VERDICTS.has(parsed.verdict as string)) {
    errors.push({ field: 'verdict', issue: `invalid value "${parsed.verdict}"` });
  }

  if (parsed.authenticity_score !== undefined) {
    if (typeof parsed.authenticity_score !== 'number') {
      errors.push({ field: 'authenticity_score', issue: `expected number, got ${typeof parsed.authenticity_score}` });
    } else if (parsed.authenticity_score < 0 || parsed.authenticity_score > 1) {
      errors.push({ field: 'authenticity_score', issue: `out of range: ${parsed.authenticity_score}` });
    }
  }

  for (const f of ['red_flags', 'green_flags']) {
    if (parsed[f] !== undefined && !Array.isArray(parsed[f])) {
      errors.push({ field: f, issue: `expected array, got ${typeof parsed[f]}` });
    }
  }

  return errors;
}
