'use client'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { SubscribeForm } from '@/components/SubscribeForm'

export default function SubscribePage() {
  const { t } = useTranslation()
  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-4 pb-16 pt-4">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/"
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          ← {t('back_to_alerts')}
        </Link>
        <span className="text-xs font-semibold uppercase tracking-wider text-accent">
          RAVENCRY
        </span>
      </div>

      <h1 className="text-2xl font-bold text-foreground">
        {t('subscribe_title')}
      </h1>
      <p className="mb-6 mt-1 text-sm text-muted">{t('subscribe_desc')}</p>

      <SubscribeForm />
    </main>
  )
}
