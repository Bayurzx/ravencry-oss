# RAVENCRY — v0.dev Frontend Context
## Phase 5: Next.js PWA · Hackathon Submission

> **For v0.dev:** This document contains ALL context needed to generate the complete Next.js PWA frontend for RAVENCRY, Nigeria's anti-kidnapping and missing persons alert network.
>
> **Strategy:** Generate the full app in v0.dev, export as a ZIP, extract into `apps/web/` in this monorepo.
>
> **IMPORTANT:** v0.dev should create these files fresh. The existing files in `apps/web/src/` are empty stubs placed for project structure reference. **Overwrite them.**

---

## HOW TO USE THIS DOCUMENT WITH v0.dev

**Do NOT paste this entire document into v0.dev.** It's too long and v0.dev works best with focused, iterative prompts. Instead:

1. **This document is your reference spec.** Keep it open while prompting v0.dev.
2. **Use the prompts below**, one at a time, in order. Each prompt builds on the previous output.
3. **After each v0.dev generation**, paste the next prompt to extend the app.
4. **At the end**, export the ZIP from v0.dev and extract into `apps/web/`.

### v0.dev Prompt Sequence (paste these one at a time)

---

#### PROMPT 1: Project scaffold + types + config

```
Create a Next.js 14 dark-themed PWA for Nigeria's anti-kidnapping alert system called "RAVENCRY".

Tech stack: Next.js 14 (App Router), TypeScript strict, Tailwind CSS, next-pwa, Leaflet.js + react-leaflet, SWR, i18next + react-i18next, idb, web-push.

First, create the scaffold:
1. package.json with all dependencies
2. tsconfig.json with strict mode
3. next.config.js with next-pwa configured (Workbox runtime caching for /api/alerts patterns)
4. tailwind.config.ts with dark theme
5. postcss.config.js
6. vercel.json with security headers
7. public/manifest.json — PWA manifest: name "RAVENCRY — Nigeria Alert System", short_name "RAVENCRY", theme_color "#dc2626", background_color "#0a0a0a", display standalone, orientation portrait
8. public/icons/ — placeholder SVG icons (192px and 512px, red circle on dark bg)
9. src/types/index.ts — ALL TypeScript types (copy from the types section below)
10. src/app/globals.css — Tailwind directives + dark background styling
11. src/app/layout.tsx — Root layout with metadata, PWA manifest link, I18nextProvider, viewport meta

Design constraints:
- NO component library (no shadcn/ui, MUI, Chakra). Tailwind only.
- System font stack, no custom fonts
- Colors: bg #0a0a0a, card #1a1a1a, text #fafafa, muted #a3a3a3, FLASH red #dc2626, PRIORITY amber #f59e0b, ROUTINE blue #3b82f6, success #22c55e

Types to include in src/types/index.ts:
<COPY ALL TYPE DEFINITIONS FROM SECTION 4 OF THIS DOCUMENT>
```

---

#### PROMPT 2: API client + lib files

```
Now add the utility libraries:

1. src/lib/api.ts — Typed fetch wrapper for the external Express API at NEXT_PUBLIC_API_URL.
   Functions needed:
   - getActiveAlerts(lat?, lng?, radiusKm?, limit?) → ActiveAlertsResponse
   - getCaseDetail(caseId) → CaseDetailResponse
   - submitReport(data: CreateReportRequest) → ReportResponse
   - submitSighting(data: CreateSightingRequest) → SightingResponse
   - subscribeToAlerts(data: CreateSubscriberRequest, phoneHeader: string) → SubscriberResponse
   - unsubscribeFromAlerts(phoneHeader: string) → void
   Error handling: parse ApiError format { error, code, details? } from non-ok responses.

2. src/lib/i18n.ts — i18next config with EN and HA resources loaded from public/locales/. Language detection from browser, fallback to EN.

3. src/lib/offline-queue.ts — IndexedDB queue using 'idb' library for storing failed POST /api/reports submissions. Functions: addToQueue(report), getQueue(), removeFromQueue(id), retryAll().

4. src/lib/push.ts — VAPID public key from NEXT_PUBLIC_VAPID_KEY env var. subscribe/unsubscribe helpers using web-push.

Keep TypeScript strict throughout. No 'any' types.
```

---

#### PROMPT 3: Home page + AlertFeed + AlertCard

```
Now build the home page. This is the main citizen-facing screen.

1. src/app/page.tsx — Home page ('use client' — needs SSE and SWR):
   - Header: "🇳🇬 RAVENCRY" + LanguageSelector toggle (EN/HA)
   - AlertFeed component showing FLASH and PRIORITY alerts
   - Full-width red CTA button: "🔴 REPORT MISSING PERSON" → links to /report
   - Link: "📍 View map of alerts"
   - Footer: fallback channels (WhatsApp number, USSD *384#, SMS shortcode)

2. src/components/AlertFeed.tsx:
   - On mount: request geolocation. If granted, GET /api/alerts/active?lat=&lng=&radius_km=160. If denied, GET /api/alerts/active for all FLASH/PRIORITY.
   - Subscribe to SSE /events for live updates (useEventSource or manual EventSource)
   - On SSE "new_alert" event: prepend to list + navigator.vibrate(200) for haptic feedback
   - Offline: read last 10 cached alerts from IndexedDB, show yellow "You're offline. Showing cached alerts." banner
   - Empty state: "No active alerts in your area. Stay safe. 🙏"
   - Loading state: skeleton cards (3 animated placeholder cards)
   - Error state: error icon + retry button

3. src/components/AlertCard.tsx:
   - Photo (or gray placeholder with 👤 emoji if no photo_url), person name, age, gender
   - Location text, relative time ("2 hours ago", "1 day ago")
   - AlertBadge: 🚨 FLASH (red bg pill) / ⚠️ PRIORITY (amber bg pill)
   - "👁 Report Sighting" button → links to /sighting/{case_id}
   - Click card → navigate to /alert/{case_id}
   - sightings_count badge showing number of citizen sightings

4. src/components/AlertBadge.tsx — Pill badge component. FLASH = red bg, PRIORITY = amber bg.

5. src/components/LanguageSelector.tsx — Two toggle buttons: EN and HA. Uses i18next changeLanguage(). Persists to localStorage.

6. src/components/OfflineBanner.tsx — Yellow bar at top: "⚠️ You're offline. Showing cached alerts." Only visible when navigator.onLine is false.

7. src/components/LoadingSpinner.tsx — Centered animated spinner for loading states.

8. src/components/ErrorState.tsx — Error icon + message + "Retry" button.

Design: mobile-first vertical stack. Dark theme (#0a0a0a background). Touch targets minimum 44x44px. Body text minimum 16px. Use Unicode emoji for icons (zero bundle cost).
```

---

#### PROMPT 4: Alert detail page (RSC + client map island)

```
Now build the alert detail page. THIS PAGE MUST BE A SERVER COMPONENT for SEO/og:image.

1. src/app/alert/[id]/page.tsx — Async Server Component (NO 'use client'):
   - generateMetadata(): fetch GET /api/cases/{id} server-side. Return og:image from photo_url, og:title with person_name + alert_tier.
   - Fetch case detail server-side with next: { revalidate: 60 } for ISR
   - 404 via notFound() if case not found
   - Back nav: "← Back" link to /, tier badge next to it
   - Full-width photo if photo_url exists (server-rendered <img>, not Next.js Image)
   - Person details: name (h1), age, gender, last seen location, last seen time
   - Case ID in monospace font with CopyButton (client island)
   - If status === 'resolved': green banner "✅ This person has been found. Thank you."
   - If NOT resolved: "🚨 REPORT A SIGHTING" red CTA → /sighting/{id}, "📞 Call 112" outline button → tel:112
   - Map section: wrapped in <Suspense fallback={animated placeholder}>, renders AlertMapIsland client component

2. src/app/alert/[id]/AlertMapIsland.tsx — 'use client' component:
   - Dynamically import Leaflet with: const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false })
   - Same for TileLayer, Marker, Popup
   - Center on last_seen_coords if available, else Nigeria centroid [9.082, 8.6753]
   - Red marker pin at last_seen_coords with popup showing person_name
   - OpenStreetMap tiles (free, no API key)
   - Height: 300px, rounded corners

3. src/app/alert/[id]/CopyButton.tsx — 'use client' component:
   - Copy button that copies case_id to navigator.clipboard
   - Shows "Copied!" feedback for 2 seconds after click

Design same as home page — dark theme, mobile-first, emoji icons.
```

---

#### PROMPT 5: Report wizard (4-step form)

