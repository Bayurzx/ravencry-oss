'use client'

import type { CaseScenario } from '@/evidence-desk/types'
import EvidenceDesk from '@/evidence-desk/EvidenceDesk'

export function EvidenceDeskLive({
  scenario,
  caseId,
  error,
}: {
  scenario: CaseScenario | null
  caseId: string
  error: string | null
}) {
  if (error) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          background: '#0a0a0a',
          color: '#fafafa',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          fontFamily: 'Arial, sans-serif',
          padding: 32,
        }}
      >
        <div
          style={{
            border: '1px solid #7f1d1d',
            background: '#2b1010',
            color: '#fecaca',
            borderRadius: 12,
            padding: 32,
            maxWidth: 500,
            textAlign: 'center',
          }}
        >
          <h2 style={{ margin: '0 0 8px', fontSize: 20 }}>Evidence unavailable</h2>
          <p style={{ margin: '0 0 16px', color: '#a3a3a3' }}>{error}</p>
          <p style={{ margin: 0, fontSize: 13, color: '#737373' }}>
            The evidence endpoint may be offline or the case ID ({caseId}) may not exist.
            The fixture-backed demo remains available at{' '}
            <a href="/evidence-desk" style={{ color: '#dc2626' }}>
              /evidence-desk
            </a>
            .
          </p>
        </div>
      </div>
    )
  }

  if (!scenario) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          background: '#0a0a0a',
          color: '#fafafa',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <p>Loading evidence…</p>
      </div>
    )
  }

  return <EvidenceDesk liveScenario={scenario} />
}
