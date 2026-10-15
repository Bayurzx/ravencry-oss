'use client'

import { useMemo, useState, useCallback } from 'react'
import { assembleBrief } from './briefing'
import { fixtureEvidenceAdapter } from './adapters'
import type { CaseScenario, EvidenceKind } from './types'
import type { EvidenceBriefResponse } from '@/types'
import styles from './evidence-desk.module.css'

const scenarios = fixtureEvidenceAdapter.getScenarios()

const kindLabel: Record<EvidenceKind, string> = {
  citizen_report: 'Citizen report',
  sighting: 'Sighting',
  osint: 'OSINT signal',
}

const readinessCopy = {
  needs_review: ['Ready for human review', 'Two or more sources corroborate key claims.'],
  verify_conflict: ['Verify conflict first', 'Do not widen outreach until contradictions are resolved.'],
  insufficient_evidence: ['Request more information', 'One report is not enough to support an alert decision.'],
} as const

type BriefingState = 'idle' | 'loading' | 'ready' | 'error'

export default function EvidenceDesk({ liveScenario }: { liveScenario?: CaseScenario }) {
  const isLive = Boolean(liveScenario)
  const [scenarioId, setScenarioId] = useState(isLive ? liveScenario!.id : scenarios[0].id)
  const [generated, setGenerated] = useState(true)
  const [approved, setApproved] = useState(false)

  // Live GPT briefing state
  const [briefingState, setBriefingState] = useState<BriefingState>('idle')
  const [serverBrief, setServerBrief] = useState<EvidenceBriefResponse | null>(null)

  const scenario = isLive
    ? liveScenario!
    : (scenarios.find((item) => item.id === scenarioId) || scenarios[0])
  const brief = useMemo(() => assembleBrief(scenario), [scenario])
  const [headline, subhead] = readinessCopy[brief.readiness]

  function generate() {
    setApproved(false)
    setGenerated(false)
    window.setTimeout(() => setGenerated(true), 420)
  }

  function changeScenario(id: string) {
    setScenarioId(id)
    setApproved(false)
    setGenerated(true)
  }

  function resetToCorroborated() {
    setScenarioId(scenarios[0].id)
    setApproved(false)
    setGenerated(true)
  }

  const prepareBriefing = useCallback(async () => {
    setBriefingState('loading')
    setServerBrief(null)
    setApproved(false)
    try {
      const res = await fetch(
        `/api/evidence-desk/cases/${encodeURIComponent(scenario.caseId)}/brief`,
        { method: 'POST' },
      )
      if (!res.ok) {
        setBriefingState('error')
        return
      }
      const data: EvidenceBriefResponse = await res.json()
      setServerBrief(data)
      setBriefingState('ready')
    } catch {
      setBriefingState('error')
    }
  }, [scenario.caseId])

  // Source lookup helper
  const sourceMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const item of scenario.evidence) {
      map.set(item.id, item.sourceName)
    }
    return map
  }, [scenario.evidence])

  const ageLabel = scenario.age != null ? `· age ${scenario.age}` : '· age not reported'

  // Approval eligibility
  const fixtApprovalEnabled = brief.readiness === 'needs_review' && !approved
  const liveApprovalEnabled = isLive && serverBrief?.operator_decision === 'ready_for_human_review' && !approved
  const approvalEnabled = isLive ? liveApprovalEnabled : fixtApprovalEnabled

  const fixtApprovalLabel = approved
    ? 'Review recorded — escalation prepared'
    : brief.readiness === 'needs_review'
      ? 'Approve for existing alert workflow'
      : 'Approval unavailable until verified'
  const liveApprovalLabel = approved
    ? 'Review recorded — escalation prepared'
    : serverBrief?.operator_decision === 'ready_for_human_review'
      ? 'Approve for existing alert workflow'
      : 'Approval unavailable until verified'
  const approvalLabel = isLive ? liveApprovalLabel : fixtApprovalLabel

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>RAVENCRY / HUMAN-IN-THE-LOOP</p>
          <h1>Evidence Briefing Desk</h1>
          <p className={styles.subtitle}>A source-linked brief for responders—not an autonomous alert engine.</p>
        </div>
        <div className={isLive ? styles.liveBadge : styles.caseBadge}>
          {isLive ? 'RAVENCRY case-record mode' : <><span className={styles.pulse} /> {scenario.tier} · {scenario.caseId}</>}
        </div>
      </header>

      {!isLive && (
        <section className={styles.scenarios} aria-label="Demo scenarios">
          {scenarios.map((item) => (
            <button key={item.id} className={item.id === scenarioId ? styles.scenarioActive : styles.scenario} onClick={() => changeScenario(item.id)}>
              <strong>{item.title}</strong><span>{item.prompt}</span>
            </button>
          ))}
        </section>
      )}

      <section className={styles.overview}>
        <div>
          <p className={styles.eyebrow}>CASE SUBJECT</p>
          <h2>{scenario.subject} <span>{ageLabel}</span></h2>
        </div>
        <div className={styles.overviewActions}>
          {isLive ? (
            <button className={styles.generate} onClick={prepareBriefing} disabled={briefingState === 'loading'}>
              {briefingState === 'loading' ? 'Generating GPT briefing…' : 'Prepare server-side evidence briefing'}
            </button>
          ) : (
            <>
              <button className={styles.generate} onClick={generate}>{generated ? 'Regenerate evidence brief' : 'Assembling evidence…'}</button>
              <button className={styles.reset} onClick={resetToCorroborated}>Reset demo to corroborated case</button>
            </>
          )}
        </div>
      </section>

      {/* Live GPT briefing panel */}
      {isLive && briefingState !== 'idle' && (
        <section className={styles.gptPanel}>
          <div className={styles.panelTitle}><span>GPT</span><div><h3>GPT-assisted source briefing</h3><p>Generated from the source ledger. Human approval is still required.</p></div></div>

          {briefingState === 'loading' && (
            <div className={styles.briefLoading}>Generating briefing with GPT — this may take a few seconds…</div>
          )}

          {briefingState === 'error' && (
            <div className={styles.briefError}>
              <strong>Briefing unavailable.</strong>
              <p>No alert was sent; review the source ledger manually.</p>
            </div>
          )}

          {briefingState === 'ready' && serverBrief && (
            <div className={styles.briefContent}>
              <div className={styles.briefMeta}>
                <span>Model: {serverBrief.model}</span>
                <time>{new Date(serverBrief.generated_at).toLocaleString()}</time>
              </div>

              <h4>Summary</h4>
              <p>{serverBrief.operator_summary}</p>

              <h4>Corroborated facts</h4>
              <ul className={styles.briefFacts}>
                {serverBrief.corroborated_facts.map((fact, i) => (
                  <li key={i}>
                    <span>{fact.statement}</span>
                    <span className={styles.sourceChips}>
                      {fact.source_ids.map((id) => (
                        <span key={id} className={styles.sourceChip}>{sourceMap.get(id) || 'Unknown source'}</span>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>

              <h4>Conflicts</h4>
              {serverBrief.conflicts.length ? (
                <ul className={styles.briefConflicts}>
                  {serverBrief.conflicts.map((conflict, i) => (
                    <li key={i}>
                      <strong>{conflict.topic}:</strong>{' '}
                      {conflict.values.join(' vs ')}
                      <span className={styles.sourceChips}>
                        {conflict.source_ids.map((id) => (
                          <span key={id} className={styles.sourceChip}>{sourceMap.get(id) || 'Unknown source'}</span>
                        ))}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : <p className={styles.empty}>No conflicts detected.</p>}

              <h4>Unanswered questions</h4>
              <ul className={styles.questions}>
                {serverBrief.unanswered_questions.map((q) => <li key={q}>{q}</li>)}
              </ul>

              <h4>Recommended verification steps</h4>
              <ul className={styles.questions}>
                {serverBrief.recommended_verification_steps.map((step) => <li key={step}>{step}</li>)}
              </ul>

              <div className={`${styles.decision} ${serverBrief.operator_decision === 'ready_for_human_review' ? styles.decisionReady : styles.decisionHold}`}>
                <strong>{serverBrief.operator_decision === 'ready_for_human_review' ? 'Ready for human review' : 'Hold for more evidence'}</strong>
                <p>{serverBrief.decision_reason}</p>
              </div>

              <p className={styles.safetyNote}>Human approval is still required. This desk did not send an alert.</p>
            </div>
          )}
        </section>
      )}

      {generated ? <div className={styles.grid}>
        <section className={styles.panel}>
          <div className={styles.panelTitle}><span>01</span><div><h3>Evidence timeline</h3><p>Every claim remains traceable to an input.</p></div></div>
          <div className={styles.timeline}>
            {scenario.evidence.map((item) => <article key={item.id} className={styles.event}>
              <div className={styles.eventTop}><span className={`${styles.kind} ${styles[item.kind]}`}>{kindLabel[item.kind]}</span><time>{new Date(item.capturedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} WAT</time></div>
              <strong>{item.sourceName} <small>{item.language} · {Math.round(item.confidence * 100)}% confidence</small></strong>
              <p>{item.summary}</p>
              <div className={styles.claims}>{item.claims.map((claim) => <span key={`${item.id}-${claim.key}-${claim.value}`}>{claim.label}: {claim.value}</span>)}</div>
            </article>)}
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelTitle}><span>02</span><div><h3>Decision brief</h3><p>Facts, uncertainty, and next steps are separate.</p></div></div>
          <div className={`${styles.readiness} ${styles[brief.readiness]}`}><strong>{headline}</strong><p>{subhead}</p></div>
          <h4>Supported facts</h4>
          <ul className={styles.facts}>{brief.facts.slice(0, 5).map((fact) => <li key={`${fact.label}-${fact.value}`}><span>{fact.label}</span><strong>{fact.value}</strong><em>{fact.supportCount} source{fact.supportCount === 1 ? '' : 's'}</em></li>)}</ul>
          <h4>Corroborations</h4>
          {brief.corroborations.length ? <ul className={styles.compact}>{brief.corroborations.map((item) => <li key={`${item.label}-${item.value}`}>{item.label}: <strong>{item.value}</strong></li>)}</ul> : <p className={styles.empty}>No independent claim is corroborated yet.</p>}
          <h4>Contradictions</h4>
          {brief.contradictions.length ? <ul className={styles.conflicts}>{brief.contradictions.map((item) => <li key={`${item.label}-${item.value}`}>{item.value}</li>)}</ul> : <p className={styles.empty}>No contradictory claims detected in this fixture.</p>}
          <h4>Questions before escalation</h4>
          <ul className={styles.questions}>{brief.unansweredQuestions.map((question) => <li key={question}>{question}</li>)}</ul>
        </section>

        <aside className={styles.actionPanel}>
          <p className={styles.eyebrow}>OPERATOR GATE</p>
          <h3>Public alerts stay human-controlled.</h3>
          <p>These recommendations never trigger a broadcast by themselves.</p>
          <ol>{brief.recommendedSteps.map((step) => <li key={step}>{step}</li>)}</ol>
          <button className={styles.approve} disabled={!approvalEnabled} onClick={() => setApproved(true)}>
            {approvalLabel}
          </button>
          <p className={styles.disclaimer}>{approved ? 'No alert was sent by this desk. The existing approved workflow is the next, separate step.' : 'This screen is a decision aid. It never publishes or broadcasts automatically.'}</p>
        </aside>
      </div> : <div className={styles.loading}>Weaving the source ledger into a reviewable brief…</div>}
    </main>
  )
}
