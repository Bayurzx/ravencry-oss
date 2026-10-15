'use client'

import { useEffect } from 'react'

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

/**
 * Root-level error boundary for the entire app.
 *
 * IMPORTANT: This component is rendered OUTSIDE the RootLayout — it has NO
 * access to I18nProvider, SerwistProvider, or any other React context.
 * It MUST NOT import useTranslation, i18n, or any context-dependent hook.
 * Keep dependencies to an absolute minimum to prevent cascading failures
 * during static generation (which crashed the auto-generated page).
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error('Global error boundary caught:', error)
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: '24px 16px',
          background: '#0a0a0a',
          color: '#fafafa',
          fontFamily:
            'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          gap: '16px',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'rgba(220,38,38,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 28,
            fontWeight: 700,
            color: '#dc2626',
          }}
        >
          R
        </div>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            margin: 0,
            lineHeight: 1.3,
          }}
        >
          Something went wrong
        </h1>
        <p
          style={{
            maxWidth: 360,
            margin: 0,
            lineHeight: 1.6,
            color: '#a1a1aa',
            fontSize: 14,
          }}
        >
          RAVENCRY encountered a critical error. Please try again or reload the
          page.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            marginTop: 8,
            padding: '10px 24px',
            borderRadius: 8,
            border: '1px solid #27272a',
            background: '#18181b',
            color: '#fafafa',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </body>
    </html>
  )
}
