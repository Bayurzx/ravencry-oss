'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Step1What from '@/components/Step1What'
import Step2Who from '@/components/Step2Who'
import Step3Where from '@/components/Step3Where'
import Step4Confirm from '@/components/Step4Confirm'
import CaseIdBadge from '@/components/CaseIdBadge'
import { useOfflineQueue } from '@/hooks/useOfflineQueue'
import type { CreateReportRequest, Gender, ReportFormData } from '@/types'

const TOTAL_STEPS = 4

const initialData: ReportFormData = {
  reportType: 'missing',
  person_name: '',
  description: '',
  last_seen_location: '',
  anonymous: false,
}

type Outcome =
  | { kind: 'none' }
  | { kind: 'success'; caseId: string }
  | { kind: 'queued' }

export default function ReportWizard() {
  const { t } = useTranslation()
  const { submitReport, isPending } = useOfflineQueue()
  const [step, setStep] = useState(1)
  const [data, setData] = useState<ReportFormData>(initialData)
  const [showErrors, setShowErrors] = useState(false)
  const [outcome, setOutcome] = useState<Outcome>({ kind: 'none' })
  const [submitError, setSubmitError] = useState<string | null>(null)

  const update = (patch: Partial<ReportFormData>) =>
    setData((d) => ({ ...d, ...patch }))

  const canProceed = (): boolean => {
    if (step === 2) return data.person_name.trim().length > 0
    if (step === 3) return data.last_seen_location.trim().length > 0
    return true
  }

  const next = () => {
    if (!canProceed()) {
      setShowErrors(true)
      return
    }
    setShowErrors(false)
    setStep((s) => Math.min(TOTAL_STEPS, s + 1))
  }

  const back = () => {
    setShowErrors(false)
    setStep((s) => Math.max(1, s - 1))
  }

  const handleSubmit = async (anonymous: boolean) => {
    setSubmitError(null)
    const payload: CreateReportRequest = {
      channel: 'pwa',
      person_name: data.person_name.trim(),
      age: data.age,
      gender: data.gender as Gender | undefined,
      last_seen_location: data.last_seen_location.trim(),
      last_seen_time: data.last_seen_time
        ? new Date(data.last_seen_time).toISOString()
        : undefined,
      description:
        [data.description, data.extra].filter(Boolean).join(' — ') || undefined,
      reporter_phone: anonymous ? undefined : data.reporter_phone || undefined,
    }
    try {
      const res = await submitReport(payload)
      if (res.queued) setOutcome({ kind: 'queued' })
      else if (res.case_id) setOutcome({ kind: 'success', caseId: res.case_id })
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t('error_generic'))
    }
  }

  // --- Outcome screens ---
  if (outcome.kind === 'success') {
    return (
      <div className="flex flex-col items-center gap-4 py-10 text-center">
        <span className="text-5xl" aria-hidden>
          ✅
        </span>
        <h2 className="text-xl font-bold text-foreground">
          {t('report_success')}
        </h2>
        <CaseIdBadge caseId={outcome.caseId} />
        <button
          type="button"
          onClick={() =>
            navigator.share?.({
              title: 'RAVENCRY case',
              text: `Case ${outcome.caseId}`,
            })
          }
          className="min-h-[44px] rounded-md border border-border px-6 font-semibold text-foreground"
        >
          {t('share_case_id')}
        </button>
        <Link href="/" className="font-semibold text-routine">
          ← {t('back_to_alerts')}
        </Link>
      </div>
    )
  }

  if (outcome.kind === 'queued') {
    return (
      <div className="flex flex-col items-center gap-4 py-10 text-center">
        <span className="text-5xl" aria-hidden>
          ☁️
        </span>
        <h2 className="text-xl font-bold text-foreground">
          {t('report_queued')}
        </h2>
        <CaseIdBadge caseId="Pending..." showCopyButton={false} />
        <Link href="/" className="font-semibold text-routine">
          ← {t('back_to_alerts')}
        </Link>
      </div>
    )
  }

  return (
    <div>
      {/* Progress bar */}
      <div className="mb-4">
        <div className="mb-2 flex gap-1">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => {
            const n = i + 1
            const state =
              n < step ? 'bg-success' : n === step ? 'bg-flash' : 'bg-border'
            return <div key={n} className={`h-1.5 flex-1 rounded-full ${state}`} />
          })}
        </div>
        <p className="text-xs text-muted">
          Step {step} of {TOTAL_STEPS}
        </p>
      </div>

      {step === 1 && (
        <Step1What
          value={data.reportType}
          onChange={(reportType) => update({ reportType })}
        />
      )}
      {step === 2 && (
        <Step2Who data={data} update={update} showErrors={showErrors} />
      )}
      {step === 3 && (
        <Step3Where data={data} update={update} showErrors={showErrors} />
      )}
      {step === 4 && (
        <Step4Confirm
          data={data}
          update={update}
          onSubmit={handleSubmit}
          isPending={isPending}
        />
      )}

      {submitError && (
        <p className="mt-3 text-sm text-flash">{submitError}</p>
      )}

      {/* Navigation */}
      <div className="mt-6 flex gap-3">
        {step > 1 && (
          <button
            type="button"
            onClick={back}
            className="min-h-[48px] flex-1 rounded-lg border border-border font-semibold text-foreground"
          >
            ← Back
          </button>
        )}
        {step < TOTAL_STEPS && (
          <button
            type="button"
            onClick={next}
            className="min-h-[48px] flex-1 rounded-lg bg-primary font-semibold text-primary-foreground"
          >
            Next →
          </button>
        )}
      </div>
    </div>
  )
}
