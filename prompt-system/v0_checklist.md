# RAVENCRY — v0 Build Checklist (Audited)

> This is the original session checklist, audited against what was actually built.
> Legend: `[x]` done as specified · `[~]` done differently (better/adapted, explained) · `[ ]` intentionally not done (explained).
>
> **Important environment note:** The running v0 project is **Next.js 16 + Tailwind v4 (Turbopack)** with a **root `app/`** directory and `@/*` aliased to the project root. The original spec targeted **Next.js 14 + Tailwind v3 + `src/`**. To keep the live preview working, all `src/...` paths below were implemented at the **project root** (`app/`, `components/`, `lib/`, `hooks/`, `types/`). Functionality is identical; only the folder prefix differs. This single adaptation explains every `src/` mismatch and is not repeated per-line.

---

## PROMPT 1: Project scaffold + types + config

- [~] `package.json` dependencies — `next`, `react`, `react-dom`, `typescript`, `tailwindcss`, `swr`, `i18next`, `react-i18next`, `i18next-browser-languagedetector`, `idb`, `leaflet`, `react-leaflet`, `@types/leaflet` are all installed.
  - **Different:** `next-pwa` and `web-push` are **not** installed (see below). Versions are newer than the spec (React 19, react-leaflet 5, i18next 26) because that is what this Next 16 environment ships.
- [x] `tsconfig.json` exists with `"strict": true` (project default).
- [ ] `next.config.js` with `withPWA(...)` + runtime caching — **intentionally not done.** `next-pwa` is not compatible with Next 16 + Turbopack (it relies on Webpack hooks). The config is `next.config.mjs` without the PWA wrapper. **Highlight:** for production PWA/offline-shell behavior you should either pin Next 14 + Webpack and add `next-pwa`, or adopt a Turbopack-compatible approach (e.g. Serwist) — see "Recommended improvements".
- [~] `tailwind.config.ts` with the dark palette — **done differently.** Tailwind v4 has no config file; the palette (`#0a0a0a`, `#1a1a1a`, `#fafafa`, `#dc2626`, `#f59e0b`) lives in `app/globals.css` under `@theme`. Same colors, idiomatic v4 location.
- [x] `public/manifest.json` — name "RAVENCRY — Nigeria Alert System", short_name "RAVENCRY", theme_color `#dc2626`, display standalone, 192 + 512 icons.
  - **Different:** icons are SVG (`/icons/icon-192.svg`, `icon-512.svg`) rather than PNG.
- [x] `types/index.ts` — all types present: `AlertCard`, `ActiveAlertsResponse`, `CaseDetailResponse`, `ReportResponse`, `SightingResponse`, request bodies, `ApiError`, `SSEEvent`, and the enums/unions.
- [~] `app/layout.tsx` — metadata export, manifest link, viewport (incl. `themeColor`), dark background class on `<html>`, and the i18n provider.
  - **Different:** uses a small client `I18nProvider` wrapper instead of `<I18nextProvider>` directly, so `layout.tsx` can stay a Server Component.
- [x] `app/globals.css` — Tailwind imported (v4 `@import "tailwindcss"`) and dark `background`/`foreground` applied via tokens + on `<html>`.

---

## PROMPT 2: API client + lib files