```
Now build the 4-step report wizard at /report.

1. src/app/report/page.tsx — Report page ('use client'):
   - Multi-step wizard with progress bar at top (Step 1 of 4, Step 2 of 4, etc.)
   - Form state managed with useState/useReducer for ReportFormData
   - Previous/Next navigation between steps
   - On final submit: POST /api/reports or queue offline if disconnected

2. src/components/ReportWizard.tsx — Wizard shell:
   - Progress bar: 4 segments, active step highlighted in red, completed in green
   - Back/Next buttons at bottom
   - Step indicator text

3. src/components/Step1What.tsx — Step 1: What happened?
   - h2: "What do you need to report?" (i18n key: step1_title)
   - Radio group with 3 large touch-friendly options (each min 56px tall):
     - 👤 "A person is missing" (value: 'missing')
     - 🚨 "I witnessed a kidnapping" (value: 'abduction')
     - 👁 "I saw someone from an alert" (value: 'sighting')
   - If 'abduction' selected: yellow safety banner: "Are you safe? If in immediate danger, call 112 first." (i18n: safety_warning)

4. src/components/Step2Who.tsx — Step 2: About the person:
   - Text input: Full name (required, i18n: person_name)
   - Number input: Age 0-120 (i18n: age)
   - Select: Gender — Male/Female/Unknown (i18n: gender)
   - Textarea: What were they wearing? Any features? (i18n: clothing)
   - File input: Photo upload, max 5MB, accept="image/*". Show preview thumbnail. Hint text: "Any photo helps" (i18n: photo_hint)
   - Validate: name is required, age must be 0-120 if provided

5. src/components/Step3Where.tsx — Step 3: Location and time:
   - Text input: Where were they last seen? (required, i18n: location_placeholder)
   - Button: "📍 Use my current location" — calls navigator.geolocation, fills coordinates
   - LocationPicker component: Leaflet map, click to drop pin (ssr: false dynamic import)
   - DateTime input: When? (i18n: when_hint)
   - Textarea: Any other details (i18n: extra_details)
   - Validate: last_seen_location is required

6. src/components/LocationPicker.tsx — 'use client' with dynamic Leaflet import:
   - Map centered on Nigeria [9.082, 8.6753] zoom 6
   - Click to place draggable marker
   - Shows "Selected: lat, lng" below map
   - Height 250px

7. src/components/Step4Confirm.tsx — Step 4: Review & submit:
   - Review card showing all entered data: name, age, gender, description, location, time, photo preview
   - Text input: Your phone (optional). Hint: "We'll send you updates. You can skip this." (i18n: your_phone, phone_hint)
   - "Submit anonymously" ghost button
   - "Submit Report" primary red button
   - On submit: POST /api/reports with channel: 'pwa'

8. Success state (inline after submit):
   - ✅ Checkmark icon
   - h2: "Report submitted" (i18n: report_success)
   - Case ID badge with copy button (CaseIdBadge component)
   - "Share case ID" button
   - "Back to alerts" link to /

9. Offline queued state:
   - Cloud-off icon
   - h2: "Saved. Will send when you're back online." (i18n: report_queued)
   - Case ID badge showing "Pending..."

10. src/components/CaseIdBadge.tsx:
    - Monospace font, dark bg, copy to clipboard button
    - Props: caseId (string), showCopyButton (boolean)

Design: dark theme throughout. Form inputs: white text on #1a1a1a bg, 3px rounded, 12px padding, focus ring red. Touch targets 44px+. Validation errors in red below fields.
```

---

#### PROMPT 6: Hooks (SSE, offline queue, geolocation, push)

```
Now create the 4 custom hooks:

1. src/hooks/useAlertFeed.ts:
   - Uses SWR for GET /api/alerts/active (key: ['alerts', lat, lng])
   - Opens EventSource to /events on mount
   - On SSE 'new_alert' event: SWR mutate() to prepend to cache, navigator.vibrate(200)
   - On SSE 'case_update' event: SWR mutate() to update the specific alert
   - SSE reconnect with exponential backoff (1s, 2s, 4s, 8s, max 30s)
   - Caches last 10 alerts to IndexedDB on each update (key: 'cached-alerts')
   - Returns: { alerts, isLoading, isError, isOffline, mutate }

2. src/hooks/useOfflineQueue.ts:
   - On mount: listens for 'online' event, triggers retryAll()
   - submitReport(data): tries POST /api/reports. If succeeds, returns { case_id }. If fails (network error), adds to IndexedDB queue, returns { queued: true }
   - retryAll(): processes queue sequentially. On success: remove from queue. On 4xx: remove (won't retry). On network error: keep in queue.
   - Returns: { submitReport, isPending, queueLength, retryAll }

3. src/hooks/useGeolocation.ts:
   - requestLocation(): calls navigator.geolocation.getCurrentPosition with timeout 10s
   - Permission handling: if denied, set error state
   - Returns: { lat, lng, loading, error, requestLocation }

4. src/hooks/usePushSubscription.ts:
   - Checks Notification.permission and existing subscription on mount
   - subscribe(): requests permission, creates push subscription, POSTs to /api/subscribe with push_token
   - unsubscribe(): deletes subscription, DELETEs /api/subscribe
   - Returns: { isSubscribed, subscribe, unsubscribe, isSupported }

All hooks in strict TypeScript. Handle loading, error, and edge cases.
```

---

#### PROMPT 7: Sightings + Subscribe pages

```
Build the remaining two pages:

1. src/app/sighting/[id]/page.tsx — Quick sighting form:
   - Pre-fills case_id from URL params
   - Textarea: "What did you see? Where? When?" (required)
   - Text input: Your phone (optional)
   - Submit button: POST /api/sightings
   - On success: show confirmation with green checkmark
   - On 404: "Case not found" error state
   - Back link to /alert/{id}

2. src/app/subscribe/page.tsx — Subscription page:
   - h1: "Stay informed about missing persons in your area"
   - Select dropdown: State (Kano, Kaduna, Lagos, FCT, etc.)
   - Select dropdown: LGA (filtered by state selection)
   - Button: "📍 Use my location" for GPS coordinates
   - Text input: Phone number (required, sent as X-RAVENCRY-Phone header)
   - Toggle: "Also send alerts via WhatsApp" (whatsapp_opted_in)
   - Button: "Enable Push Notifications" (calls push subscribe)
   - Submit button: POST /api/subscribe
   - On success: "You're subscribed! You'll receive alerts for {LGA}, {State}."
   - On 204 unsubscribe: confirmation message

Design: same dark theme, mobile-first. Both pages 'use client'.
```

---

#### PROMPT 8: i18n translation files

```
Create the i18n translation JSON files:

1. public/locales/en/common.json — ALL English UI strings from Section 9 of the spec document
2. public/locales/ha/common.json — ALL Hausa UI strings from Section 9 of the spec document

Each file must have these keys: app_name, tagline, report_cta, flash_alert, priority_alert, last_seen, report_sighting, call_emergency, case_id, submit_anonymous, offline_notice, report_queued, no_alerts, whatsapp_fallback, ussd_fallback, report_success, share_case_id, back_to_alerts, safety_warning, step1_title, step2_title, step3_title, step4_title, what_happened, missing_option, abduction_option, sighting_option, person_name, age, gender, clothing, photo_upload, photo_hint, location_placeholder, use_my_location, when_hint, extra_details, your_phone, phone_hint, submit_report, person_found, copy, share, loading, error_generic, retry, offline_banner
```

---

### Tips for v0.dev

- **One prompt at a time.** Don't chain multiple prompts before the previous one completes.
- **Check each output.** v0.dev sometimes generates subtly broken code. Look for:
  - Missing `'use client'` directives on components using browser APIs
  - Leaflet components NOT wrapped in `dynamic(() => import(...), { ssr: false })`
  - Hardcoded API URLs instead of using `process.env.NEXT_PUBLIC_API_URL`
  - Importing from non-existent files
- **Request fixes inline.** If something looks wrong, say "Fix the AlertCard component: the photo should use a regular <img> tag not next/Image since these are pre-signed S3 URLs."
- **Export when done.** v0.dev has an export/download feature — use it to get the ZIP, then extract into `apps/web/`.

---

### v0.dev Session Checklist — How to Know Each Prompt is Complete

> Work through this checklist as you go. Check off each item per prompt before moving to the next. v0.dev won't tell you it's "done" — you need to verify.

---

#### ✅ PROMPT 1: Project scaffold + types + config

- [ ] v0.dev generated `package.json` — verify it has these deps: `next`, `react`, `react-dom`, `typescript`, `tailwindcss`, `next-pwa`, `swr`, `i18next`, `react-i18next`, `idb`, `leaflet`, `react-leaflet`, `web-push`, `@types/leaflet`
- [ ] `tsconfig.json` exists with `"strict": true`
- [ ] `next.config.js` has `withPWA(...)` wrapping the config with runtime caching rules
- [ ] `tailwind.config.ts` includes the dark color palette (`#0a0a0a`, `#1a1a1a`, `#fafafa`, `#dc2626`, `#f59e0b`)
- [ ] `public/manifest.json` exists with:
  - `"name": "RAVENCRY — Nigeria Alert System"`
  - `"short_name": "RAVENCRY"`
  - `"theme_color": "#dc2626"`
  - `"display": "standalone"`
  - Two icon entries (192x192, 512x512)
- [ ] `src/types/index.ts` exists with ALL types from Section 4: `AlertCard`, `ActiveAlertsResponse`, `CaseDetailResponse`, `ReportResponse`, `SightingResponse`, `ReportFormData`, all enums
- [ ] `src/app/layout.tsx` has: metadata export, manifest link, viewport meta, `<I18nextProvider>`, dark background class
- [ ] `src/app/globals.css` has `@tailwind base/components/utilities` and `body { background: #0a0a0a; color: #fafafa; }`

**Fix any issues before proceeding.** Red flags: missing `next-pwa`, no manifest, incomplete types.

---

#### ✅ PROMPT 2: API client + lib files

- [ ] `src/lib/api.ts` has these exported functions: `getActiveAlerts`, `getCaseDetail`, `submitReport`, `submitSighting`, `subscribeToAlerts`, `unsubscribeFromAlerts`
- [ ] All functions use `process.env.NEXT_PUBLIC_API_URL` (NOT a hardcoded string) as the base URL
- [ ] Error handling: non-ok responses parse the `ApiError` format `{ error, code, details? }` and throw
- [ ] All functions have proper TypeScript return types (no `any`)
- [ ] `src/lib/i18n.ts` initializes i18next with EN + HA and browser language detection
- [ ] `src/lib/offline-queue.ts` uses `idb` library with CRUD queue operations
- [ ] `src/lib/push.ts` reads `NEXT_PUBLIC_VAPID_KEY` from env

**Fix any issues before proceeding.** Red flags: hardcoded API URLs, `any` return types, missing error handling.

---

#### ✅ PROMPT 3: Home page + AlertFeed + AlertCard

- [ ] `src/app/page.tsx` has the `'use client'` directive at the top
- [ ] Imports and renders `AlertFeed`
- [ ] Has a red CTA button linking to `/report`
- [ ] Has footer with fallback channels (WhatsApp, USSD, SMS)
- [ ] `src/components/AlertFeed.tsx` uses SWR with key `['alerts', lat, lng]`
- [ ] Opens EventSource to `/events` (uses `NEXT_PUBLIC_API_URL` to construct the URL)
- [ ] SSE reconnect with exponential backoff (not just one retry)
- [ ] Haaptic feedback: `navigator.vibrate(200)` on new alert
- [ ] Empty state: "No active alerts in your area. Stay safe. 🙏"
- [ ] Loading state: 3 skeleton cards with `animate-pulse`
- [ ] Error state: uses `ErrorState` component
- [ ] `src/components/AlertCard.tsx` shows: photo/placeholder, name, age, gender, location, tier badge, sightings count
- [ ] Click navigates to `/alert/{case_id}` (use `next/navigation` useRouter, not window.location)
- [ ] "Report Sighting" button links to `/sighting/{case_id}`
- [ ] `src/components/AlertBadge.tsx`: FLASH = red bg `#dc2626`, PRIORITY = amber bg `#f59e0b`
- [ ] `src/components/LanguageSelector.tsx` toggles between EN/HA using `i18next.changeLanguage()`
- [ ] `src/components/OfflineBanner.tsx` uses `navigator.onLine` and `window.addEventListener('online'/'offline')`
- [ ] `src/components/LoadingSpinner.tsx` and `ErrorState.tsx` exist

