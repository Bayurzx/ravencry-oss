'use client'

import { useTranslation } from 'react-i18next'
import type { ReportFormData } from '@/types'

const OPTIONS: {
  value: ReportFormData['reportType']
  icon: string
  key: string
}[] = [
  { value: 'missing', icon: '👤', key: 'missing_option' },
  { value: 'abduction', icon: '🚨', key: 'abduction_option' },
  { value: 'sighting', icon: '👁', key: 'sighting_option' },
]

export default function Step1What({
  value,
  onChange,
}: {
  value: ReportFormData['reportType'] | undefined
  onChange: (v: ReportFormData['reportType']) => void
}) {
  const { t } = useTranslation()

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-foreground">{t('step1_title')}</h2>
      <div className="space-y-3">
        {OPTIONS.map((opt) => {
          const selected = value === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              aria-pressed={selected}
              className={`flex min-h-[56px] w-full items-center gap-3 rounded-lg border px-4 text-left text-base font-medium transition-colors ${
                selected
                  ? 'border-primary bg-primary/15 text-foreground'
                  : 'border-border bg-card text-foreground'
              }`}
            >
              <span className="text-2xl" aria-hidden>
                {opt.icon}
              </span>
              {t(opt.key)}
            </button>
          )
        })}
      </div>

      {value === 'abduction' && (
        <div className="rounded-md bg-priority/15 px-4 py-3 text-sm text-priority">
          ⚠️ {t('safety_warning')}{' '}
          <a href="tel:112" className="font-bold underline">
            112
          </a>
        </div>
      )}
    </div>
  )
}
