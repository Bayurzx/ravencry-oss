'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export default function CaseIdBadge({
  caseId,
  showCopyButton = true,
}: {
  caseId: string
  showCopyButton?: boolean
}) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(caseId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard may be unavailable
    }
  }

  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2">
      <span className="font-mono text-sm text-foreground">{caseId}</span>
      {showCopyButton && (
        <button
          type="button"
          onClick={copy}
          className="ml-auto min-h-[36px] rounded px-2 text-xs font-semibold text-routine hover:underline"
          aria-label={t('copy')}
        >
          {copied ? '✓ ' + t('copy') + 'd' : t('copy')}
        </button>
      )}
    </div>
  )
}