**Fix any issues before proceeding.** Red flags: no `'use client'`, missing SSE, Leaflet imported directly without dynamic(), hardcoded URLs.

---

#### ✅ PROMPT 4: Alert detail page (RSC + client map island)

- [ ] `src/app/alert/[id]/page.tsx` is an `async` function (Server Component — NO `'use client'`)
- [ ] Has `generateMetadata()` that fetches API server-side for og:image/title/description
- [ ] Fetches case detail with `next: { revalidate: 60 }`
- [ ] Calls `notFound()` when API returns null/404
- [ ] Server-renders content: photo, name, age, gender, location, time, case ID
- [ ] Case ID + `CopyButton` rendered together
- [ ] Resolved state: green banner "✅ This person has been found."
- [ ] Active state: red "🚨 REPORT A SIGHTING" CTA + "📞 Call 112" button
- [ ] Map wrapped in `<Suspense fallback={<animated placeholder>}>`
- [ ] `src/app/alert/[id]/AlertMapIsland.tsx` has `'use client'` directive
- [ ] Leaflet dynamically imported: `const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false })`
- [ ] Same dynamic import for `TileLayer`, `Marker`, `Popup`
- [ ] Map has OpenStreetMap tile URL (free, no API key): `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`
- [ ] Red marker at coordinates with popup showing `person_name`
- [ ] `src/app/alert/[id]/CopyButton.tsx` has `'use client'`, uses `navigator.clipboard.writeText()`, shows "Copied!" feedback

**Fix any issues before proceeding.** Red flags: `'use client'` on the page.tsx (should be RSC), Leaflet imported statically (SSR will crash), missing `generateMetadata`.

---

#### ✅ PROMPT 5: Report wizard (4-step form)

- [ ] `src/app/report/page.tsx` has `'use client'`
- [ ] Progress bar shows 4 segments (active = red, completed = green, pending = gray)
- [ ] Step 1: radio group with 3 options (missing/abduction/sighting), safety banner when abduction selected
- [ ] Step 2: name (required, validated), age (0–120), gender select, clothing textarea, photo upload with 5MB limit and preview
- [ ] Step 3: location (required, validated), GPS button, LocationPicker map, datetime input, extra details textarea
- [ ] Step 4: review card showing ALL entered data, phone input (optional), anonymous submit, primary submit button
- [ ] Form validation: required fields show red error messages, can't proceed to next step if current step invalid
- [ ] On submit: calls `POST /api/reports` with `channel: 'pwa'`
- [ ] On success: shows checkmark, case ID with CaseIdBadge, share button, back link
- [ ] On offline: shows cloud-off icon, "Saved. Will send when you're online", pending badge
- [ ] `src/components/LocationPicker.tsx` has `'use client'` and dynamic Leaflet import
- [ ] Map: Nigeria center [9.082, 8.6753] zoom 6, click to drop marker, shows coordinates below
- [ ] `src/components/CaseIdBadge.tsx`: monospace font, dark bg, copy button

**Fix any issues before proceeding.** Red flags: no form validation, missing offline handling, Leaflet in LocationPicker not dynamically imported, can't navigate between steps.

---

#### ✅ PROMPT 6: Hooks

- [ ] `src/hooks/useAlertFeed.ts`:
  - Uses SWR `useSWR(['alerts', lat, lng], ...)` 
  - EventSource to `/events` with reactive state
  - SSE `new_alert` → `mutate()` + `navigator.vibrate(200)`
  - SSE reconnect with exponential backoff (capped at 30s)
  - IndexedDB cache of last 10 alerts
  - Returns `{ alerts, isLoading, isError, isOffline, mutate }`