- [x] `lib/api.ts` exports `getActiveAlerts`, `getCaseDetail`, `submitReport`, `submitSighting`, `subscribeToAlerts`, `unsubscribeFromAlerts`.
- [x] All functions use `process.env.NEXT_PUBLIC_API_URL` as base URL (fallback `http://localhost:3003`, matching the spec's dev port).
- [x] Error handling parses the `{ error, code, details? }` shape and throws a typed `RavencryApiError` (includes `status`).
- [x] Proper return types, no `any`.
- [x] `lib/i18n.ts` initializes i18next with EN + HA + browser language detection.
- [x] `lib/offline-queue.ts` uses `idb` with CRUD queue ops (`addToQueue`, `getQueue`, `removeFromQueue`) **plus** an alert cache (`cacheAlerts`/`getCachedAlerts`).
- [x] `lib/push.ts` reads `NEXT_PUBLIC_VAPID_KEY` from env.
- [~] **Added beyond spec:** `lib/api.ts` has a seed-data fallback (`MOCK_FALLBACK`) that activates **only on network errors** so the PWA is fully demoable without the backend running. Server (4xx/5xx) errors still throw normally. Disable with `NEXT_PUBLIC_DISABLE_MOCK=true`.

---

## PROMPT 3: Home page + AlertFeed + AlertCard

- [x] `app/page.tsx` is `'use client'`, renders `AlertFeed`, has a red CTA to `/report`, and a footer with fallback channels (WhatsApp / USSD / SMS / 112).
- [x] `components/AlertFeed.tsx` consumes SWR via the `useAlertFeed` hook keyed `['alerts', lat, lng]`.
- [x] EventSource to `/events` (built from `NEXT_PUBLIC_API_URL`) — implemented inside `useAlertFeed`.
- [x] SSE reconnect with **exponential backoff capped at 30s** (`Math.min(1000 * 2 ** retry, 30000)`).
- [x] Haptic feedback `navigator.vibrate(200)` on a genuinely new alert.
- [x] Empty state "No active alerts in your area. Stay safe. 🙏".
- [x] Loading state: 3 skeleton cards with pulse animation.
- [x] Error state uses `ErrorState`.
- [x] `components/AlertCard.tsx` shows photo/placeholder, name, age, gender, location, tier badge, sightings count.
- [~] Click navigates to `/alert/{case_id}` — uses `next/link` (`<Link>`) rather than `useRouter`. Equivalent client-side navigation, better for accessibility/prefetch. "Report Sighting" links to `/sighting/{case_id}`.
- [x] `components/AlertBadge.tsx`: FLASH = red `#dc2626`, PRIORITY = amber `#f59e0b`.
- [x] `components/LanguageSelector.tsx` toggles EN/HA via `i18n.changeLanguage()`.
- [x] `components/OfflineBanner.tsx` uses `navigator.onLine` + online/offline listeners.
- [x] `components/LoadingSpinner.tsx` and `components/ErrorState.tsx` exist.
- [~] **Different:** geolocation in the feed is requested inline in `AlertFeed` (with an 8s timeout + safety fallback) rather than through the `useGeolocation` hook. The hook still exists and is used by the subscribe flow.

---

## PROMPT 4: Alert detail page

- [~] `app/alert/[caseId]/page.tsx` is an `async` Server Component, but the data fetch + rendering happen in a **client island** (`components/AlertDetail.tsx`, SWR).
  - **Different / intentional:** the spec wanted a pure RSC with server `fetch` + `generateMetadata`. Because the API client carries the network-error → seed-data fallback (so the preview survives without a backend), detail rendering was kept client-side. **Highlight:** if you want real per-case SEO/OG tags, this page should become a true RSC with `generateMetadata()` + `fetch(..., { next: { revalidate: 60 } })` + `notFound()`. See "Recommended improvements".
- [ ] `generateMetadata()` for og:image/title/description — **not done** (consequence of the client-island choice above).
- [~] `fetch` with `next: { revalidate: 60 }` — the API client **supports** `{ revalidate }` (passed through to `getCaseDetail`), but the detail view uses SWR, so it is not currently wired on this page.
- [x] Missing case → friendly "alert not found" state (SWR error path). (`notFound()` would be used in the RSC version.)
- [x] Server/Island renders photo, name, age, gender, location, time, case ID.
- [~] Case ID + copy — implemented as `components/CaseIdBadge.tsx` (monospace, dark bg, built-in copy with "copied" feedback) instead of a separate `CopyButton.tsx`. Same capability, one component.
- [x] Resolved state: green "✓ This person has been found." banner.
- [x] Active state: red "report a sighting" CTA + "Call 112" (`tel:`) button.
- [x] Map lazy-loaded with a loading placeholder (Next `dynamic` `loading:` ≈ Suspense fallback).
- [~] Map island — `components/AlertMap.tsx` with `'use client'`, named `AlertMap` rather than `AlertMapIsland.tsx`.
- [x] Leaflet dynamically imported with `{ ssr: false }`; OpenStreetMap tiles (no API key); marker at coordinates.
- [~] Marker popup — marker is placed at the case coordinates; default Leaflet marker icons are patched (a real bundler gotcha the spec didn't mention).

---

## PROMPT 5: Report wizard (4-step form)

- [x] `app/report/page.tsx` → `ReportWizard` (`'use client'`).
- [x] Progress bar with 4 segments (active red, completed green, pending gray).
- [x] Step 1: 3-option radio (missing / abduction / sighting) + safety banner when abduction is selected.
- [x] Step 2: name (required, validated), age (0–120), gender select, clothing textarea, photo upload with 5MB limit + preview.
- [x] Step 3: location (required, validated), GPS button, `LocationPicker` map, datetime input, extra details textarea.
- [x] Step 4: review card with all entered data, optional phone, anonymous toggle, submit.
- [x] Validation: required fields show red errors; cannot advance an invalid step.
- [x] Submit calls `POST /api/reports` with `channel: 'pwa'`.
- [x] Success: checkmark, case ID via `CaseIdBadge`, share button, back link.
- [x] Offline: cloud-off state, "Saved. Will send when you're online", pending badge — via `useOfflineQueue` + IndexedDB.
- [x] `components/LocationPicker.tsx` `'use client'` + dynamic Leaflet, Nigeria center `[9.082, 8.6753]` zoom 6, click-to-drop, coordinates shown below.
- [x] `components/CaseIdBadge.tsx`: monospace, dark bg, copy button.

---

## PROMPT 6: Hooks

- [x] `hooks/useAlertFeed.ts` — SWR `['alerts', lat, lng]`, EventSource `/events`, `new_alert` → `mutate()` + `vibrate(200)`, exponential backoff capped at 30s, IndexedDB cache of last alerts, returns `{ alerts, isLoading, isError, isOffline, mutate }`. Cleans up EventSource + timers + listeners on unmount.
- [~] `hooks/useOfflineQueue.ts` — `submitReport(data)` tries POST then falls back to the IndexedDB queue on network error; `retryAll()` runs on `online`; 4xx removed from queue, network errors kept; returns `{ submitReport, isPending, queueLength, retryAll }`.
  - **Different:** queue stores typed report payloads (`CreateReportRequest`) rather than raw fetch descriptors.
- [x] `hooks/useGeolocation.ts` — `getCurrentPosition` with 10s timeout, graceful permission-denied handling, returns `{ lat, lng, loading, error, requestLocation }`.
- [x] `hooks/usePushSubscription.ts` — checks support/permission on mount, `subscribe()` via `serviceWorker.ready.pushManager.subscribe` with VAPID key, `unsubscribe()`, returns `{ isSubscribed, subscribe, unsubscribe, isSupported }` (+ `pushToken`).

---

## PROMPT 7: Sightings + Subscribe pages

- [x] `app/sighting/[caseId]/page.tsx` — `case_id` pre-filled from the route (not editable), description textarea (required + validated), optional phone, `POST /api/sightings`, success confirmation. *(This route was added during the audit — `AlertCard` linked to it but it was initially missing; now fixed.)*
- [ ] Per-case 404 on the sighting page — **not done.** The sighting page accepts any `caseId` and lets you submit without first verifying the case exists (the case is validated server-side on submit). Low risk, but noted.
- [~] `app/subscribe/page.tsx` (`'use client'`) — GPS button for coordinates, push-notification subscribe button, success/error feedback, phone sent via the `X-RAVENCRY-Phone` header (not the body). **Done differently / partially:**
  - [ ] **State dropdown + LGA dropdown** (Nigerian states, LGA filtered by state) — **not built.** The subscribe flow is geolocation-first (coordinates) instead of administrative-area selectors. **Highlight:** if subscriptions must be addressable by State/LGA (e.g. for SMS broadcast zones), add the two dependent selects.
  - [ ] **WhatsApp opt-in toggle** — not surfaced in the UI; the API call sends `whatsapp: false`. Easy to add a toggle.
  - [ ] Phone is currently not a required input on this screen (the push token doubles as the header value). If phone-based subscription is required, add a validated phone field.

---

## PROMPT 8: i18n translation files

- [x] `public/locales/en/common.json` and `public/locales/ha/common.json` exist (mirrored copies also live in `lib/locales/*.json`, which are the ones actually bundled/initialized).
- [x] Every EN key has a HA counterpart; HA values are real Hausa, no English placeholders/TODOs.
- [~] **Different:** keys are a flat namespace (e.g. `sighting_desc_label`) rather than nested (`sighting.descriptionLabel`). The count is the spec's ~45+ keys, expanded as features grew.

---

## Integration Check

- [x] All component imports resolve (verified by a clean `tsc --noEmit`).
- [x] No hardcoded API URLs except the `NEXT_PUBLIC_API_URL` fallback (`http://localhost:3003`).
- [x] All Leaflet usage is behind `dynamic(import, { ssr: false })`, with default-icon patching.
- [x] `'use client'` placed correctly on interactive components/pages.
- [~] `layout.tsx` is a Server Component; the i18n provider is a separate client island (matches the spirit of the "no `'use client'` on layout" rule).
- [ ] `next.config.js` `withPWA(...)` default export — **not applicable** (see Prompt 1; no `next-pwa` on Next 16/Turbopack).
- [ ] `vercel.json` referencing `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_VAPID_KEY` — **not created.** On Vercel these are set in Project → Settings → Environment Variables; a `vercel.json` is not required for env vars. Can be added if you want them version-controlled.
- [x] All forms handle loading, validation, success, and network-error/offline paths (reports queue offline; sightings show a queued message).
- [x] No unused imports; `any` avoided except where unavoidable.

---

## Improvements made beyond the checklist

- **Network-error seed-data fallback** in `lib/api.ts` so the entire PWA is demoable with no backend (toggle off via `NEXT_PUBLIC_DISABLE_MOCK=true`). Server errors still propagate.
- **Leaflet default-icon patching** in `LocationPicker`/`AlertMap` to fix the well-known broken-marker bug under bundlers.
- **IndexedDB alert cache** (last alerts) in addition to the offline report queue, so the feed still shows cached cards while offline.
- **Browser-verified** every route (`/`, `/alert/[caseId]`, `/report`, `/sighting/[caseId]`, `/subscribe`) with screenshots; fixed missing color tokens (`accent`, `destructive`, `found`) discovered during verification.
- **Accessibility:** semantic landmarks, `aria-label`s on alert links, `role="status"`/`role="alert"` on feedback, 44px min tap targets.

## Recommended improvements to highlight

1. **PWA offline shell / installability** — the manifest + icons exist, but there is **no service worker** (no `next-pwa` on Next 16/Turbopack). For true offline caching and "Add to Home Screen" install prompts, adopt **Serwist** (Turbopack-friendly) or pin Next 14 + Webpack + `next-pwa`.
2. **Real per-case SEO/OG** — convert `app/alert/[caseId]/page.tsx` to a true RSC with `generateMetadata()` + `fetch(..., { next: { revalidate: 60 } })` + `notFound()`. Shareable alert links would then get proper title/description/`og:image` (critical for spreading FLASH alerts on social/WhatsApp). The API client already supports the `{ revalidate }` option.
3. **Subscribe by State/LGA** — add the dependent State → LGA selects and the WhatsApp opt-in toggle if subscriptions need to map to administrative broadcast zones rather than raw GPS coordinates.
4. **Sighting page case existence check** — optionally fetch the case in `/sighting/[caseId]` and show a 404/"case closed" state before allowing submission.
5. **PNG icons** — replace the placeholder SVG icons with rasterized 192/512 PNG maskable icons for the broadest install/splash-screen support.
6. **`useGeolocation` reuse** — the feed requests geolocation inline; consolidating onto the `useGeolocation` hook would remove the small duplication.


---
## Follow-up
The app currently has NO service worker. The next-pwa library was skipped because it's incompatible with Next.js 16 + Turbopack. This is a CRITICAL gap — without a service worker:

1. The PWA won't load AT ALL when offline (users in Nigeria on 2G/3G with intermittent connectivity)
2. The "Add to Home Screen" install prompt won't trigger (Chrome requires a fetch handler)
3. The offline report queue and alert cache in IndexedDB are dead code — they can never run if the page itself can't load
4. The runtime caching rules for /api/alerts and S3 images are absent, so every load is a cold load

Please add a service worker using a Turbopack-compatible approach. You can use Serwist (@serwist/next) or any other approach that works with the current Next.js 16 + Turbopack environment. If Turbopack is the blocker, pinning to Webpack for the build is also acceptable.

What the service worker MUST do:

- Precache the app shell (layout, core CSS/JS) so the page loads offline
- Cache GET /api/alerts/active responses with StaleWhileRevalidate, expiry 5 minutes
- Cache S3 images (*.amazonaws.com) with CacheFirst, max 50 entries
- Register a fetch handler (required for Chrome install prompt)
- Use skipWaiting + clientsClaim for immediate activation on update

The app already has:
- public/manifest.json with name, theme_color, display: standalone, icons
- lib/offline-queue.ts (IndexedDB queue for reports) — this needs the SW so it can actually work offline
- hooks/useAlertFeed.ts (caches alerts to IndexedDB) — same, needs the SW to be useful

DO NOT:
- Change the manifest.json (it's already correct)
- Change the offline-queue or useAlertFeed logic (they're correct, they just need the SW to load first)
- Remove Tailwind v4 or Turbopack unless necessary for the SW to work

If you cannot make a service worker work with the current Next 16 + Turbopack setup, tell me explicitly and we'll pivot to Next 14 + Webpack + next-pwa instead.