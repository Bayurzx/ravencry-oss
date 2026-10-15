'use client'

import { useTranslation } from 'react-i18next'

export function ErrorState({
  message,
  onRetry,
}: {
  message?: string
  onRetry?: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-10 text-center">
      <span className="text-4xl" aria-hidden>
        ⚠️
      </span>
      <p className="max-w-xs text-sm text-muted">
        {message ?? t('error_generic')}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="min-h-[44px] rounded-md bg-primary px-6 font-semibold text-primary-foreground"
        >
          {t('retry')}
        </button>
      )}
    </div>
  )
}

export default ErrorState
