import type { EvidenceReadResponse } from '@/types'
import type { RavencryDeskInput } from '@/evidence-desk/adapters'
import { ravencryInputAdapter } from '@/evidence-desk/adapters'
import { EvidenceDeskLive } from './EvidenceDeskLive'

// RAVENCRY_API_URL — Docker: http://api:3003; local: http://localhost:3003
const API_BASE = process.env.RAVENCRY_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003'

async function getCaseEvidence(caseId: string): Promise<RavencryDeskInput> {
  const url = `${API_BASE}/api/ops/cases/${caseId}/evidence`
  const res = await fetch(url, { cache: 'no-store' })

  if (!res.ok) {
    if (res.status === 404) throw new Error(`Case ${caseId} not found.`)
    if (res.status === 400) throw new Error(`Invalid case ID: ${caseId}.`)
    throw new Error(`Evidence endpoint returned ${res.status}.`)
  }

  const data: EvidenceReadResponse = await res.json()

  return {
    case: data.case,
    evidence: data.evidence.map((item) => ({
      id: item.id,
      kind: item.kind,
      sourceName: item.source_name,
      capturedAt: item.captured_at,
      language: item.language,
      confidence: item.confidence,
      summary: item.summary,
      claims: item.claims.map((c) => ({
        key: c.key as 'subject' | 'location' | 'time_window' | 'vehicle' | 'companion',
        label: c.label,
        value: c.value,
      })),
    })),
    unansweredQuestions: data.unanswered_questions,
  }
}

export default async function CasePage({
  params,
}: {
  params: Promise<{ caseId: string }>
}) {
  const { caseId } = await params

  let errorMessage: string | null = null
  let scenario = null

  try {
    const input = await getCaseEvidence(caseId)
    scenario = ravencryInputAdapter.toScenario(input)
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : 'Failed to fetch evidence.'
  }

  return <EvidenceDeskLive scenario={scenario} caseId={caseId} error={errorMessage} />
}
