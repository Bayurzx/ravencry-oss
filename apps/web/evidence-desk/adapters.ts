import { scenarios } from './fixtures'
import type { CaseDetailResponse } from '../types'
import type { CaseScenario, Claim, EvidenceKind } from './types'

/**
 * Stable input boundary for the existing RAVENCRY pipeline. The Desk does not
 * fetch from an API itself; a server-side or authenticated caller supplies
 * already-authorized case evidence through this contract.
 */
export type RavencryEvidenceInput = {
  id: string
  kind: 'report' | 'sighting' | 'osint'
  sourceName: string
  capturedAt: string
  language: string
  confidence: number
  summary: string
  claims: Claim[]
}

export type RavencryDeskInput = {
  case: CaseDetailResponse
  evidence: RavencryEvidenceInput[]
  unansweredQuestions: string[]
}

export interface EvidenceDeskAdapter<TInput> {
  toScenario(input: TInput): CaseScenario
}

const inputKindToEvidenceKind: Record<RavencryEvidenceInput['kind'], EvidenceKind> = {
  report: 'citizen_report',
  sighting: 'sighting',
  osint: 'osint',
}

/**
 * Maps an authorized RAVENCRY evidence ledger into a CaseScenario.
 * The endpoint already includes the case report as the first evidence item,
 * so this adapter maps the complete source ledger without fabricating a duplicate.
 */
export const ravencryInputAdapter: EvidenceDeskAdapter<RavencryDeskInput> = {
  toScenario(input) {
    return {
      id: `ravencry-${input.case.case_id}`,
      caseId: input.case.case_id,
      subject: input.case.person_name,
      age: input.case.age_estimate,
      tier: input.case.alert_tier === 'PRIORITY' ? 'PRIORITY' : 'FLASH',
      title: 'RAVENCRY evidence brief',
      prompt: 'Mapped from an authorized RAVENCRY case input; no live fetch occurs here.',
      unansweredQuestions: input.unansweredQuestions,
      evidence: input.evidence.map((item) => ({ ...item, kind: inputKindToEvidenceKind[item.kind] })),
    }
  },
}

/** The deterministic provider remains the default Build Week demo source. */
export const fixtureEvidenceAdapter = {
  getScenarios: (): readonly CaseScenario[] => scenarios,
  getDefaultScenario: (): CaseScenario => scenarios[0],
}
