'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { usePushSubscription } from '@/hooks/usePushSubscription'
import { useGeolocation } from '@/hooks/useGeolocation'
import { subscribeToAlerts } from '@/lib/api'
import { LoadingSpinner } from '@/components/LoadingSpinner'

export function SubscribeForm() {
  const { t } = useTranslation()
  const { isSupported, isSubscribed, subscribe } = usePushSubscription()
  const { lat, lng, loading: geoLoading, requestLocation } = useGeolocation()
  const coords = lat != null && lng != null ? { lat, lng } : null
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [blocked, setBlocked] = useState(false)

  async function handleEnable() {
    setBusy(true)
    setBlocked(false)
    try {
      const token = await subscribe()
      if (!token) {
        setBlocked(true)
        return
      }
      await subscribeToAlerts(
        {
          coords: coords ?? undefined,
          push_token: token,
          whatsapp: false,
        },
        token,
      )
      setDone(true)
    } catch {
      setBlocked(true)
    } finally {
      setBusy(false)
    }
  }

  if (done || isSubscribed) {
    return (
      <div
        className="rounded-md border border-found bg-found/10 px-4 py-3 text-sm font-semibold text-found"
        role="status"
      >
        ✓ {t('subscribe_enabled')}
      </div>
    )
  }

  if (!isSupported) {
    return (
      <p className="rounded-md border border-border bg-card px-4 py-3 text-sm text-muted">
        {t('subscribe_unsupported')}
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={requestLocation}
        className="flex w-full items-center justify-center gap-2 rounded-md border border-border px-4 py-3 text-sm font-medium text-foreground transition hover:bg-muted/10"
      >
        📍{' '}
        {geoLoading
          ? t('loading')
          : coords
            ? `${coords.lat.toFixed(3)}, ${coords.lng.toFixed(3)}`
            : t('use_my_location')}
      </button>

      {blocked && (
        <p className="text-sm text-destructive" role="alert">
          {t('subscribe_blocked')}
        </p>
      )}

      <button
        type="button"
        onClick={handleEnable}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-3 font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-60"
      >
        {busy && <LoadingSpinner className="h-4 w-4" />}
        🔔 {t('subscribe_enable')}
      </button>
    </div>
  )
}
