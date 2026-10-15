'use client'

import { useEffect, useState } from 'react'
import { EMERGENCY_NUMBER, USSD_CODE, WHATSAPP_NUMBER } from '@/lib/constants'
import { getQueue } from '@/lib/offline-queue'

// Self-contained offline fallback. It is precached by the service worker
// and intentionally avoids network-dependent data or i18n hydration so it
// renders instantly even on a fully offline / cold-start navigation.
export default function OfflinePage() {
  const [queueLength, setQueueLength] = useState(0)

  useEffect(() => {
    getQueue()
      .then((q) => setQueueLength(q.length))
      .catch(() => setQueueLength(0))
  }, [])

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 py-12 text-center">
      <div className="flex flex-col items-center gap-3">
        <span
          aria-hidden="true"
          className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-3xl font-bold text-primary"
        >
          R
        </span>
        <h1 className="text-balance text-2xl font-bold tracking-tight">
          You&apos;re offline
        </h1>
        <p className="max-w-sm text-pretty leading-relaxed text-muted-foreground">
          RAVENCRY can&apos;t reach the network right now. Cached alerts may
          still be available, and any report you submit will send automatically
          once you&apos;re back online.
        </p>

        {queueLength > 0 && (
          <div className="mt-2 rounded-lg bg-amber-600/20 px-4 py-3 text-sm font-medium text-amber-200">
            📤 {queueLength} report{queueLength !== 1 ? 's' : ''} queued
            — will sync automatically when your connection returns.
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => window.location.reload()}
        className="rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        Try again
      </button>

      <section
        aria-label="Emergency contacts"
        className="w-full max-w-sm rounded-xl border border-destructive/40 bg-card p-5 text-left"
      >
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-destructive">
          In an emergency
        </h2>
        <ul className="flex flex-col gap-3 text-sm">
          <li className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Police / Emergency</span>
            <a
              href={`tel:${EMERGENCY_NUMBER}`}
              className="text-lg font-bold text-foreground underline-offset-4 hover:underline"
            >
              {EMERGENCY_NUMBER}
            </a>
          </li>
          <li className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">WhatsApp tip line</span>
            <span className="font-medium text-foreground">{WHATSAPP_NUMBER}</span>
          </li>
          <li className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">USSD (no data)</span>
            <span className="font-medium text-foreground">{USSD_CODE}</span>
          </li>
        </ul>
      </section>
    </main>
  )
}
