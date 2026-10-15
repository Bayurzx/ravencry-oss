# Prompt 08 — Frontend PWA
## Next.js + Tailwind + Leaflet. Mobile-first. Offline-capable.

---

## INSTRUCTION TO AI

Build the complete Next.js PWA frontend for RAVENCRY. This is the public face of the system — citizens report missing persons, view active alerts, and submit sightings.

Design principle: as simple as a messaging app. If a mother in Maiduguri with a basic Android and 2G can use it to report her missing child in under 2 minutes, we have succeeded.

---

## TECH STACK

```
Next.js 14 (App Router)
TypeScript
Tailwind CSS (utility-first, no component library — keep bundle small)
next-pwa (Workbox-based service worker)
Leaflet.js + react-leaflet (maps, no API key)
SWR (data fetching + cache)
i18next (multilingual UI)
idb (IndexedDB for offline cache)
web-push (push notification subscription)
```

---

## PROJECT STRUCTURE

```
app/
  layout.tsx              ← Root layout: metadata, PWA manifest link, language provider
  page.tsx                ← Home: alert feed + quick report CTA
  report/page.tsx         ← 4-step report wizard
  alert/[id]/page.tsx     ← Single alert detail (shareable)
  sighting/[id]/page.tsx  ← Quick sighting submission form
  subscribe/page.tsx      ← LGA subscription opt-in
  ops/page.tsx            ← Redirect to Appsmith (protected)

components/
  AlertFeed/
    AlertFeed.tsx         ← SSE-connected list of active FLASH/PRIORITY alerts
    AlertCard.tsx         ← Minimal card: photo, name, LGA, time, sighting CTA
    AlertBadge.tsx        ← FLASH 🚨 / PRIORITY ⚠️ pill
  ReportForm/
    ReportForm.tsx        ← 4-step wizard shell + progress bar
    Step1What.tsx         ← What happened (missing / kidnapping / sighting)
    Step2Who.tsx          ← Person details + photo upload
    Step3Where.tsx        ← Location picker (text + map pin + GPS)
    Step4Confirm.tsx      ← Review + submit
  Map/
    AlertMap.tsx          ← Leaflet map with alert pins (dynamic import, SSR disabled)
    LocationPicker.tsx    ← Click-to-pin map for report form
  UI/
    OfflineBanner.tsx     ← Yellow bar when PWA is offline
    LanguageSelector.tsx  ← EN / HA / YO / IG toggle
    CaseIdBadge.tsx       ← Monospace case ID with copy button
    LoadingSpinner.tsx
    ErrorState.tsx

hooks/
  useAlertFeed.ts         ← SSE connection, reconnect logic, offline fallback
  useOfflineAlerts.ts     ← Read/write last 10 alerts to IndexedDB
  useGeolocation.ts       ← Browser GPS with permission handling
  usePushSubscription.ts  ← Web Push subscription management

lib/
  api.ts                  ← Typed fetch wrappers for all backend endpoints
  i18n.ts                 ← i18next config, language detection
  offline-queue.ts        ← Queue failed submissions in IndexedDB for retry
  push.ts                 ← VAPID public key, subscribe/unsubscribe helpers

public/
  manifest.json
  icons/                  ← PWA icons (72, 96, 128, 144, 152, 192, 384, 512px)
  sw.js                   ← next-pwa generated (do not edit manually)
```

---

## HOME PAGE: `app/page.tsx`

Layout (mobile-first, vertical stack):

```
┌─────────────────────────────┐
│  🇳🇬 RAVENCRY        [HA YO IG]│  ← header + language selector
├─────────────────────────────┤
│  🚨  FLASH ALERTS           │
│  ┌─────────────────────────┐│
│  │ [photo] Amina Musa      ││  ← AlertCard
│  │ Age 8 · Kano Central    ││
│  │ Seen today 2pm          ││
│  │ [👁 Report Sighting]    ││
│  └─────────────────────────┘│
│  [+ 2 more alerts ▾]        │
├─────────────────────────────┤
│  ┌─────────────────────────┐│
│  │  [🔴 REPORT MISSING     ││  ← Primary CTA — full width button
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

**AlertFeed behaviour:**
- On load: fetch `/api/alerts/active?lat={lat}&lng={lng}` if geolocation granted, else all FLASH
- Subscribe to SSE `/events` for live updates
- On new alert via SSE: prepend card + haptic feedback (navigator.vibrate)
- Offline: show cached alerts from IndexedDB with "Offline — showing cached alerts" notice
- Empty state: "No active alerts in your area. Stay safe. 🙏"

---

## REPORT FORM: `app/report/page.tsx`

**Step 1 — What happened?**
```tsx
<h1>What do you need to report?</h1>
<RadioGroup>
  <RadioOption value="missing" label="A person is missing" icon="👤" />
  <RadioOption value="abduction" label="I witnessed a kidnapping" icon="🚨" />
  <RadioOption value="sighting" label="I saw someone from an alert" icon="👁" />
</RadioGroup>

