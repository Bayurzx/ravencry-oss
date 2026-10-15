import type { BriefFact, CaseScenario, EvidenceBrief } from './types'

const labelFor = (key: string) => ({
  subject: 'Identity',
  location: 'Location',
  time_window: 'Time window',
  vehicle: 'Vehicle',
  companion: 'Description / companion',
}[key] || key)

export function assembleBrief(scenario: CaseScenario): EvidenceBrief {
  const claims = new Map<string, Map<string, string[]>>()

  for (const item of scenario.evidence) {
    for (const claim of item.claims) {
      const values = claims.get(claim.key) || new Map<string, string[]>()
      const sources = values.get(claim.value) || []
      values.set(claim.value, [...sources, item.id])
      claims.set(claim.key, values)
    }
  }

  const allFacts: BriefFact[] = []
  const corroborations: BriefFact[] = []
  const contradictions: BriefFact[] = []

  for (const [key, values] of claims) {
    const entries = [...values.entries()]
    for (const [value, evidenceIds] of entries) {
      const fact = { label: labelFor(key), value, supportCount: evidenceIds.length, evidenceIds }
      allFacts.push(fact)
      if (evidenceIds.length > 1) corroborations.push(fact)
    }
    if (entries.length > 1 && key !== 'time_window') {
      for (const [value, evidenceIds] of entries) {
        contradictions.push({ label: `${labelFor(key)} conflict`, value, supportCount: evidenceIds.length, evidenceIds })
      }
    }
  }

  const readiness = contradictions.length
    ? 'verify_conflict'
    : scenario.evidence.length === 1
      ? 'insufficient_evidence'
      : 'needs_review'

  const recommendedSteps = readiness === 'verify_conflict'
    ? ['Call back the highest-confidence reporter.', 'Verify distinguishing details before expanding outreach.', 'Keep any public alert under human review.']
    : readiness === 'insufficient_evidence'
      ? ['Request the missing details through the original channel.', 'Do not publish a location-based alert yet.', 'Create a follow-up task for an operator.']
      : ['Ask a nearby responder to verify the described location.', 'Preserve the source links and timestamps for review.', 'Present the case to an operator before any broadcast.']

  return {
    facts: allFacts.sort((a, b) => b.supportCount - a.supportCount),
    corroborations,
    contradictions,
    unansweredQuestions: scenario.unansweredQuestions,
    recommendedSteps,
    readiness,
  }
}
