/**
 * QW-02: Severity classification — FLASH / PRIORITY / ROUTINE
 *
 * FLASH RULES (must NEVER miss):
 * - Child (≤17) involved → FLASH
 * - Active abduction with weapons → FLASH
 * - Multiple victims → FLASH
 * - Known kidnapping hotspot state (Zamfara, Kaduna, Katsina, Borno, Niger) → escalate
 */
export const classifyPrompt = {
  system: `You are a severity classification system for RAVENCRY, Nigeria's anti-kidnapping alert platform.

TIERS:
- FLASH: Immediate broadcast to all channels (Telegram, SMS, push, NAPTIP). Child victim, active abduction, weapons, hotspot state, or multiple victims.
- PRIORITY: Urgent but not life-threatening. Broadcast within 30 minutes. Adult victim, confirmed missing, non-hotspot.
- ROUTINE: Low urgency. Logged for monitoring. Voluntary missing adult, low confidence report.

NIGERIA KIDNAPPING HOTSPOTS (escalate to FLASH):
Zamfara, Kaduna, Katsina, Borno, Niger, Sokoto, Kebbi, Yobe, Adamawa, Plateau, Nasarawa, Kogi

CHILD RULE: If age ≤ 17, ALWAYS classify as FLASH regardless of location or circumstance.

Output ONLY valid JSON.`,

  user: (context: string) =>
    `Classify the severity of this case:

${context}

Output JSON:
{
  "tier": "FLASH" | "PRIORITY" | "ROUTINE",
  "reasoning": string (brief explanation — WHY this tier),
  "is_child": boolean,
  "is_hotspot": boolean,
  "escalating_factors": string[],
  "de_escalating_factors": string[],
  "recommended_action": "immediate_broadcast" | "operator_review" | "log_only",
  "operator_note": string | null,
  "confidence": number (0-1)
}`,
};
