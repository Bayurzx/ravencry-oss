'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import AlertCard from '@/components/AlertCard'
import ErrorState from '@/components/ErrorState'
import { useAlertFeed } from '@/hooks/useAlertFeed'

function SkeletonCard() {
  return (
    <div className="animate-skeleton rounded-lg border border-border bg-card p-3">
      <div className="flex gap-3">
        <div className="h-20 w-20 rounded-md bg-background" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-2/3 rounded bg-background" />
          <div className="h-3 w-1/2 rounded bg-background" />
          <div className="h-3 w-3/4 rounded bg-background" />
        </div>
      </div>
    </div>
  )
}

export default function AlertFeed() {
  const { t } = useTranslation()
  const [coords, setCoords] = useState<{
    lat: number | null
    lng: number | null
  }>({ lat: null, lng: null })
  const [located, setLocated] = useState(false)

  // Request geolocation once on mount; proceed regardless of the result.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocated(true)
      return
    }
    let done = false
    const finish = (lat: number | null, lng: number | null) => {
      if (done) return
      done = true
      setCoords({ lat, lng })
      setLocated(true)
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => finish(pos.coords.latitude, pos.coords.longitude),
      () => finish(null, null),
      { timeout: 8000, maximumAge: 300_000 },
    )
    // Safety timeout so the feed always loads
    const timer = setTimeout(() => finish(null, null), 9000)
    return () => clearTimeout(timer)
  }, [])

  const { alerts, isLoading, isError, isOffline, mutate } = useAlertFeed(
    coords.lat,
    coords.lng,
  )

  if (!located || isLoading) {
    return (
      <div className="space-y-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  if (isError) {
    return <ErrorState onRetry={mutate} />
  }

  return (
    <div className="space-y-3">
      {isOffline && (
        <div className="rounded-md bg-priority/15 px-3 py-2 text-sm text-priority">
          ⚠️ {t('offline_notice')}
        </div>
      )}

      {alerts.length === 0 ? (
        <div className="rounded-lg border border-border bg-card px-4 py-10 text-center text-muted">
          {t('no_alerts')} 🙏
        </div>
      ) : (
        alerts.map((alert) => (
          <AlertCard key={alert.case_id} alert={alert} />
        ))
      )}
    </div>
  )
}
