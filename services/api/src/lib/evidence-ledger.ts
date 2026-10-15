// =============================================================================
// RAVENCRY API — Evidence Ledger Builder
// Aggregates case + person + sightings into a redacted source ledger.
// Used by GET /api/ops/cases/:id/evidence and the GPT briefing route.
// =============================================================================

import type {
  CaseDetailResponse,
  EvidenceReadResponse,
} from '../../../../packages/shared/src/types';
import { query } from '../db/pool';
import { notFound } from '../middleware/errorHandler';

export const EVIDENCE_CASE_ID_PATTERN = /^NR-\d{4}-\d{6}$/;

export async function buildEvidenceLedger(
  caseId: string,
): Promise<EvidenceReadResponse> {
  // Fetch case + person
  const caseResult = await query<
    CaseDetailResponse & {
      input_channel: string;
      language: string;
      qwen_confidence: number | null;
    }
  >(
    `SELECT
      c.id AS case_id,
      p.full_name AS person_name,
      p.age_estimate,
      p.gender::text,
      c.last_seen_location,
      c.last_seen_time,
      p.photo_s3_key AS photo_url,
      c.status::text,
      c.alert_tier::text,
      c.circumstance::text,
      (SELECT COUNT(*) FROM sightings s WHERE s.case_id = c.id)::int AS sightings_count,
      c.created_at::text,
      c.input_channel,
      c.language,
      c.qwen_confidence
    FROM cases c
    JOIN persons p ON c.person_id = p.id
    WHERE c.id = $1`,
    [caseId],
  );

  if (caseResult.rowCount === 0) {
    throw notFound('case', caseId);
  }

  const caseRow = caseResult.rows[0];

  // Fetch sightings
  const sightingsResult = await query<{
    id: string;
    description: string;
    sighting_location: string | null;
    sighting_time: string | null;
    input_channel: string;
    trust_score: number | null;
    created_at: string;
  }>(
    `SELECT id, description, sighting_location, sighting_time,
            input_channel, trust_score, created_at
     FROM sightings
     WHERE case_id = $1
     ORDER BY created_at ASC`,
    [caseId],
  );

  const sightings = sightingsResult.rows;

  // Map case to evidence item (report)
  const caseEvidence = {
    id: `${caseId}-case-report`,
    kind: 'report' as const,
    source_name: `${(caseRow.input_channel || 'unknown').charAt(0).toUpperCase() + (caseRow.input_channel || 'unknown').slice(1)} intake`,
    captured_at: caseRow.created_at,
    language: caseRow.language || 'en',
    confidence: caseRow.qwen_confidence ?? 0.85,
    summary: `${caseRow.input_channel?.toUpperCase() || 'Case'} intake for ${caseRow.person_name}`,
    claims: [
      {
        key: 'subject',
        label: 'Person',
        value: `${caseRow.person_name}${caseRow.age_estimate == null ? '' : `, age ${caseRow.age_estimate}`}`,
      },
      ...(caseRow.last_seen_location
        ? [{ key: 'location' as const, label: 'Last known area', value: caseRow.last_seen_location }]
        : []),
      ...(caseRow.last_seen_time
        ? [{ key: 'time_window' as const, label: 'Last known time', value: `${caseRow.last_seen_time} WAT` }]
        : []),
    ],
  };

  // Map sightings to evidence items — preserve OSINT provenance
  const sightingItems = sightings.map((s) => {
    const isOsint = s.input_channel === 'osint';
    return {
      id: s.id,
      kind: (isOsint ? 'osint' : 'sighting') as 'osint' | 'sighting',
      source_name: isOsint ? 'OSINT signal' : `${s.input_channel} witness`,
      captured_at: s.created_at,
      language: 'en',
      confidence: s.trust_score ?? 0.65,
      summary: s.description,
      claims: [
        {
          key: 'subject' as const,
          label: 'Person',
          value: caseRow.person_name,
        },
        ...(s.sighting_location
          ? [{ key: 'location' as const, label: 'Sighting area', value: s.sighting_location }]
          : []),
        ...(s.sighting_time
          ? [{ key: 'time_window' as const, label: 'Sighting time', value: `${s.sighting_time} WAT` }]
          : []),
      ],
    };
  });

  const evidence = [caseEvidence, ...sightingItems];

  // Deterministic unanswered questions
  const unansweredQuestions: string[] = [];
  if (sightings.length === 0) {
    unansweredQuestions.push(
      'Can a family member confirm identifying details?',
      'Request a callback from the original reporter.',
    );
  }
  const distinctLocations = new Set(
    sightings.filter((s) => s.sighting_location).map((s) => s.sighting_location),
  );
  if (distinctLocations.size > 1) {
    unansweredQuestions.push(
      'Two or more sighting locations do not match — verify with the most recent witness.',
    );
  }
  const lastSeenTime = caseRow.last_seen_time
    ? new Date(caseRow.last_seen_time).getTime()
    : null;
  if (lastSeenTime && Date.now() - lastSeenTime > 24 * 60 * 60 * 1000) {
    unansweredQuestions.push(
      'The last confirmed sighting is over 24 hours old — prioritize a fresh welfare check.',
    );
  }
  unansweredQuestions.push('Present the brief to an operator before any broadcast.');

  return {
    case: {
      case_id: caseRow.case_id,
      person_name: caseRow.person_name,
      age_estimate: caseRow.age_estimate,
      gender: caseRow.gender,
      last_seen_location: caseRow.last_seen_location,
      last_seen_time: caseRow.last_seen_time,
      photo_url: caseRow.photo_url,
      status: caseRow.status,
      alert_tier: caseRow.alert_tier,
      circumstance: caseRow.circumstance,
      sightings_count: caseRow.sightings_count,
      created_at: caseRow.created_at,
    },
    evidence,
    unanswered_questions: unansweredQuestions,
  };
}