- [ ] `src/hooks/useOfflineQueue.ts`:
  - `submitReport(data)` tries POST, falls back to IndexedDB queue on network error
  - `retryAll()` processes queue on `window.addEventListener('online', ...)`
  - 4xx errors remove from queue (don't retry), network errors keep in queue
  - Returns `{ submitReport, isPending, queueLength, retryAll }`
- [ ] `src/hooks/useGeolocation.ts`:
  - Calls `navigator.geolocation.getCurrentPosition` with 10s timeout
  - Handles permission denied gracefully
  - Returns `{ lat, lng, loading, error, requestLocation }`
- [ ] `src/hooks/usePushSubscription.ts`:
  - Checks `Notification.permission` on mount
  - `subscribe()` uses `serviceWorker.ready.pushManager.subscribe` with VAPID key
  - `unsubscribe()` calls `.unsubscribe()` on the push subscription
  - Returns `{ isSubscribed, subscribe, unsubscribe, isSupported }`

**Fix any issues before proceeding.** Red flags: hooks that don't handle cleanup (EventSource not closed, event listeners not removed on unmount), missing error states.

---

#### ✅ PROMPT 7: Sightings + Subscribe pages

- [ ] `src/app/sighting/[id]/page.tsx`:
  - `'use client'`
  - case_id pre-filled from URL params (not editable)
  - Description textarea (required, validated)
  - Optional phone input
  - POST to `/api/sightings` on submit
  - Success confirmation screen
  - 404 handling if case not found
- [ ] `src/app/subscribe/page.tsx`:
  - `'use client'`
  - State dropdown with Nigerian states
  - LGA dropdown filtered by state selection
  - GPS button for coordinates
  - Phone input (required, sent as `X-RAVENCRY-Phone` header)
  - WhatsApp opt-in toggle
  - Push notification subscribe button
  - POST to `/api/subscribe` on submit
  - Success/error feedback

**Fix any issues before proceeding.** Red flags: missing `'use client'`, raw phone stored (should be sent as header not body), no validation.

---

#### ✅ PROMPT 8: i18n translation files

- [ ] `public/locales/en/common.json` exists with ALL ~45 keys
- [ ] `public/locales/ha/common.json` exists with ALL ~45 keys (Hausa translations)
- [ ] Every key in `en/common.json` has a corresponding key in `ha/common.json`
- [ ] No keys are missing or untranslated (no English fallback text in the Hausa file)

**Fix any issues before proceeding.** Red flags: missing keys in Hausa file, placeholder text in Hausa ("TODO" or English strings).

---

### After All Prompts: Integration Check

Before exporting from v0.dev, do a quick cross-file sanity check:

- [ ] All component imports resolve (no `import X from './Y'` where `Y.tsx` doesn't exist)
- [ ] No hardcoded `http://localhost:3003` except in `NEXT_PUBLIC_API_URL` fallback
- [ ] All Leaflet usage is behind `dynamic(() => import(...), { ssr: false })`
- [ ] All `'use client'` directives are on components using: `useState`, `useEffect`, `navigator`, `window`, `EventSource`, Leaflet, SWR hooks
- [ ] No `'use client'` on: `layout.tsx` (except LanguageSelector which is its own client island), `alert/[id]/page.tsx` (RSC)
- [ ] `next.config.js` has `withPWA(...)` as the default export (not just the config object)
- [ ] `vercel.json` references correct env var names: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_VAPID_KEY`
- [ ] All forms handle: loading state, validation errors, success state, network error, offline fallback
- [ ] No unused imports, no `any` types except where absolutely necessary

**Done? Export ZIP from v0.dev → extract into `apps/web/` → `npm install` → `npm run dev`**

---

## ARCHITECTURAL VALIDATION (June 2026)

> This section justifies every major architectural decision against current Next.js 16.2 recommendations. The project has a specific constraint that changes the calculus for nearly every choice: **the backend is NOT Next.js — it's a separate, multi-tenant Express API running on EC2, serving 5+ clients (PWA, Telegram bot, WhatsApp bot, USSD handler, SMS service).** This makes RAVENCRY fundamentally different from a typical "Next.js full-stack" app where the backend and frontend are co-located.

---

### Decision 1: SWR for Data Fetching (NOT Server Components for primary data)

**Why SWR was chosen:**
- The alert feed needs real-time SSE updates. SWR's `mutate()` integrates cleanly with SSE event handlers — push new data into the cache without a refetch.
- The API is external (Express on EC2), not a co-located database. Server Components fetching from an external API at request time would add 150–300ms of cold-start latency per page load for users in Nigeria hitting a Vercel deployment (likely `iad1` or `cdg1` region).
- SWR's `revalidateOnFocus` is valuable: users in Nigeria switch between WhatsApp and the PWA — the feed refreshes automatically when they return.

**Comparison with alternatives (Next.js 16.2):**

| Approach | Bundle | Real-time | Offline Cache | External API | Verdict |
|----------|--------|-----------|---------------|--------------|---------|
| **SWR (current)** | ~4KB gzip | ✅ mutate() + SSE | ✅ StaleWhileRevalidate | ✅ Native fetch | **Correct for this use case** |
| RSC `fetch()` | 0KB client JS | ❌ No reactive updates | ❌ Server-only | ✅ Works but adds hop | Good for SEO pages only |
| TanStack Query | ~12KB gzip | ✅ Invalidation | ✅ Offline mutations | ✅ Native fetch | Overkill for hackathon, 3× bundle |
| RSC + SWR hybrid | ~4KB gzip | ✅ Best of both | ✅ | ✅ | **Recommended enhancement** |

**Verdict: Keep SWR. Add RSC for alert detail pages (SEO/og:image).**

The hybrid approach is the modern sweet spot:
- **Alert detail pages (`/alert/[id]`)**: RSC with `fetch()` from the Express API on the server. This gives instant og:image tags for WhatsApp link previews and fast FCP. Cache with `"use cache"` for 60s.
- **Alert feed (home page)**: SWR in a Client Component. SSE for live updates, SWR for stale-while-revalidate fallback.
- **Report form**: SWR is irrelevant here — it's a mutation, not a query.

---

### Decision 2: REST API Wrappers (NOT Server Actions)

**Why REST was chosen:**
The Express API (`services/api/`) is the single source of truth for all data mutations. It serves:

| Client | Protocol | Needs API? |
|--------|----------|------------|
| Next.js PWA | REST/SSE | ✅ `POST /api/reports` |
| Telegram bot | Webhook → n8n → Express | ✅ `POST /api/reports` (channel: telegram) |
| WhatsApp bot | Meta webhook → n8n → Express | ✅ `POST /api/reports` (channel: whatsapp) |
| USSD handler | AT webhook → Express | ✅ Direct DB write |
| SMS handler | AT webhook → Express | ✅ Direct DB write |
| n8n workflows | Internal webhooks | ✅ Multiple endpoints |

**Why Server Actions DON'T work here:**

Server Actions run on the Next.js server. If we used them, every mutation would be:

```
PWA → Server Action (Vercel) → fetch() → Express API (EC2) → Aurora
```

That adds an unnecessary Vercel→EC2 hop, doubles latency (especially Nigeria→Vercel→EC2), and creates a second place where auth/validation must be maintained. The Express API already has rate limiting, input validation, error formatting (NFR-012), and service-to-service auth — duplicating any of that in Server Actions violates DRY.

**Server Actions are the right choice when the database is directly accessible from the Next.js server** (e.g., `import { db } from '@/lib/db'` in a Server Component). That's not this architecture.

**Verdict: Keep REST wrappers. This is the correct pattern for a separate-backend architecture.**

---

### Decision 3: Shared TypeScript Package (NOT Zod-first or OpenAPI generation)

**Why a shared package was chosen:**
`packages/shared/src/types.ts` already exists in the monorepo. It provides a single `Case`, `AlertCard`, `CreateReportRequest` etc. used by the API service, LLM service, Telegram service, and PWA.

**Analysis:**

| Approach | Type Safety | Runtime Validation | Duplication Risk | Effort |
|----------|-------------|-------------------|------------------|--------|
| **Shared package (current)** | ✅ Compile-time | ❌ No runtime | Medium (manual sync) | Low |
| Zod schemas | ✅ Compile + runtime | ✅ `.parse()` | None (single source) | Medium |
| OpenAPI generation | ✅ Generated | ✅ Auto | None | High setup |
| Drizzle types | ✅ DB-synced | ✅ DB constraints | None (DB is source) | Requires Drizzle migration |

**Verdict: Keep shared package for hackathon. Add Zod as post-hackathon enhancement.**

For the hackathon, the shared types are fine — 3 services use them and they don't drift in a weekend. Post-hackathon, the smart move is:
1. Define Zod schemas in `packages/shared/src/schemas.ts`
2. Export `type Case = z.infer<typeof CaseSchema>` (types derived from schemas)
3. Use `.parse()` in the Express API routes for runtime validation (replaces manual `if (!body.person_name) throw...`)
4. The PWA gets both the types AND can use the same schemas for form validation

This would be ~2 hours of work post-hackathon and eliminates the validation drift risk entirely.

---

### Decision 4: Custom IndexedDB Queue (NOT Workbox Background Sync)

**Why a custom queue was chosen:**
Offline reporting is a **core requirement**, not a nice-to-have. Northern Nigeria has intermittent 2G/3G connectivity. A mother reporting a missing child cannot be told "try again when you have internet."

**Analysis:**

| Approach | Bundle Cost | Control | Conflict Resolution | Complexity |
|----------|-------------|---------|---------------------|------------|
| **Custom idb queue (current)** | idb ~2KB | Full | Manual (timestamp ordering) | Medium |
| Workbox Background Sync | In next-pwa (~15KB already) | Limited (auto-retry only) | ❌ None | Low (plugin config) |
| TanStack Query `persistQueryClient` | +8KB (on top of ~12KB) | High | ❌ Query, not mutation | Medium |

The custom queue has specific needs that Workbox can't handle:
1. **Queue visibility**: The PWA shows "1 report pending, will send when online" — Workbox BGS is invisible to the user.
2. **Retry feedback**: If a report fails after 3 retries, the user should be notified and given options (edit + retry, or delete). Workbox BGS silently drops.
3. **Multi-step form**: The report is a 4-step wizard — the queued item includes form step state so the user can resume editing.
4. **Case ID allocation**: The PWA shows a provisional "Pending..." badge until the report syncs and gets a real `NR-YYYY-NNNNNN` case ID.

**Verdict: Keep custom queue. Workbox Background Sync is not expressive enough for this UX.**

The idb library is ~2KB. The queue logic is ~80 lines. This is not premature optimization — it's the minimum viable implementation for the required UX.

---

### Decision 5: i18next (NOT next-intl or Paraglide)

**Why i18next was chosen:**
Translations are static JSON (EN + HA). No localized routes (`/ha/alert/...`). The language is toggled client-side and persisted in localStorage.

**Analysis:**

| Approach | Bundle | App Router Support | Maturity | Static Translations |
|----------|--------|-------------------|----------|---------------------|
| **i18next (current)** | ~7KB | Manual setup | 10+ years | ✅ JSON files |
| next-intl | ~5KB | First-class (RSC, middleware) | 3+ years | ✅ JSON/ICU |
| Paraglide (inlang) | ~2KB | Compile-time, tree-shakeable | 1+ year | ✅ Messages |

next-intl is genuinely better for App Router — it has Server Component async APIs, middleware-based locale detection, and ICU message format. But switching costs ~2 hours and the benefit for a 2-language, client-toggled, no-localized-routes app is marginal.

Paraglide is interesting (smallest bundle, compile-time) but too new for a hackathon with a Hausa-language requirement.

**Verdict: Keep i18next for hackathon. Evaluate next-intl post-hackathon if localized routes are added (V2).**

---

### Decision 6: Rendering Strategy (Client-heavy vs. RSC-hybrid)

**Current approach:** Almost entirely Client Components (SWR data fetching, SSE connection, Leaflet map, form state).

**What Next.js 16.2 offers:**
- **`"use cache"` directive**: Cache server fetches with revalidation tags
- **Streaming + Suspense**: Shell → content pattern for fast FCP
- **Partial Prerendering**: Static shell + dynamic holes (now in base platform model)
- **Turbopack**: Default in Next.js 16, faster dev builds

**Recommendation for v0.dev: Use a hybrid strategy.**

| Page | Strategy | Why |
|------|----------|-----|
| `/` (Home) | Client Component | SSE connection + SWR; must be interactive |
| `/alert/[id]` | **RSC page + Client map island** | SEO critical (WhatsApp og:image); map is the only client piece |
| `/report` | Client Component | Multi-step form state; offline queue integration |
| `/subscribe` | Client Component | Browser GPS permission; push subscription |
| `/layout.tsx` | **RSC shell** | Static header, LanguageSelector is the only client island |

**For the alert detail page specifically**, this is the pattern to use:

```tsx
// app/alert/[id]/page.tsx — RSC (async Server Component)
import { Suspense } from 'react';
import AlertMap from './AlertMap'; // Client Component with dynamic Leaflet import

export default async function AlertPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const alert = await fetch(`${API_URL}/api/cases/${id}`).then(r => r.json());
  
  return (
    <div>
      <h1>{alert.person_name}</h1>
      {/* ...other server-rendered content... */}
      <Suspense fallback={<div className="h-64 bg-gray-800 animate-pulse" />}>
        <AlertMap coords={alert.coordinates} />
      </Suspense>
    </div>
  );
}
```

This gives: instant og:image (rendered server-side), fast FCP (no client JS needed for content), and the map streams in as a client island.

**Verdict: Adopt hybrid RSC + Client. The v0_context file below reflects this updated strategy.**

---

### Decision 7: next-pwa (NOT `@serwist/next` or manual Workbox)

**Why next-pwa was chosen:**
It's the most battle-tested PWA plugin for Next.js with ~14K GitHub stars. `@serwist/next` is newer (2024+) and has better TypeScript support but fewer production references.

**Verdict: Keep next-pwa. It works. The PWA requirements (manifest, offline caching) are standard and next-pwa handles them.**

---

### Summary: What Changed vs. Original Design

| Decision | Original | After Validation | Reason |
|----------|----------|-----------------|--------|
| Data fetching | SWR everywhere | SWR + RSC for detail pages | Better SEO, og:image for WhatsApp |
| Mutations | REST wrappers | REST wrappers | **No change** — Server Actions don't work with external API |
| Types | Shared package | Shared package (add Zod post-hackathon) | **No change** for hackathon |
| Offline queue | Custom idb | Custom idb | **No change** — Workbox BGS too limited for UX |
| i18n | i18next | i18next | **No change** — next-intl marginal for 2-language app |
| Rendering | Mostly Client | Hybrid RSC + Client islands | Modern pattern, better perf, still compatible |
| PWA | next-pwa | next-pwa | **No change** — still the standard |

**Bottom line:** The original design is architecturally sound. Only 2 adjustments: (1) use RSC for alert detail pages to improve SEO/WhatsApp previews, and (2) use a hybrid RSC+Client approach for layouts. Everything else was already correct for this project's constraints.

---

## 1. PROJECT OVERVIEW

RAVENCRY is a real-time alert system for missing persons and kidnapping in Nigeria. Citizens submit reports via WhatsApp, USSD, SMS, Telegram, and the web PWA. AI (Qwen) extracts structured data and classifies severity (FLASH/PRIORITY/ROUTINE). Operators approve alerts for multi-channel broadcast.

The **PWA is the public face** — citizens view active alerts, submit reports, and submit sightings. It must work on basic Android devices with 2G/3G connections in northern Nigeria.

**Design principle:** As simple as a messaging app. If a mother in Maiduguri with a basic Android and 2G can report her missing child in under 2 minutes, we have succeeded.

---

## 2. TECH STACK

```
Next.js 14 (App Router)   — framework
TypeScript                — strict mode
Tailwind CSS              — utility-first, no component library (keep bundle small)
next-pwa                  — Workbox-based service worker
Leaflet.js + react-leaflet — maps (FREE, no API key needed)
SWR                       — data fetching + cache
i18next + react-i18next   — multilingual UI
idb                       — IndexedDB wrapper for offline cache
web-push                  — push notification subscription
```

**No component library** (no shadcn/ui, no MUI, no Chakra). Keep the bundle small. Tailwind only.

---

## 3. API CONTRACT

The backend runs at `NEXT_PUBLIC_API_URL` (default: `http://localhost:3003` for local dev, `https://api.ravencry.cv` in production).

### Public Endpoints (No Auth)

#### `GET /api/health`
```json
// 200
{ "status": "ok"|"degraded", "uptime_seconds": 3600, "services": {...}, "timestamp": "..." }
```

#### `GET /api/alerts/active?lat=6.5244&lng=3.3792&radius_km=160&limit=10`
Returns active FLASH and PRIORITY alerts. Optional geofence via PostGIS.

```ts
// 200
interface ActiveAlertsResponse {
  alerts: AlertCard[];
  total: number;
  geofenced: boolean;  // true if lat/lng was provided and geofence was applied
}

interface AlertCard {
  case_id: string;           // "NR-2026-000001"
  person_name: string;       // "Fatima Bello"
  age_estimate: number | null; // 7
  gender: string;            // "female" | "male" | "unknown"
  last_seen_location: string; // "Sabon Gari Market, Kano"
  last_seen_time: string | null; // ISO 8601
  alert_tier: "FLASH" | "PRIORITY";
  photo_url: string | null;  // pre-signed S3 URL, 1hr expiry
  sightings_count: number;   // count of citizen sightings
}
```

#### `GET /api/cases/:id`
Returns public-safe case detail. ID format: `NR-YYYY-NNNNNN`.

```ts
// 200
interface CaseDetailResponse {
  case_id: string;
  person_name: string;
  age_estimate: number | null;
  gender: string;
  last_seen_location: string | null;
  last_seen_time: string | null;
  photo_url: string | null;
  status: CaseStatus;
  alert_tier: AlertTier | null;
  circumstance: Circumstance;
  sightings_count: number;
  created_at: string;
}
// 404: { "error": "not_found", "code": "ERR_NOT_FOUND" }
```

#### `POST /api/reports`
Submit a missing person report. Rate limit: 3 per 15min per IP.

```ts
// Request body
interface CreateReportRequest {
  channel: "pwa";         // always "pwa" from the web app
  reporter_phone?: string; // optional
  person_name: string;     // REQUIRED
  age?: number;
  gender?: "male" | "female" | "unknown";
  last_seen_location: string; // REQUIRED
  last_seen_time?: string;    // ISO 8601
  description?: string;
  media_urls?: string[];
}

// 202
{ "case_id": "NR-2026-000042", "status": "received", "eta_seconds": 30 }
// 400: { "error": "missing_required_fields", "code": "ERR_BAD_REQUEST", "details": ["person_name"] }
```

#### `POST /api/sightings`
Submit a sighting tip for an active case.

```ts
// Request body
interface CreateSightingRequest {
  case_id: string;         // REQUIRED
  description: string;     // REQUIRED
  sighting_location?: string;
  sighting_time?: string;
  reporter_phone?: string;
  photo_url?: string;
}

// 202
{ "sighting_id": "uuid", "status": "received" }
// 404: { "error": "case_not_found", "code": "ERR_NOT_FOUND" }
```

#### `POST /api/subscribe` & `DELETE /api/subscribe`
Subscribe/unsubscribe to alerts. Requires `X-RAVENCRY-Phone` header.

```ts
// POST body
interface CreateSubscriberRequest {
  lga?: string;
  state?: string;
  coords?: { lat: number; lng: number };
  whatsapp?: boolean;
  push_token?: string;
}
// 201: { "subscriber_id": "uuid", "confirmation": "subscribed" }
// DELETE: 204 no content
```

#### `GET /events` (SSE)
Server-Sent Events stream for real-time alert updates.

```
Content-Type: text/event-stream

data: {"type":"initial","payload":{"client_id":"...","alerts":[]}}
data: {"type":"new_alert","payload":{"case_id":"...","person_name":"...","alert_tier":"FLASH",...}}
data: {"type":"case_update","payload":{"case_id":"...","status":"resolved"}}
data: {"type":"sighting","payload":{"case_id":"...","sighting_id":"..."}}
```

SSE event types: `initial`, `new_alert`, `case_update`, `sighting`.

### Error Format (All Endpoints)
```ts
{ "error": "machine_readable_snake_case", "code": "ERR_UPPER_CASE", "details?": any }
```

---

## 4. DATA MODELS (TypeScript — place in `src/types/index.ts`)

```ts
// ---- Enums ----
export type CaseStatus =
  | 'pending_triage' | 'in_triage' | 'pending_review'
  | 'active' | 'broadcast_complete' | 'cold' | 'resolved' | 'false_report';

export type AlertTier = 'FLASH' | 'PRIORITY' | 'ROUTINE';
export type Gender = 'male' | 'female' | 'unknown';
export type Circumstance = 'abduction' | 'missing' | 'witnessed_kidnapping' | 'unknown';
export type InputChannel = 'whatsapp' | 'telegram' | 'ussd' | 'sms' | 'pwa' | 'osint' | 'manual';
export type LanguageCode = 'en' | 'ha' | 'yo' | 'ig' | 'pcm' | 'mixed';
export type SSEEventType = 'initial' | 'new_alert' | 'case_update' | 'sighting';

// ---- API Response Types ----
export interface AlertCard {
  case_id: string;
  person_name: string;
  age_estimate: number | null;
  gender: string;
  last_seen_location: string;
  last_seen_time: string | null;
  alert_tier: AlertTier;
  photo_url: string | null;
  sightings_count: number;
}

export interface ActiveAlertsResponse {
  alerts: AlertCard[];
  total: number;
  geofenced: boolean;
}

export interface CaseDetailResponse {
  case_id: string;
  person_name: string;
  age_estimate: number | null;
  gender: string;
  last_seen_location: string | null;
  last_seen_time: string | null;
  photo_url: string | null;
  status: CaseStatus;
  alert_tier: AlertTier | null;
  circumstance: Circumstance;
  sightings_count: number;
  created_at: string;
}

export interface ReportResponse {
  case_id: string;
  status: 'received';
  eta_seconds: number;
}

export interface SightingResponse {
  sighting_id: string;
  status: 'received';
}

export interface SSEEvent {
  type: SSEEventType;
  payload: unknown;
}

export interface ApiError {
  error: string;
  code: string;
  details?: unknown;
}

// ---- Form Types ----
export interface ReportFormData {
  reportType: 'missing' | 'abduction' | 'sighting';
  person_name: string;
  age?: number;
  gender?: Gender;
  description: string;
  photo?: File;
  last_seen_location: string;
  last_seen_time?: string;
  extra?: string;
  reporter_phone?: string;
  anonymous: boolean;
  coordinates?: { lat: number; lng: number };
}
```

---

## 5. PAGE STRUCTURE (App Router Routes)

```
/                          Home page: alert feed + report CTA
/report                    Report form: 4-step wizard
/alert/[id]                Alert detail page (shareable, public)
/sighting/[id]             Quick sighting submission from an alert link
/subscribe                 LGA subscription opt-in
```

### `app/layout.tsx` — Root Layout
- Metadata: title "RAVENCRY — Nigeria Alert System", description, og:image
- PWA manifest link: `<link rel="manifest" href="/manifest.json" />`
- Theme color meta: `#dc2626` (red)
- Viewport meta: `width=device-width, initial-scale=1, viewport-fit=cover`
- Language provider (`I18nextProvider`)
- Wrap in `<OfflineBanner />` at top of body

### `app/page.tsx` — Home Page

```
┌─────────────────────────────┐
│  🇳🇬 RAVENCRY     [EN HA]   │  ← Header + LanguageSelector
├─────────────────────────────┤
│  🚨  FLASH ALERTS           │
│  ┌─────────────────────────┐│
│  │ [photo] Amina Musa      ││  ← AlertCard
│  │ Age 8 · Kano Central    ││
│  │ Last seen today 2pm     ││
│  │ [👁 Report Sighting]    ││
│  └─────────────────────────┘│
│  [+ 2 more alerts ▾]        │
├─────────────────────────────┤
│  ┌─────────────────────────┐│
│  │  [🔴 REPORT MISSING     ││  ← Primary CTA — full-width
│  │     PERSON]             ││
│  └─────────────────────────┘│
│  [📍 View map of alerts]    │
├─────────────────────────────┤
│  How to report without app: │
│  WhatsApp: +234...          │
│  USSD: *384#                │
│  SMS: REPORT to 20880       │
└─────────────────────────────┘
```

**Behavior:**
- On load: request geolocation → `GET /api/alerts/active?lat=&lng=` if granted, else `GET /api/alerts/active` for all FLASH/PRIORITY
- Subscribe to SSE `/events` for live updates
- On new alert via SSE: prepend card + `navigator.vibrate(200)` for haptic feedback
- Offline: show cached alerts from IndexedDB with yellow "Offline — showing cached alerts" notice
- Empty state: "No active alerts in your area. Stay safe. 🙏"
- Fallback channels at bottom: WhatsApp number, USSD code, SMS shortcode

### `app/report/page.tsx` — 4-Step Report Wizard

**Step 1 — What happened?**
- Radio group: "A person is missing" / "I witnessed a kidnapping" / "I saw someone from an alert"
- If "kidnapping" selected → safety banner: "Are you safe? If in immediate danger, call 112 first."

**Step 2 — About the person**
- Text input: Full name (required)
- Number input: Age (approx, 0–120)
- Select: Gender (Male/Female/Unknown)
- Textarea: What were they wearing? Any features?
- Photo upload: 5MB max, file input with preview. Hint: "Any photo helps — doesn't have to be recent"

**Step 3 — Where and when**
- Text input: Where were they last seen? (required, placeholder: "e.g. Kano Central Market, near ABC bank")
- Button: "📍 Use my current location" → browser GPS
- LocationPickerMap: Leaflet map, click to drop pin
- DateTime input: When? (approx is fine)
- Textarea: Any other details

**Step 4 — Confirm & submit**
- Review card showing all entered data
- Text input: Your phone (optional, hint: "We'll send you updates. You can skip this.")
- "Submit anonymously" ghost button
- "Submit Report" primary button

**On success:** Show checkmark, case ID badge with copy button, "Share this ID" button, "Back to alerts" link
**On offline:** Show cloud-off icon, "Saved. Will send when you're online." with pending badge

### `app/alert/[id]/page.tsx` — Alert Detail Page (RSC + Client Map Island)

**IMPORTANT: This page should be an async Server Component.** The Express API is called server-side for instant og:image rendering (critical for WhatsApp link previews). The Leaflet map is the only Client Component island, streamed in via Suspense.

```tsx
// app/alert/[id]/page.tsx — RSC (async Server Component)
import { Suspense } from 'react';
import { type CaseDetailResponse } from '@/types';
import AlertMapIsland from './AlertMapIsland'; // 'use client' — dynamic Leaflet import
import CopyButton from './CopyButton';         // 'use client' — clipboard API
import { notFound } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const alert: CaseDetailResponse = await fetch(`${API_URL}/api/cases/${id}`)
    .then(r => r.ok ? r.json() : null);
  
  if (!alert) return { title: 'Case Not Found — RAVENCRY' };
  
  return {
    title: `${alert.person_name} — ${alert.alert_tier} Alert — RAVENCRY`,
    description: `${alert.person_name}, age ${alert.age_estimate}, last seen ${alert.last_seen_location}. Case ${id}.`,
    openGraph: {
      images: alert.photo_url ? [{ url: alert.photo_url, width: 800, height: 600 }] : [],
    },
  };
}

export default async function AlertPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const alert: CaseDetailResponse = await fetch(`${API_URL}/api/cases/${id}`, {
    next: { revalidate: 60 }, // ISR: revalidate every 60s
  }).then(r => r.ok ? r.json() : null);

  if (!alert) notFound();

  const isResolved = alert.status === 'resolved';

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Back nav */}
      <nav className="p-4">
        <a href="/" className="text-gray-400">← Back</a>
        <span className="ml-3">
          {alert.alert_tier === 'FLASH' ? '🚨 FLASH ALERT' : alert.alert_tier === 'PRIORITY' ? '⚠️ PRIORITY' : ''}
        </span>
      </nav>

      {/* Photo — server-rendered for og:image */}
      {alert.photo_url && (
        <img src={alert.photo_url} alt={alert.person_name} className="w-full aspect-square object-cover" />
      )}

      {/* Details — server-rendered */}
      <div className="p-4 space-y-4">
        <h1 className="text-2xl font-bold">{alert.person_name}</h1>
        <p>Age: {alert.age_estimate} · {alert.gender}</p>
        <p>Last seen: {alert.last_seen_location || 'Unknown'}</p>
        {alert.last_seen_time && <p>Time: {new Date(alert.last_seen_time).toLocaleString()}</p>}
        
        {/* Case ID + copy */}
        <div className="flex items-center gap-3 font-mono text-sm bg-gray-900 p-3 rounded">
          <span>Case ID: {alert.case_id}</span>
          <CopyButton text={alert.case_id} />
        </div>

        {isResolved && (
          <div className="bg-green-900/50 p-4 rounded text-green-300">
            ✅ This person has been found. Thank you.
          </div>
        )}

        {!isResolved && (
          <>
            <a href={`/sighting/${alert.case_id}`} className="block w-full text-center bg-red-600 py-4 rounded font-bold">
              🚨 REPORT A SIGHTING
            </a>
            <a href="tel:112" className="block w-full text-center border border-red-600 py-4 rounded font-bold">
              📞 Call 112
            </a>
          </>
        )}
      </div>

      {/* Map — client island, streams in */}
      <Suspense fallback={<div className="h-64 bg-gray-800 animate-pulse m-4 rounded" />}>
        <AlertMapIsland lastSeenCoords={alert.last_seen_coords} lastSeenLocation={alert.last_seen_location} />
      </Suspense>
    </div>
  );
}
```

**Client islands (separate files):**
- `AlertMapIsland.tsx`: `'use client'` — dynamically imports Leaflet with `ssr: false`
- `CopyButton.tsx`: `'use client'` — uses `navigator.clipboard.writeText()`

**Key behaviors:**
- **Meta tags:** Rendered server-side via `generateMetadata()` — instant og:image for WhatsApp
- **Canonical URL:** Set in metadata
- **ISR:** `next: { revalidate: 60 }` means the page regenerates at most once per minute
- **Loading state:** The map Suspense fallback shows an animated placeholder
- **Resolved state:** If `status === 'resolved'`, the sighting CTA is replaced with a found message

### `app/sighting/[id]/page.tsx` — Quick Sighting Form
- Pre-filled case ID from URL param
- Textarea: description of what you saw
- Optional: photo, location, time
- Submit → POST /api/sightings → show confirmation

### `app/subscribe/page.tsx` — Subscription Page
- Select LGA/state dropdowns
- Optional GPS location
- Phone input (required, sent as `X-RAVENCRY-Phone` header)
- WhatsApp opt-in toggle
- Push notification opt-in (uses web-push)
- Submit → POST /api/subscribe

---

## 6. COMPONENT TREE

```
components/
  AlertFeed/
    AlertFeed.tsx          — SSE-connected list, SWR fallback, offline banner
    AlertCard.tsx          — Card: photo, name, age, LGA, tier badge, "Report Sighting" CTA
    AlertBadge.tsx         — 🚨 FLASH (red) / ⚠️ PRIORITY (amber) pill badge
  ReportForm/
    ReportForm.tsx         — 4-step wizard shell, progress bar, form state management
    Step1What.tsx          — Radio group: missing/abduction/sighting
    Step2Who.tsx           — Name, age, gender, description, photo upload
    Step3Where.tsx         — Location text, GPS button, LocationPicker map, datetime
    Step4Confirm.tsx       — Review card, phone input, submit buttons
    SuccessScreen.tsx      — Checkmark, case ID badge, share button
    OfflineQueuedScreen.tsx — Cloud-off icon, pending message
  Map/
    AlertMap.tsx           — Leaflet map with alert pins (dynamic import, SSR disabled)
    LocationPicker.tsx     — Click-to-pin map for report form
  UI/
    OfflineBanner.tsx      — Yellow bar "You're offline. Showing cached alerts."
    LanguageSelector.tsx   — EN / HA toggle buttons
    CaseIdBadge.tsx        — Monospace case ID with copy-to-clipboard button
    LoadingSpinner.tsx     — Centered spinner
    ErrorState.tsx         — Error icon + message + retry button
```

---

## 7. HOOKS

```
hooks/
  useAlertFeed.ts          — SSE connection + reconnect (exponential backoff, max 30s),
                             SWR fallback to GET /api/alerts/active,
                             offline reads from IndexedDB,
                             stores last 10 alerts to IndexedDB on each update
  useOfflineQueue.ts       — Queue failed POST /api/reports in IndexedDB,
                             retry on online event,
                             returns { queue, isPending, submitReport }
  useGeolocation.ts        — Browser navigator.geolocation with permission handling,
                             returns { lat, lng, error, loading, requestLocation }
  usePushSubscription.ts   — Web Push subscription via web-push,
                             VAPID key from env NEXT_PUBLIC_VAPID_KEY,
                             returns { subscribe, unsubscribe, isSubscribed }
```

---

## 8. LIBRARY FILES

```
lib/
  api.ts                   — Typed fetch wrappers for all backend endpoints
  i18n.ts                  — i18next config: EN + HA resources, language detection from browser
  offline-queue.ts         — IndexedDB queue helper: addToQueue, getQueue, clearQueue, retryAll
  push.ts                  — VAPID public key, subscribe/unsubscribe helpers
```

### `lib/api.ts` — API Client (Typed Fetch Wrappers)

```ts
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003';
// Or: 'https://api.ravencry.cv' in production

async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const error: ApiError = await res.json();
    throw new Error(error.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export function getActiveAlerts(lat?: number, lng?: number, radiusKm = 160, limit = 10) { ... }
export function getCaseDetail(caseId: string) { ... }
export function submitReport(data: CreateReportRequest) { ... }
export function submitSighting(data: CreateSightingRequest) { ... }
export function subscribeToAlerts(data: CreateSubscriberRequest, phoneHash: string) { ... }
export function unsubscribeFromAlerts(phoneHash: string) { ... }
```

---

## 9. i18n TRANSLATIONS

Only **English (en)** and **Hausa (ha)** for hackathon. Yoruba and Igbo are V2.

```json
// public/locales/en/common.json
{
  "app_name": "RAVENCRY",
  "tagline": "Nigeria's Missing Persons Alert Network",
  "report_cta": "Report Missing Person",
  "flash_alert": "FLASH ALERT",
  "priority_alert": "PRIORITY ALERT",
  "last_seen": "Last seen",
  "report_sighting": "Report Sighting",
  "call_emergency": "Call 112",
  "case_id": "Case ID",
  "submit_anonymous": "Submit anonymously",
  "offline_notice": "You're offline. Showing cached alerts.",
  "report_queued": "Saved. Will send when you're back online.",
  "no_alerts": "No active alerts in your area. Stay safe.",
  "whatsapp_fallback": "No app? Report via WhatsApp: {number}",
  "ussd_fallback": "Feature phone? Dial: *384#",
  "report_success": "Report submitted",
  "share_case_id": "Share case ID",
  "back_to_alerts": "Back to alerts",
  "safety_warning": "Are you safe? If in immediate danger, call 112 first.",
  "step1_title": "What do you need to report?",
  "step2_title": "About the person",
  "step3_title": "Where and when",
  "step4_title": "Confirm & submit",
  "what_happened": "What happened",
  "missing_option": "A person is missing",
  "abduction_option": "I witnessed a kidnapping",
  "sighting_option": "I saw someone from an alert",
  "person_name": "Full name",
  "age": "Age (approx)",
  "gender": "Gender",
  "clothing": "What were they wearing? Any features?",
  "photo_upload": "Recent photo",
  "photo_hint": "Any photo helps — doesn't have to be recent",
  "location_placeholder": "e.g. Kano Central Market, near ABC bank",
  "use_my_location": "Use my current location",
  "when_hint": "When? (approx is fine)",
  "extra_details": "Any other details",
  "your_phone": "Your phone (optional)",
  "phone_hint": "We'll send you updates. You can skip this.",
  "submit_report": "Submit Report",
  "person_found": "This person has been found. Thank you.",
  "copy": "Copy",
  "share": "Share",
  "loading": "Loading...",
  "error_generic": "Something went wrong. Please try again.",
  "retry": "Retry",
  "offline_banner": "You're offline. Showing cached alerts."
}
```

```json
// public/locales/ha/common.json
{
  "app_name": "RAVENCRY",
  "tagline": "Tsarin Fadakarwa na Mutanen da suka Bace a Najeriya",
  "report_cta": "Bayar da Rahoton Mutumin da ya Bace",
  "flash_alert": "SANARWA TA GAGGABA",
  "priority_alert": "SANARWA MAI MUHIMMANCI",
  "last_seen": "An gani ƙarshe",
  "report_sighting": "Bayar da Rahoton Gani",
  "call_emergency": "Kira 112",
  "case_id": "Lambar Shaida",
  "submit_anonymous": "Aika ba tare da suna ba",
  "offline_notice": "Ba ka da intanet. Ana nuna sanarwowin da aka ajiye.",
  "report_queued": "An ajiye. Za a aika idan intanet ya dawo.",
  "no_alerts": "Babu sanarwa a yankinku. Ku zauna lafiya.",
  "whatsapp_fallback": "Ba ka da app? Ka bayar da rahoto ta WhatsApp: {number}",
  "ussd_fallback": "Wayar da ba smartphone ba? Ka buga: *384#",
  "report_success": "An karɓi rahoto",
  "share_case_id": "Raba lambar shaida",
  "back_to_alerts": "Komawa ga sanarwowi",
  "safety_warning": "Kana cikin aminci? Idan kana cikin haɗari, fara kiran 112.",
  "step1_title": "Me kake son bayar da rahoto?",
  "step2_title": "Game da mutumin",
  "step3_title": "A ina da kuma yaushe",
  "step4_title": "Tabbatarwa & Aikawa",
  "what_happened": "Me ya faru",
  "missing_option": "Akwai mutumin da ya bace",
  "abduction_option": "Na ga yadda aka sace wani",
  "sighting_option": "Na ga wani daga sanarwa",
  "person_name": "Cikakken suna",
  "age": "Shekaru (kimanin)",
  "gender": "Jinsi",
  "clothing": "Me yake sanye? Wani alamarsa?",
  "photo_upload": "Hoto kwanannan",
  "photo_hint": "Duk wani hoto yana taimakawa",
  "location_placeholder": "misali Kasuwar Kano, kusa da bankin ABC",
  "use_my_location": "Yi amfani da inda nake",
  "when_hint": "Yaushe? (Kimanin lokaci ya isa)",
  "extra_details": "Wani ƙarin bayani",
  "your_phone": "Lambar wayarka (ba dole ba)",
  "phone_hint": "Za mu aika muku sabuntawa. Kuna iya tsallake wannan.",
  "submit_report": "Aika Rahoto",
  "person_found": "An sami wannan mutumin. Mun gode.",
  "copy": "Kwafa",
  "share": "Raba",
  "loading": "Ana ɗorawa...",
  "error_generic": "Wani abu ya lalace. Da fatan za a sake gwadawa.",
  "retry": "Sake gwadawa",
  "offline_banner": "Ba ka da intanet. Ana nuna sanarwowin da aka ajiye."
}
```

---

## 10. PWA CONFIGURATION

### `public/manifest.json`
```json
{
  "name": "RAVENCRY — Nigeria Alert System",
  "short_name": "RAVENCRY",
  "description": "Nigeria's real-time anti-kidnapping and missing persons alert network",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0a0a0a",
  "theme_color": "#dc2626",
  "orientation": "portrait",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ],
  "categories": ["utilities", "government", "social"],
  "lang": "en-NG"
}
```

### `next.config.js`
```js
/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https?:\/\/.*\/api\/alerts/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'alerts-cache',
        expiration: { maxAgeSeconds: 300 }
      }
    },
    {
      urlPattern: /\/_next\/image\?url/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'image-cache',
        expiration: { maxEntries: 50 }
      }
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'static-images',
        expiration: { maxEntries: 100, maxAgeSeconds: 86400 }
      }
    }
  ]
});

const nextConfig = {
  // Server Components are default in App Router — good for bundle size
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.amazonaws.com', // S3 photos
      },
    ],
    unoptimized: false,
  },
  // Disable SSR for Leaflet map components
  experimental: {
    // No special config needed — use dynamic import with ssr: false
  },
};

module.exports = withPWA(nextConfig);
```

### `vercel.json`
```json
{
  "framework": "nextjs",
  "env": {
    "NEXT_PUBLIC_API_URL": "@ravencry-api-url",
    "NEXT_PUBLIC_VAPID_KEY": "@ravencry-vapid-public"
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" }
      ]
    }
  ]
}
```

---

## 11. DESIGN CONSTRAINTS

### Mobile-First, Offline-Capable
- **Target device:** Basic Android, 2G/3G, 4"–6" screen
- **Touch targets:** Minimum 44×44px for all interactive elements
- **Font sizes:** Minimum 16px for body text (prevents iOS zoom on focus)
- **Image optimization:** Use Next.js `<Image>` with lazy loading, blur placeholders
- **Bundle budget:** < 200KB JS (compressed) for initial load on 3G
- **Offline:** Service worker caches last 10 alerts + report form. Queued reports sync on reconnect.

### Color Palette
```
Background:   #0a0a0a (near-black)    — main bg
Card:         #1a1a1a (dark gray)      — card bg
Text:         #fafafa (white)          — primary text
Text Muted:   #a3a3a3 (gray)          — secondary text
FLASH Red:    #dc2626 (tailwind red-600)
PRIORITY Amber: #f59e0b (tailwind amber-500)
ROUTINE Blue:  #3b82f6 (tailwind blue-500)
Success:      #22c55e (tailwind green-500)
```

### Typography
- System font stack: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- No custom fonts (saves 50KB+ per font weight on slow connections)

### Icon Strategy
- Use **Unicode emoji** wherever possible (zero bundle cost, renders on all devices)
- 🚨 FLASH, ⚠️ PRIORITY, 👁 sighting, 📍 location, 📞 call, ✅ found
- For non-emoji icons, use inline SVG (no icon library)

### Leaflet Map
- **ALWAYS** use dynamic import: `const Map = dynamic(() => import('./Map'), { ssr: false })`
- Tile URL: `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png` (free, no API key)
- Default center: Nigeria centroid `[9.082, 8.6753]`, zoom 6
- Pins: red for FLASH, amber for PRIORITY

---

## 12. WHAT v0.dev SHOULD BUILD

### Files to Create/Overwrite:

```
apps/web/
  package.json               ← Next.js 14 + all dependencies
  tsconfig.json               ← Strict TypeScript config
  next.config.js              ← PWA config (as above)
  tailwind.config.ts          ← Tailwind with dark theme
  postcss.config.js           ← PostCSS with Tailwind plugin
  vercel.json                 ← Vercel deployment config
  public/
    manifest.json             ← PWA manifest
    locales/en/common.json    ← English translations
    locales/ha/common.json    ← Hausa translations
    icons/icon-192.png        ← Placeholder PWA icon (red circle on dark)
    icons/icon-512.png        ← Placeholder PWA icon
  src/
    app/
      layout.tsx              ← Root layout
      page.tsx                ← Home page (alert feed + CTA)
      globals.css             ← Tailwind directives + custom styles
      report/page.tsx         ← 4-step report wizard
      alert/[id]/
        page.tsx              ← Alert detail (RSC — server-rendered for og:image)
        AlertMapIsland.tsx    ← 'use client' — dynamic Leaflet import, SSR disabled
        CopyButton.tsx        ← 'use client' — clipboard copy
      sighting/[id]/page.tsx  ← Quick sighting form
      subscribe/page.tsx      ← Subscription page
    components/
      AlertFeed.tsx           ← Alert feed with SSE (Client Component)
      AlertCard.tsx           ← Alert card component
      AlertBadge.tsx          ← FLASH/PRIORITY badge
      ReportWizard.tsx        ← 4-step wizard shell (Client Component)
      Step1What.tsx           ← Step 1: report type
      Step2Who.tsx            ← Step 2: person details
      Step3Where.tsx          ← Step 3: location & time
      Step4Confirm.tsx        ← Step 4: review & submit
      AlertMap.tsx            ← Leaflet map (dynamic import, SSR disabled)
      LocationPicker.tsx      ← Click-to-pin map
      OfflineBanner.tsx       ← Offline indicator
      LanguageSelector.tsx    ← EN/HA toggle (Client Component — uses localStorage)
      CaseIdBadge.tsx         ← Case ID with copy
      LoadingSpinner.tsx      ← Loading state
      ErrorState.tsx          ← Error state
    hooks/
      useAlertFeed.ts         ← SSE + SWR + IndexedDB
      useOfflineQueue.ts      ← IndexedDB queue
      useGeolocation.ts       ← Browser GPS
      usePushSubscription.ts  ← Web push
    lib/
      api.ts                  ← Typed API client
      i18n.ts                 ← i18next config
      offline-queue.ts        ← Queue helpers
      push.ts                 ← Push helpers
    types/
      index.ts                ← All TypeScript types
```

### What NOT to Build (out of scope for v0.dev):
- ❌ Ops dashboard (Appsmith, separate internal tool)
- ❌ Telegram/WhatsApp/SMS/USSD bots (backend services)
- ❌ n8n workflows (backend orchestration)
- ❌ Database migrations or API routes
- ❌ Real PWA icons (v0.dev can't generate PNGs — use placeholder SVGs or note them as TODOs)
- ❌ Authentication/operator login (ops only)
- ❌ API backend — v0.dev only builds the FRONTEND

---

## 13. SEED DATA FOR TESTING

The backend seeds 4 test cases. Use these to build placeholder UI during development:

| Case ID | Name | Age | Tier | Location | Status |
|---------|------|-----|------|----------|--------|
| NR-2026-000001 | Fatima Bello | 7 | FLASH | Sabon Gari Market, Kano | broadcast_complete |
| NR-2026-000002 | Yusuf Ibrahim | 9 | FLASH | Kaduna Central Mosque, Kaduna | broadcast_complete |
| NR-2026-000003 | Chioma Okoye | 6 | FLASH | Lekki Conservation Centre, Lagos | active |
| NR-2026-000004 | Babajide Adeniran | 12 | ROUTINE | Berger Bus Stop, Lagos | resolved |

---

## 14. ENVIRONMENT VARIABLES

```env
NEXT_PUBLIC_API_URL=http://localhost:3003       # Local dev
# NEXT_PUBLIC_API_URL=https://api.ravencry.cv   # Production
NEXT_PUBLIC_VAPID_KEY=                          # From AWS Secrets Manager
```

---

## 15. VERIFICATION CHECKLIST (After Import)

- [ ] `npm install` succeeds in `apps/web/`
- [ ] `npm run dev` starts on port 3000
- [ ] Home page loads with dark theme
- [ ] Language toggle switches EN ↔ HA
- [ ] Alert feed fetches from API (or shows empty state if no backend)
- [ ] Report form: all 4 steps render, validation works
- [ ] Offline banner appears when network disconnected
- [ ] Lighthouse PWA check shows manifest detected
- [ ] Leaflet map loads on alert detail page (dynamic import)
- [ ] SSE connection established to `/events` (visible in Network tab)

---

## 16. REDACTED SECRETS & ENVIRONMENT VARIABLES

> **For v0.dev:** Several API keys and secrets are REDACTED in the `.env.example` files. If you need any of these to build or test features, ASK — I will provide them.

### Redacted Variables (values hidden for security)

| Variable | Location | Redacted Because | Can Provide? |
|----------|----------|-----------------|-------------|
| `LLM_API_KEY` | `services/crucix/.env.example` | Qwen/OpenAI API key | ✅ Yes, if needed |
| `TELEGRAM_BOT_TOKEN` | `services/crucix/.env.example` | RavenCry Telegram bot token | ✅ Yes, if needed |
| `FIRMS_MAP_KEY` | `services/crucix/.env.example` | NASA FIRMS API key | ✅ Yes, if needed |
| `ACLED_PASSWORD` | `services/crucix/.env.example` | ACLED data password | ✅ Yes, if needed |
| `N8N_WEBHOOK_SECRET` | `services/crucix/.env.example` | Internal webhook secret | ✅ Yes, if needed |
| `DATABASE_URL` | `docker-compose.yml` | Aurora PostgreSQL connection string | ✅ Yes, if needed |
| `AT_API_KEY` | `docker-compose.yml` | Africa's Talking API key | ✅ Yes, if needed |
| `AT_USERNAME` | `docker-compose.yml` | Africa's Talking username | ✅ Yes, if needed |
| `VAPID_PRIVATE_KEY` | `docker-compose.yml` | Web Push VAPID private key | ✅ Yes, if needed |
| `VAPID_PUBLIC_KEY` | `docker-compose.yml` | Web Push VAPID public key | ✅ Yes (already in env) |
| `AWS_ACCESS_KEY_ID` | `docker-compose.yml` | AWS access key | ✅ Yes, if needed |
| `AWS_SECRET_ACCESS_KEY` | `docker-compose.yml` | AWS secret key | ✅ Yes, if needed |

### Free/Affordable API Keys You May Need

If v0.app needs additional API keys for features, these are ALL free to register:

| Key | Cost | Register At | Used By |
|-----|------|-------------|---------|
| `FIRMS_MAP_KEY` | **Free** | firms.modaps.eosdis.nasa.gov/api | Crucix thermal/fire detection |
| `FRED_API_KEY` | **Free** | fred.stlouisfed.org/docs/api | Crucix economic indicators |
| `EIA_API_KEY` | **Free** | api.eia.gov/register | Crucix energy data |
| `CLOUDFLARE_API_TOKEN` | **Free** | dash.cloudflare.com/profile/api-tokens | Crucix internet outages |
| `ACLED_EMAIL` + `ACLED_PASSWORD` | **Free** | acleddata.com/user/register | Crucix conflict data |
| `AISSTREAM_API_KEY` | **Free** | aisstream.io | Crucix maritime tracking |
| OpenStreetMap Tiles | **Free** | No key needed | PWA Leaflet maps |

---

## 17. RAVENCRY SERVICE ARCHITECTURE — Full Context

> **For v0.dev:** Understanding ALL services helps you find creative synergies and avoid duplicating functionality. The PWA is just ONE piece.

### Deployed Services (in `docker-compose.yml`)

| Service | Port | Tech | Role in System |
|---------|------|------|---------------|
| **caddy** | 80/443 | Caddy 2 Alpine | Reverse proxy — routes all traffic to services. TLS termination. |
| **api** | 3003 | Express 4 + TypeScript | **Central API gateway.** ALL citizen reports, alerts, sightings, subscriptions, operator actions flow through here. Connects to PostgreSQL (Aurora), DynamoDB, S3. Streams SSE events to PWA clients. Proxies `/telegram/*` to telegram service. |
| **crucix** | 3001 | Node.js ESM + Express 5 | **OSINT intelligence engine.** Queries 27 OSINT sources every 5-15 min. Hosts the Crucix dashboard (the one being customized in `v0_crucix.md`). Auto-emits FLASH webhooks to n8n when Nigeria kidnapping keywords detected. Has Telegram/Discord bot integrations. |
| **llm** | 3002 | Express 4 + OpenAI SDK | **AI pipeline.** Extracts person details from reports (EN/HA/YO/IG/Pidgin), classifies severity (FLASH/PRIORITY/ROUTINE), triages OSINT articles, detects hoaxes/fakes. Uses Qwen by default (configurable to OpenAI, Gemini, etc.). |
| **telegram** | 3005 | Express 5 + node-fetch | **Telegram bot service.** Handles citizen `/report`, `/sighting`, `/status`, `/help` commands. Receives broadcast requests from n8n WF-02 and posts FLASH/PRIORITY alerts to public alert channel and ops channel. |
| **whisper** | 8000 | Python Flask + faster-whisper | **Speech-to-text.** Transcribes WhatsApp/Telegram voice notes. Supports EN/HA/YO/IG/Pidgin/Fulfulde/Kanuri. Runs on CPU (int8 quantized, 2 workers). |
| **n8n** | 5678 | n8n (latest) | **Workflow automation.** WF-01: WhatsApp intake → LLM extraction → API storage. WF-02: FLASH broadcast → Telegram/SMS channels. WF-03: OSINT ingestion pipeline. |
| **appsmith** | 80 (internal) | Appsmith | **Operator dashboard.** Internal tool for operators to review, approve, suppress alerts. Not public-facing. |

### Planned/Stub Services (Not Yet Deployed)

| Service | Port | Status | Planned Role |
|---------|------|--------|-------------|
| **whatsapp** | 3004 | ✅ Coded, ❌ Not containerized | Meta WhatsApp Cloud API webhook handler. Receives messages, forwards to n8n WF-01. Has session state machine for multi-step flows. |
| **sms** | — | 🔴 Stub (empty files) | SMS alert delivery + intake via Africa's Talking API. For citizens without smartphones. |
| **ussd** | — | 🔴 Stub (empty files) | USSD *384# menu system. Multi-step reporting flow for feature phones. |
| **naptip** | — | 🔴 Stub (empty files) | Bridge to Nigeria's NAPTIP agency. CAP (Common Alerting Protocol) adapter planned. |

### Data Flow (End-to-End)

```
CITIZEN REPORTING FLOW:
  WhatsApp/Telegram/PWA/USSD/SMS
         ↓
  n8n WF-01 (intake + validation)
         ↓
  LLM Service /extract (structured extraction)
         ↓
  LLM Service /classify (FLASH/PRIORITY/ROUTINE)
         ↓
  API Gateway POST /api/reports (store in Aurora)
         ↓
  Operator Review (Appsmith) → approve/suppress
         ↓
  n8n WF-02 (broadcast)  ←─── Crucix OSINT webhook (auto-FLASH)
         ↓                      ↑
  Telegram Alert Channel       Crucix sweeps ACLED/GDELT/NAPTIP
  PWA SSE /events              RSS feeds for Nigeria kidnapping
  SMS (planned)                keywords every 5-15 minutes
  Push Notifications
```

### Synergy Opportunities for v0.dev

1. **Crucix → PWA:** The Crucix Nigeria FLASH counter could be an SSE endpoint that the PWA subscribes to for OSINT-driven alerts
2. **PWA → Crucix:** The PWA alert detail pages could link to the Crucix dashboard for "full intelligence context"
3. **Crucix ACLED → PWA Map:** The Crucix ACLED geo-points (kidnappings, banditry, fatalities) could be rendered as "conflict zone" overlays on the PWA's Leaflet map
4. **PWA → API:** The PWA could display Crucix-generated OSINT alerts alongside citizen-reported alerts (unified feed)
5. **i18n Reuse:** Crucix already has a locale system (`lib/i18n.mjs`). The Hausa translations could be shared between PWA and Crucix dashboard
6. **Shared Types:** `packages/shared/src/types.ts` is used by API, LLM, and Telegram services. The PWA should use these same types

---

## 18. CRUCIX DASHBOARD CUSTOMIZATION (Sibling Task)

> **Note:** There is a SEPARATE document for customizing the Crucix OSINT dashboard: **`prompt-system/v0_crucix.md`**
>
> That document covers:
> - Map focus on Nigeria/West Africa
> - Africa-only data toggle button
> - Rebranding (CRUCIX → RAVENCRY)
> - Nigeria-specific widgets (ACLED, citizen reports, FLASH alerts)
> - Logo/favicon integration
> - All 31 possible improvements with implementation notes
>
> **Do NOT mix Crucix dashboard changes with PWA changes.** They are separate frontends with different tech stacks (Crucix = vanilla HTML/JS/WebGL, PWA = Next.js/React/Tailwind).
