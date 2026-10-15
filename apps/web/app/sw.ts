/// <reference lib="esnext" />
/// <reference lib="webworker" />
import type {
  PrecacheEntry,
  RuntimeCaching,
  SerwistGlobalConfig,
} from 'serwist'
import {
  CacheFirst,
  ExpirationPlugin,
  Serwist,
  StaleWhileRevalidate,
} from 'serwist'

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

// Runtime caching rules tuned for the RAVENCRY threat model:
// intermittent 2G/3G where the network is slow or absent.
const runtimeCaching: RuntimeCaching[] = [
  {
    // Home page + app shell: cache-first so the PWA boots offline.
    // Navigation requests are document-type, so this catches /, /report, /alert/*, etc.
    matcher: ({ request }) => request.destination === 'document',
    handler: new StaleWhileRevalidate({
      cacheName: 'ravencry-pages',
      plugins: [
        new ExpirationPlugin({
          maxAgeSeconds: 24 * 60 * 60,
          maxEntries: 20,
        }),
      ],
    }),
  },
  {
    // Active alert feed: serve cached data instantly, refresh in the
    // background. A 5-minute expiry keeps offline data reasonably fresh.
    matcher: ({ url, request }) =>
      request.method === 'GET' && url.pathname.endsWith('/api/alerts/active'),
    handler: new StaleWhileRevalidate({
      cacheName: 'ravencry-alerts',
      plugins: [
        new ExpirationPlugin({
          maxAgeSeconds: 5 * 60,
          maxEntries: 32,
        }),
      ],
    }),
  },
  {
    // Missing-person photos hosted on S3: cache-first, capped at 50
    // entries so a long offline session can still render known faces.
    matcher: ({ url, request }) =>
      request.destination === 'image' && url.hostname.endsWith('amazonaws.com'),
    handler: new CacheFirst({
      cacheName: 'ravencry-photos',
      plugins: [
        new ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 7 * 24 * 60 * 60,
          purgeOnQuotaError: true,
        }),
      ],
    }),
  },
]

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
  fallbacks: {
    entries: [
      {
        url: '/~offline',
        matcher({ request }) {
          return request.destination === 'document'
        },
      },
    ],
  },
})

serwist.addEventListeners()
