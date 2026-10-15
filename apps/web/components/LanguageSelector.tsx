'use client'

import { useTranslation } from 'react-i18next'

const LANGS: { code: 'en' | 'ha' | 'yo' | 'ig'; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'ha', label: 'HA' },
  { code: 'yo', label: 'YO' },
  { code: 'ig', label: 'IG' },
]

export default function LanguageSelector() {
  const { i18n } = useTranslation()
  const current = i18n.resolvedLanguage ?? i18n.language ?? 'en'

  return (
    <div
      className="flex items-center gap-1 rounded-md border border-border bg-card p-1"
      role="group"
      aria-label="Language"
    >
      {LANGS.map((lang) => {
        const active = current.startsWith(lang.code)
        return (
          <button
            key={lang.code}
            type="button"
            onClick={() => void i18n.changeLanguage(lang.code)}
            aria-pressed={active}
            className={`min-h-[36px] min-w-[44px] rounded px-3 text-sm font-semibold transition-colors ${
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted hover:text-foreground'
            }`}
          >
            {lang.label}
          </button>
        )
      })}
    </div>
  )
}