{selected === 'abduction' && (
  <SafetyBanner>
    Are you safe? If in immediate danger, call 112 first.
  </SafetyBanner>
)}
```

**Step 2 — About the person**
```tsx
<TextInput label="Full name" name="person_name" required />
<NumberInput label="Age (approx)" name="age" min={0} max={100} />
<Select label="Gender" options={['Male', 'Female', 'Unknown']} />
<Textarea label="What were they wearing? Any features?" name="description" />
<PhotoUpload label="Recent photo" name="photo" maxSizeMB={5}
  hint="Any photo helps — doesn't have to be recent" />
```

**Step 3 — Where and when**
```tsx
<TextInput label="Where were they last seen?" name="location"
  placeholder="e.g. Kano Central Market, near ABC bank" />
<Button onClick={requestGPS}>📍 Use my current location</Button>
<LocationPickerMap onPin={(lat, lng) => setCoordinates({ lat, lng })} />
<DateTimeInput label="When? (approx is fine)" name="last_seen_time" />
<Textarea label="Any other details" name="extra" />
```

**Step 4 — Confirm & submit**
```tsx
<ReviewCard data={formData} />
<TextInput label="Your phone (optional)"
  hint="We'll send you updates. You can skip this." />
<Button variant="ghost" onClick={() => submit({ anonymous: true })}>
  Submit anonymously
</Button>
<Button variant="primary" onClick={submit}>
  Submit Report
</Button>
```

**On submission result:**
```tsx
// Success
<SuccessScreen>
  <CheckCircleIcon />
  <h2>Report submitted</h2>
  <CaseIdBadge id={caseId} />
  <p>Share this ID with police or family</p>
  <Button onClick={share}>📤 Share case ID</Button>
  <Button variant="ghost" href="/">Back to alerts</Button>
</SuccessScreen>

// Offline
<OfflineQueuedScreen>
  <CloudOffIcon />
  <h2>Saved. Will send when you're online.</h2>
  <CaseIdBadge id="Pending..." />
</OfflineQueuedScreen>
```

---

## ALERT DETAIL PAGE: `app/alert/[id]/page.tsx`

```
┌────────────────────────────┐
│ ← Back    🚨 FLASH ALERT  │
├────────────────────────────┤
│ [Full photo]               │
├────────────────────────────┤
│ Amina Musa                 │
│ Age: 8 · Female            │
│ Last seen: Kano Central    │
│ Time: Today, ~2:00 PM      │
│                            │
│ Wearing blue school        │
│ uniform, plaited hair      │
├────────────────────────────┤
│ Case ID: NR-2025-001847    │
│ [Copy] [Share]             │
├────────────────────────────┤
│ [MAP — last seen location] │
├────────────────────────────┤
│ [🚨 REPORT A SIGHTING]     │
│ [📞 Call 112]              │
└────────────────────────────┘
```

- Meta tags: `og:image`, `og:title`, `og:description` for WhatsApp link previews
- Canonical URL: `https://ravencry.ng/alert/{id}` — shareable
- If case is `resolved`: show "✅ This person has been found. Thank you."

---

## i18n TRANSLATIONS

Provide translation keys for all UI strings in 4 languages:

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
  "ussd_fallback": "Feature phone? Dial: *384#"
}
```

Provide equivalent JSON for: `ha/common.json` (Hausa), `yo/common.json` (Yoruba), `ig/common.json` (Igbo).

---

## PWA MANIFEST: `public/manifest.json`

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

---

## OFFLINE SERVICE WORKER CONFIG: `next.config.js`

```javascript
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/api\.ravencry\.ng\/api\/alerts/,
      handler: 'StaleWhileRevalidate',
      options: { cacheName: 'alerts-cache', expiration: { maxAgeSeconds: 300 } }
    },
    {
      urlPattern: /\/_next\/image\?url/,
      handler: 'CacheFirst',
      options: { cacheName: 'image-cache', expiration: { maxEntries: 50 } }
    }
  ]
})
```

---

## VERCEL DEPLOYMENT CONFIG: `vercel.json`

```json
{
  "framework": "nextjs",
  "env": {
    "NEXT_PUBLIC_API_URL": "@ravencry-api-url",
    "NEXT_PUBLIC_VAPID_KEY": "@ravencry-vapid-public",
    "NEXT_PUBLIC_AT_WHATSAPP": "@ravencry-whatsapp-number"
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" }
      ]
    }
  ]
}
```

---

## VERIFICATION CHECKLIST

- [ ] Lighthouse PWA score ≥ 90
- [ ] Lighthouse Performance ≥ 85 on mobile (3G simulated)
- [ ] PWA installs on Android Chrome ("Add to Home Screen")
- [ ] Alert feed loads and shows active cases
- [ ] SSE: new alert appears in feed without page refresh
- [ ] Report form: complete 4 steps → case ID returned
- [ ] Offline: disconnect wifi → cached alerts visible → form queued
- [ ] Reconnect → queued report syncs automatically
- [ ] Language toggle: switch to Hausa → all UI strings update
- [ ] Alert detail page: share URL → correct og:image in WhatsApp preview
- [ ] Vercel deployment URL is live and accessible
