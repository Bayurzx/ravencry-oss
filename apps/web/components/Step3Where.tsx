'use client'

import React, { Component } from 'react'
import dynamic from 'next/dynamic'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useGeolocation } from '@/hooks/useGeolocation'
import { errorClass, fieldClass, labelClass } from '@/lib/ui'
import type { ReportFormData } from '@/types'

// Lazy-load the map — it's an optional UX enhancement (pin drop), not a required field.
// Leaflet is ~140KB and can time out on slow connections (Turbopack chunk timeout).
// If loading fails, the text input still works and the report can still be submitted.
// A kidnapping report must never be blocked by a map chunk loading timeout.
const LocationPicker = dynamic(() => import('@/components/LocationPicker'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[250px] items-center justify-center rounded-md border border-border bg-muted text-sm text-muted-foreground">
      Loading map…
    </div>
  ),
})

// Error boundary: if the leaflet chunk fails to load (slow 3G timeout, etc.),
// the map area shows a fallback instead of crashing the entire report form.
class MapErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-[250px] items-center justify-center rounded-md border border-border bg-muted text-sm text-muted-foreground">
          Map unavailable — enter location as text above.
        </div>
      )
    }
    return this.props.children
  }
}

export default function Step3Where({
  data,
  update,
  showErrors,
}: {
  data: ReportFormData
  update: (patch: Partial<ReportFormData>) => void
  showErrors: boolean
}) {
  const { t } = useTranslation()
  const { lat, lng, loading, error, requestLocation } = useGeolocation()

  useEffect(() => {
    if (lat != null && lng != null) {
      update({ coordinates: { lat, lng } })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng])

  const locError = showErrors && !data.last_seen_location.trim()

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-foreground">{t('step3_title')}</h2>

      <div>
        <label htmlFor="location" className={labelClass}>
          Where were they last seen? *
        </label>
        <input
          id="location"
          type="text"
          value={data.last_seen_location}
          onChange={(e) => update({ last_seen_location: e.target.value })}
          placeholder={t('location_placeholder')}
          className={fieldClass}
        />
        {locError && <p className={errorClass}>Location is required.</p>}
      </div>

      <button
        type="button"
        onClick={requestLocation}
        className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-md border border-border bg-card font-semibold text-foreground"
      >
        📍 {loading ? t('loading') : t('use_my_location')}
      </button>
      {error && <p className={errorClass}>{error}</p>}

      <MapErrorBoundary>
        <LocationPicker
          value={data.coordinates}
          onChange={(coords) => update({ coordinates: coords })}
        />
      </MapErrorBoundary>

      <div>
        <label htmlFor="when" className={labelClass}>
          {t('when_hint')}
        </label>
        <input
          id="when"
          type="datetime-local"
          value={data.last_seen_time ?? ''}
          onChange={(e) => update({ last_seen_time: e.target.value })}
          className={fieldClass}
        />
      </div>

      <div>
        <label htmlFor="extra" className={labelClass}>
          {t('extra_details')}
        </label>
        <textarea
          id="extra"
          rows={3}
          value={data.extra ?? ''}
          onChange={(e) => update({ extra: e.target.value })}
          className={fieldClass}
        />
      </div>
    </div>
  )
}
