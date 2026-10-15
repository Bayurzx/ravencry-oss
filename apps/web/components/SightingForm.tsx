'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import dynamic from 'next/dynamic'
import { fieldClass, labelClass } from '@/lib/ui'
import { submitSighting } from '@/lib/api'
import { LoadingSpinner } from '@/components/LoadingSpinner'

const LocationPicker = dynamic(() => import('@/components/LocationPicker'), {
  ssr: false,
})

export function SightingForm({
  caseId,
  onSuccess,
}: {
  caseId: string
  onSuccess?: () => void
}) {
  const { t } = useTranslation()
  const [description, setDescription] = useState('')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | undefined>()
  const [contact, setContact] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState<'online' | 'queued' | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!description.trim()) {
      setError(t('sighting_desc_required'))
      return
    }
    setError(null)
    setSubmitting(true)
    const payload = {
      case_id: caseId,
      description: description.trim(),
      sighting_location: coords ? `${coords.lat},${coords.lng}` : undefined,
      reporter_phone: contact.trim() || undefined,
      sighting_time: new Date().toISOString(),
    }
    try {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        throw new Error('offline')
      }
      await submitSighting(payload)
      setDone('online')
      onSuccess?.()
    } catch {
      setDone('queued')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div
        className="rounded-md border border-border bg-card p-4 text-sm"
        role="status"
      >
        {done === 'online' ? t('sighting_thanks') : t('sighting_queued')}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="sighting-desc" className={labelClass}>
          {t('sighting_desc_label')}
        </label>
        <textarea
          id="sighting-desc"
          className={fieldClass}
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('sighting_desc_placeholder')}
        />
      </div>

      <div>
        <span className={labelClass}>{t('sighting_location_label')}</span>
        <LocationPicker value={coords} onChange={setCoords} />
      </div>

      <div>
        <label htmlFor="sighting-contact" className={labelClass}>
          {t('sighting_contact_label')}
        </label>
        <input
          id="sighting-contact"
          className={fieldClass}
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder={t('sighting_contact_placeholder')}
        />
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-3 font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-60"
      >
        {submitting && <LoadingSpinner className="h-4 w-4" />}
        {t('sighting_submit')}
      </button>
    </form>
  )
}
