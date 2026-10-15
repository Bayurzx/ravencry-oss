export type EvidenceKind = 'citizen_report' | 'sighting' | 'osint'

export type Claim = {
  key: 'subject' | 'location' | 'time_window' | 'vehicle' | 'companion'
  label: string
  value: string
}

export type EvidenceItem = {
  id: string
  kind: EvidenceKind
  sourceName: string
  capturedAt: string
  language: string
  confidence: number
  summary: string
  claims: Claim[]
}

export type CaseScenario = {
  id: string
  caseId: string
  subject: string
  age: number | null
  tier: 'FLASH' | 'PRIORITY'
  title: string
  prompt: string
  unansweredQuestions: string[]
  evidence: EvidenceItem[]
}

export type BriefFact = {
  label: string
  value: string
  supportCount: number
  evidenceIds: string[]
}

export type EvidenceBrief = {
  facts: BriefFact[]
  corroborations: BriefFact[]
  contradictions: BriefFact[]
  unansweredQuestions: string[]
  recommendedSteps: string[]
  readiness: 'needs_review' | 'verify_conflict' | 'insufficient_evidence'
}
