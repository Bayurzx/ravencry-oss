'use client'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import AlertFeed from '@/components/AlertFeed'
import LanguageSelector from '@/components/LanguageSelector'

const WHATSAPP_NUMBER = '+234 800 000 0000'

export default function HomePage() {
  const { t } = useTranslation()

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-foreground">
            🇳🇬 {t('app_name')}
          </h1>
          <p className="text-xs text-muted">{t('tagline')}</p>
        </div>
        <LanguageSelector />
      </header>

      {/* Feed */}
      <section className="flex-1 px-4 py-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted">
          🚨 {t('flash_alert')}S
        </h2>
        <AlertFeed />
      </section>

      {/* Primary CTA */}
      <section className="space-y-3 px-4 pb-2">
        <Link
          href="/report"
          className="flex min-h-[56px] w-full items-center justify-center rounded-lg bg-flash text-base font-bold text-flash-foreground shadow-lg"
        >
          🔴 {t('report_cta')}
        </Link>
        <div className="flex gap-2">
          <Link
            href="/subscribe"
            className="flex min-h-[44px] flex-1 items-center justify-center rounded-lg border border-border text-sm font-semibold text-foreground"
          >
            🔔 Get alerts
          </Link>
          <a
            href="#fallback"
            className="flex min-h-[44px] flex-1 items-center justify-center rounded-lg border border-border text-sm font-semibold text-foreground"
          >
            📍 Map of alerts
          </a>
        </div>
      </section>

      {/* Fallback channels */}
      <footer
        id="fallback"
        className="mt-4 border-t border-border px-4 py-5 text-sm text-muted"
      >
        <p className="mb-2 font-semibold text-foreground">
          How to report without the app:
        </p>
        <ul className="space-y-1">
          <li>💬 {t('whatsapp_fallback', { number: WHATSAPP_NUMBER })}</li>
          <li>📱 {t('ussd_fallback')}</li>
          <li>✉️ SMS: REPORT to 20880</li>
        </ul>
        <p className="mt-4 text-xs text-muted">
          In immediate danger? Call{' '}
          <a href="tel:112" className="font-semibold text-flash">
            112
          </a>{' '}
          now.
        </p>
      </footer>
    </main>
  )
}
