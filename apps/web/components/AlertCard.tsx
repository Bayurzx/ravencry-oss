'use client'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import AlertBadge from '@/components/AlertBadge'
import { genderAgeLabel, relativeTime } from '@/lib/format'
import type { AlertCard as AlertCardType } from '@/types'

export default function AlertCard({ alert }: { alert: AlertCardType }) {
  const { t } = useTranslation()
  const meta = genderAgeLabel(alert.age_estimate, alert.gender)

  return (
    <article className="overflow-hidden rounded-lg border border-border bg-card">
      <Link
        href={`/alert/${alert.case_id}`}
        className="flex gap-3 p-3"
        aria-label={`View alert for ${alert.person_name}`}
      >
        <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-md bg-background">
          {alert.photo_url ? (
            // Pre-signed S3 URLs — use a plain img, not next/image
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={alert.photo_url}
              alt={alert.person_name}
              className="h-full w-full object-cover"
              crossOrigin="anonymous"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-3xl">
              👤
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-start justify-between gap-2">
            <h3 className="truncate text-base font-semibold text-foreground">
              {alert.person_name}
            </h3>
            <AlertBadge
              tier={alert.alert_tier}
              label={
                alert.alert_tier === 'FLASH'
                  ? t('flash_alert')
                  : alert.alert_tier === 'PRIORITY'
                    ? t('priority_alert')
                    : undefined
              }
            />
          </div>
          {meta && <p className="text-sm text-muted">{meta}</p>}
          <p className="truncate text-sm text-foreground">
            📍 {alert.last_seen_location}
          </p>
          <p className="text-xs text-muted">
            {t('last_seen')} {relativeTime(alert.last_seen_time)}
          </p>
          {alert.sightings_count > 0 && (
            <span className="mt-1 inline-block rounded-full bg-background px-2 py-0.5 text-xs text-muted">
              👁 {alert.sightings_count} sighting
              {alert.sightings_count === 1 ? '' : 's'}
            </span>
          )}
        </div>
      </Link>

      <Link
        href={`/sighting/${alert.case_id}`}
        className="flex min-h-[44px] items-center justify-center border-t border-border text-sm font-semibold text-routine"
      >
        👁 {t('report_sighting')}
      </Link>
    </article>
  )
}
