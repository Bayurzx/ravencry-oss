import { Analytics } from '@vercel/analytics/next'
import { SerwistProvider } from '@serwist/turbopack/react'
import type { Metadata, Viewport } from 'next'
import './globals.css'
import I18nProvider from '@/components/I18nProvider'
import OfflineBanner from '@/components/OfflineBanner'
import PendingReportsBanner from '@/components/PendingReportsBanner'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://ravencry.cv'

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: 'RAVENCRY — Nigeria Alert System',
  description:
    "Nigeria's real-time anti-kidnapping and missing persons alert network. View active alerts, report a missing person, or report a sighting.",
  applicationName: 'RAVENCRY',
  manifest: '/manifest.json',
  generator: 'v0.app',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'RAVENCRY',
  },
  icons: {
    icon: '/icons/icon-192.svg',
    apple: '/icons/icon-192.svg',
  },
  openGraph: {
    title: 'RAVENCRY — Nigeria Alert System',
    description:
      "Nigeria's real-time anti-kidnapping and missing persons alert network.",
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#dc2626',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  colorScheme: 'dark',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Service workers only function in a real production build / installed PWA.
  // In the dev preview the SW script is served behind a proxy redirect, which
  // browsers disallow for SW registration — so only register in production.
  const isProduction = process.env.NODE_ENV === 'production'

  const content = (
    <I18nProvider>
      <OfflineBanner />
      <PendingReportsBanner />
      {children}
    </I18nProvider>
  )

  return (
    <html lang="en" className="dark bg-background">
      <body className="bg-background text-foreground antialiased">
        {isProduction ? (
          <SerwistProvider swUrl="/serwist/sw.js">{content}</SerwistProvider>
        ) : (
          content
        )}
        {isProduction && <Analytics />}
      </body>
    </html>
  )
}
