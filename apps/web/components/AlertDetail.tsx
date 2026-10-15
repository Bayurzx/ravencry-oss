'use client'

import { useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import useSWR from 'swr'
import { useTranslation } from 'react-i18next'
import { getCaseDetail } from '@/lib/api'
import { relativeTime, formatAge } from '@/lib/format'
import { EMERGENCY_NUMBER } from '@/lib/constants'
import AlertBadge from '@/components/AlertBadge'
import CaseIdBadge from '@/components/CaseIdBadge'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorState } from '@/components/ErrorState'
import { SightingForm } from '@/components/SightingForm'

const AlertMap = dynamic(() => import('@/components/AlertMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-muted/10">
      <LoadingSpinner className="h-5 w-5" />
    </div>
  ),
})

export function AlertDetail({ caseId }: { caseId: string }) {
  const { t } = useTranslation()
  const [showSighting, setShowSighting] = useState(false)
  const { data, error, isLoading, mutate } = useSWR(
    ['case', caseId],
    () => getCaseDetail(caseId),
    { revalidateOnFocus: false },
  )

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner className="h-6 w-6" />
      </div>
    )
  }

  if (error || !data) {
    return <ErrorState message={t('alert_not_found')} onRetry={() => mutate()} />
  }

  const found = data.status === 'resolved'

  return (
    <div className="space-y-5">
      {found && (
        <div
          className="rounded-md border border-found bg-found/10 px-4 py-3 text-sm font-semibold text-found"
          role="status"
        >
          ✓ {t('person_found')}
        </div>
      )}

      <div className="flex items-start gap-4">
        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-md border border-border bg-muted/20">
          {data.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.photo_url || '/placeholder.svg'}
              alt={`Photo of ${data.person_name}`}
              className="h-full w-full object-cover"
              crossOrigin="anonymous"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-3xl text-muted">
              👤
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          {data.alert_tier && <AlertBadge tier={data.alert_tier} />}
          <h1 className="mt-1 truncate text-2xl font-bold text-foreground">
            {data.person_name}
          </h1>
          <p className="text-sm text-muted">
            {formatAge(data.age_estimate)}
            {data.gender && data.gender !== 'unknown' ? ` · ${data.gender}` : ''}
          </p>
        </div>
      </div>

      <CaseIdBadge caseId={data.case_id} />

      <dl className="space-y-3 rounded-md border border-border bg-card p-4 text-sm">
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted">
            {t('last_seen')}
          </dt>
          <dd className="text-foreground">
            {data.last_seen_location || '—'}
            {data.last_seen_time
              ? ` · ${relativeTime(data.last_seen_time)}`
              : ''}
          </dd>
        </div>
        {data.created_at && (
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted">
              {t('active_since')}
            </dt>
            <dd className="text-foreground">{relativeTime(data.created_at)}</dd>
          </div>
        )}
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted">
            {t('case_status')}
          </dt>
          <dd className="capitalize text-foreground">
            {data.status.replace(/_/g, ' ')}
          </dd>
        </div>
      </dl>

      {data.last_seen_coords && (
        <div className="h-56 overflow-hidden rounded-md border border-border">
          <AlertMap
            lat={data.last_seen_coords.lat}
            lng={data.last_seen_coords.lng}
          />
        </div>
      )}

      {!found && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setShowSighting((s) => !s)}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-3 font-semibold text-accent-foreground transition hover:opacity-90"
          >
            👁 {t('report_sighting')}
          </button>
          <a
            href={`tel:${EMERGENCY_NUMBER}`}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-destructive px-4 py-3 font-semibold text-destructive transition hover:bg-destructive/10"
          >
            📞 {t('call_emergency')}
          </a>
        </div>
      )}

      {showSighting && !found && (
        <div className="rounded-md border border-border bg-card p-4">
          <h2 className="mb-3 text-lg font-bold text-foreground">
            {t('report_sighting_title')}
          </h2>
          <SightingForm
            caseId={data.case_id}
            onSuccess={() => mutate()}
          />
        </div>
      )}

      <Link
        href="/"
        className="block text-center text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        ← {t('back_to_alerts')}
      </Link>
    </div>
  )
}
