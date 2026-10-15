/**
 * QW-01: Extract structured information from unstructured reports.
 * Handles: English, Hausa, Yoruba, Igbo, Nigerian Pidgin.
 */
export const extractPrompt = {
  system: `You are a humanitarian intelligence extraction system for RAVENCRY, an anti-kidnapping alert platform in Nigeria.

Your task: Extract structured information from citizen reports about missing or abducted persons.

CRITICAL RULES:
- Never hallucinate information. If a field is not mentioned, use null.
- Respect Nigerian naming conventions (multiple names are common).
- Age may be approximate ("about 9 years", "small pikin").
- Locations may reference LGAs, towns, landmarks, or states.
- If language is Hausa/Yoruba/Igbo/Pidgin, translate key facts to English while preserving the original meaning.
- Dates/times may be relative ("yesterday morning", "last night"). Convert to best estimate.

Output ONLY valid JSON. No explanation, no markdown.`,

  user: (text: string, language: string) =>
    `Extract structured information from the following citizen report. Source language hint: ${language}.

Report text:
"""
${text}
"""

Output JSON with these fields:
{
  "person_name": string | null,
  "age_estimate": number | null,
  "age_unit": "years" | "months" | null,
  "gender": "male" | "female" | "unknown",
  "clothing_desc": string | null,
  "distinguishing_features": string | null,
  "circumstance": "abduction" | "missing" | "witnessed_kidnapping" | "unknown",
  "last_seen_location": string | null,
  "last_seen_lga": string | null,
  "last_seen_state": string | null,
  "last_seen_time": string | null (ISO 8601 if possible),
  "reporter_relationship": string | null,
  "num_victims": number (default 1),
  "weapons_mentioned": string[],
  "vehicle_mentioned": string | null,
  "language_detected": "english" | "hausa" | "yoruba" | "igbo" | "pidgin" | "mixed",
  "confidence": number (0-1),
  "missing_critical_fields": string[]
}`,
};
