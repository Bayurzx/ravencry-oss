# RAVENCRY — v0.dev Crucix Dashboard Customization
## Phase 6: Crucix OSINT Dashboard Theming & Nigeria Focus

> **For v0.dev:** This document contains ALL context needed to customize the Crucix intelligence dashboard (`services/crucix/dashboard/public/jarvis.html`) for the RAVENCRY anti-kidnapping system.
>
> **IMPORTANT — READ THIS FIRST:**
> - The dashboard already WORKS. It queries 27 OSINT sources, renders a 3D globe, has alert delivery to Telegram/Discord, and drives FLASH alerts via n8n.
> - Your job is **customization ONLY** — theming, map focus, filtering, and Nigeria-specific panels.
> - **DO NOT BREAK** the existing data pipeline (`inject.mjs`), the globe initialization, the SSE stream, the flat/globe toggle, the low-perf mode, or the i18n system.
> - Choose improvements from the list below wisely. Not all are needed. Prioritize those that make the biggest visual/functional impact without touching core logic.

---

## HOW TO USE THIS DOCUMENT WITH v0.dev

This is a **single comprehensive document** — not a multi-prompt sequence. Read it fully, then generate ONE cohesive set of changes.

**Strategy:**
1. Read the "Current State" section below to understand what exists
2. Read the "Improvements Table" — pick the ones that make the biggest impact
3. Read the "Implementation Notes" for each chosen improvement
4. Generate the modified `jarvis.html` and any supporting files

---

## CURRENT STATE — What Exists Now

### Files You'll Modify

| File | Purpose | Size |
|------|---------|------|
| `services/crucix/dashboard/public/jarvis.html` | The ENTIRE dashboard — HTML + CSS + JS in one file | ~2000 lines |
| `services/crucix/dashboard/inject.mjs` | Server-side data synthesizer — reads OSINT data, writes into jarvis.html | ~900 lines |
| `services/crucix/crucix.config.mjs` | Configuration — ports, LLM provider, Telegram, delta thresholds, ravencry webhook | ~50 lines |
| `services/crucix/config/nigeria-keywords.json` | Nigeria-specific keyword lists for OSINT triage (kidnapping terms in EN/Pidgin/Hausa/Yoruba/Igbo) | ~20 lines |
| `services/crucix/config/nigeria-keywords.mjs` | Keyword loader with `matchesAnyKeyword()`, `matchesEscalator()`, `matchesDeescalator()` | ~30 lines |
| `services/crucix/config/alert-templates.json` | Alert message templates (FLASH/PRIORITY/ROUTINE) for WhatsApp, SMS, Telegram, Push, NAPTIP | ~60 lines |

### Dashboard Layout (3-Column Grid)

```
┌────────────┬──────────────────────────────┬────────────┐
│ LEFT RAIL  │       CENTER COLUMN          │ RIGHT RAIL │
│ (240px)    │                              │ (340px)    │
├────────────┤ ┌──────────────────────────┐ ├────────────┤
│ Sensor Grid│ │ MAP REGION BAR           │ │ OSINT Feed │
│ • Air      │ │ [WORLD][AMERICAS][EUROPE] │ │ (Telegram)  │
│ • Thermal  │ │ [MIDDLE EAST][ASIA][AFRICA]│ │ posts       │
│ • SDR      │ ├──────────────────────────┤ ├────────────┤
│ • Maritime │ │                          │ │ Delta      │
│ • Nuclear  │ │  3D GLOBE / FLAT MAP     │ │ Signals    │
│ • Conflict │ │  (globe.gl library)      │ ├────────────┤
│ • Health   │ │                          │ │ Ideas &    │
│ • News     │ │                          │ │ Markets    │
│ • OSINT    │ │                          │ ├────────────┤
│ • Space    │ │                          │ │ Nigeria    │
├────────────┤ ├──────────────────────────┤ │ OSINT      │
│ Nuclear    │ │ LOWER GRID               │ │ (NAPTIP,   │
│ Watch      │ │ • OSINT Feed             │ │ GDELT,     │
├────────────┤ │ • Delta Signals          │ │ News,      │
│ Risk Gauges│ │ • Sweep Status           │ │ Citizens,  │
│ • VIX      │ │                          │ │ ACLED)     │
│ • HY Spread│ │                          │ ├────────────┤
│ • USD Index│ │                          │ │ Weather    │
│ • etc.     │ │                          │ │ Alerts     │
├────────────┤ │                          │ ├────────────┤
│ Space Watch│ │                          │ │ Health      │
└────────────┘ └──────────────────────────┘ └────────────┘
```

### Key Technical Details

**Map/Globe:**
- Uses `globe.gl` v2.33.0 (WebGL 3D globe) + D3.js for flat map projection
- Toggle between globe/flat mode via button
- Region POV presets: `world`, `americas`, `europe`, `middleEast`, `asiaPacific`, `africa`
- POV defined in JS as: `const regionPOV = { world: {lat:20,lng:20,altitude:1.8}, africa: {lat:5,lng:20,altitude:1.2}, ... }`
- Globe markers: air hotspots (green), thermal/fire (red), maritime chokepoints (purple), nuclear sites (yellow), SDR receivers (cyan)

**Data Flow:**
```
27 OSINT APIs → server.mjs (sweep every 15min) → runs/latest.json
                                                    ↓
                                            inject.mjs (synthesize)
                                                    ↓
                              jarvis.html ← data injected as JS variable `D = {...}`
```

**Nigeria-Specific Data (already collected by inject.mjs):**
- `D.nigeria.naptip` — NAPTIP RSS feed matches
- `D.nigeria.gdeltNigeria` — GDELT Nigeria geo-articles
- `D.nigeria.nigeriaNews` — Nigeria news RSS matches
- `D.nigeria.citizenReports` — Active cases from PostgreSQL (pendingCases)
- `D.nigeria.acledNigeria` — ACLED conflict data (kidnappings, banditry, VAC, protests, fatalities, daily timeline, high-risk states, geoPoints)
- `D.nigeria.flashEvents` — aggregated FLASH count across all sources
- `D.nigeria.totalMatched` — total matched articles

**Alert Flow (for context):**
```
OSINT detection → Crucix webhook → n8n WF-02 → Telegram broadcast + API alert creation
```
Crucix sends webhooks to n8n when Nigeria FLASH events are detected. The `ravencry` config section in `crucix.config.mjs` controls this:
- `n8nWebhookUrl`: where FLASH events are POSTed
- `flashAutoEmit`: auto-fire webhooks (default: true)
- `flashMinSources`: minimum Nigeria sources with FLASH events required to fire (default: 1)

---

## POSSIBLE IMPROVEMENTS — Choose Wisely

### 🌍 Map & Geography

| # | Improvement | Impact | Risk | Effort |
|---|-------------|--------|------|--------|
| 1 | **Add "West Africa" or "Nigeria" region button** to the map region bar | High | Low | Low |
| 2 | **Default map POV to Nigeria** (`lat:9, lng:8, altitude:0.6`) instead of `world` | High | Low | Low |
| 3 | **Add Nigeria state/LGA boundary overlay** (GeoJSON) on globe/flat map | Medium | Medium | High |
| 4 | **Plot ACLED Nigeria geo-points** (kidnappings, banditry) as colored markers on map | High | Low | Medium |
| 5 | **Plot citizen report geo-points** from `citizenReports.pendingCases` onto the map | Medium | Medium | Medium |
| 6 | **"Zoom to Nigeria" quick-jump button** with animated globe transition | Medium | Low | Low |

### 🎨 Branding & Theming

| # | Improvement | Impact | Risk | Effort |
|---|-------------|--------|------|--------|
| 7 | **Replace "CRUCIX MONITOR"** brand text → "RAVENCRY OPS" or "RAVENCRY MONITOR" | High | None | Low |
| 8 | **Replace "WARTIME STAGFLATION RISK"** regime chip → dynamic Nigeria alert status or "NATIONAL SECURITY" | High | None | Low |
| 9 | **Custom RavenCry color palette** — replace teal/cyan with red/amber/purple | Medium | Medium | Medium |
| 10 | **Replace boot screen CRUCIX logo** → RavenCry logo (use favicon PNGs) | Medium | None | Low |
| 11 | **Custom page title & favicon** → `<title>RAVENCRY — Intelligence Terminal</title>` + favicon files | High | None | Low |
| 12 | **RavenCry-themed boot sequence** messages (e.g., "INITIALIZING NAIJA WATCH...", "CONNECTING TO LAGOS NODE...") | Low | None | Low |

### 🔍 Data Filtering & Focus (CRITICAL — This is what you asked for)

| # | Improvement | Impact | Risk | Effort |
|---|-------------|--------|------|--------|
| 13 | **"Africa Only" toggle button** — filters ALL displayed data to Africa region | High | Medium | High |
| 14 | **Prioritize Nigeria/Africa RSS feeds** in inject.mjs — boost weight so they appear before Ukraine/etc. | Medium | Low | Low |
| 15 | **Add more Nigeria-specific RSS feeds** (Punch, Vanguard, Guardian NG, Channels TV, Premium Times) to inject.mjs | Medium | Low | Medium |
| 16 | **Collapse non-African thermal/air data** when Africa mode is ON | Medium | Medium | Medium |
| 17 | **Filter OSINT (Telegram) feed** to only show Nigeria-relevant posts using `nigeria-keywords.json` | High | Medium | Medium |

### 🚨 Alerts & Notifications

| # | Improvement | Impact | Risk | Effort |
|---|-------------|--------|------|--------|
| 18 | **Make "HIGH ALERT" badge dynamic** — shows actual FLASH count from `D.nigeria.flashEvents` | High | None | Low |
| 19 | **Add Nigeria FLASH alert counter** in topbar showing active alerts | High | None | Low |
| 20 | **Add "Nigeria Alert Feed" panel** in right rail showing live alerts by tier (FLASH/PRIORITY/ROUTINE) | High | Low | Medium |
| 21 | **Pulse animation for FLASH alerts** — visual urgency for kidnapping alerts | Low | None | Low |

### 📊 Nigeria-Specific Widgets/Panels (these already exist in right rail — enhance them)

| # | Improvement | Impact | Risk | Effort |
|---|-------------|--------|------|--------|
| 22 | **Enhance ACLED Nigeria panel** — add sparkline of kidnapping events, fatalities heatmap | High | Low | Medium |
| 23 | **Add "High-Risk LGAs" watch panel** using `nigeria-keywords.json` high_risk_lgas list | Medium | None | Low |
| 24 | **Enhance "Active Cases" display** — show citizenReports with tier badges in a scannable list | Medium | Low | Low |
| 25 | **Add Nigeria-specific delta/sweep summary** — "What changed in Nigeria since last sweep" | High | High | High |

### 🧭 Navigation & UX

| # | Improvement | Impact | Risk | Effort |
|---|-------------|--------|------|--------|
| 26 | **Persist user region preference** (Nigeria/West Africa) in `localStorage` | Medium | None | Low |
| 27 | **Add operator quick-actions**: "Report Sighting", "Escalate Case", "Contact Ops" | Medium | Low | Medium |
| 28 | **Mobile responsiveness** for the Nigeria panels | Medium | Medium | High |

### ⚙️ Performance & Config

| # | Improvement | Impact | Risk | Effort |
|---|-------------|--------|------|--------|
| 29 | **Reduce non-African source queries** when Africa mode is on (fewer API calls) | Low | High | High |
| 30 | **Extract theming into CSS variables** for v0.app to easily override | Medium | Medium | Medium |
| 31 | **Document all CSS custom properties** for v0.app reference | Low | None | Low |

---

## IMPLEMENTATION NOTES — For Each Improvement

### #1 & #2 — Nigeria Region Button + Default POV (RECOMMENDED)

**What to change in `jarvis.html`:**
1. Add `nigeria: { lat: 9, lng: 8, altitude: 0.6 }` to the `regionPOV` object
2. Add a `<button class="region-btn" data-region="nigeria" onclick="setRegion('nigeria')">NIGERIA</button>` to the region bar
3. Change `let currentRegion = 'world';` → `let currentRegion = 'nigeria';`
4. In `initGlobe()`, change `globe.pointOfView(regionPOV.world, 0);` → `globe.pointOfView(regionPOV[currentRegion], 0);`

**Also add:**
- `westAfrica: { lat: 9, lng: 2, altitude: 1.4 }` for a broader West Africa view

**Where in the file:**
- `regionPOV` is around line 513 of jarvis.html
- `initGlobe()` is around line 719
- `setRegion()` function handles region switching

### #7 & #8 & #11 — Rebrand Topbar (RECOMMENDED)

**What to change in `jarvis.html`:**
1. Line ~590: Change `<span class="brand">CRUCIX MONITOR</span>` → `<span class="brand">RAVENCRY OPS</span>`
2. Line ~591: Change `<span class="regime-chip"><span class="blink"></span>WARTIME STAGFLATION RISK</span>` → dynamic based on `D.nigeria.flashEvents > 0 ? '<span class="regime-chip active"><span class="blink"></span>ACTIVE FLASH ALERTS</span>' : '<span class="regime-chip"><span class="blink"></span>NIGERIA WATCH</span>'`
3. Line ~4: Change `<title>CRUCIX — Intelligence Terminal</title>` → `<title>RAVENCRY — Nigeria Intelligence Terminal</title>`
4. Add favicon link: `<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">` etc.

**Logo files available at:** `services/crucix/favicon_ravencry/`
- `favicon.ico`
- `favicon-16x16.png`
- `favicon-32x32.png`
- `android-chrome-192x192.png`
- `android-chrome-512x512.png`
- `apple-touch-icon.png`
- `site.webmanifest`

### #9 — Custom RavenCry Color Palette (OPTIONAL — visual impact but riskier)

**Current theme colors (Crucix teal):**
```css
--accent: #64f0c8;     /* teal */
--accent2: #44ccff;    /* cyan */
--warn: #ffb84c;       /* amber */
--danger: #ff5f63;     /* red */
```

**Proposed RavenCry palette (red/amber focus):**
```css
--accent: #dc2626;     /* ravencry red */
--accent2: #f59e0b;    /* amber */
--warn: #ffb84c;       /* keep amber */
--danger: #dc2626;     /* keep red */
```

**WARNING:** This changes ~40+ CSS references throughout the file. Do this LAST after other changes are verified. Test thoroughly — the globe atmosphere, scanlines, borders, buttons, badges all use these.

**Safer approach:** Only change the topbar border/accent, keep the globe/map colors as-is (they're functional for data visualization).

### #10 — Boot Screen Customization

**What to change:**
1. The logo ring HTML (line ~329): Change `<span class="logo-text">CRUCIX</span>` → an `<img>` tag pointing to the RavenCry logo
2. The boot lines sequence (in JS): Change messages like `"INITIALIZING CRUCIX SENSOR MATRIX..."` → `"INITIALIZING RAVENCRY SENSOR MATRIX..."`
3. The final text: `"CRUCIX TERMINAL ACTIVE"` → `"RAVENCRY OPS ACTIVE"`

**Boot lines are generated in `renderBoot()` function — search for the array of boot messages.**

### #13 — Africa-Only Toggle Button (YOU REQUESTED THIS)

**This is the most impactful but complex change. Here's the design:**

**UI Placement:** Add a toggle switch in the topbar (right section) next to the existing VISUALS toggle. Label it "AFRICA FOCUS" or "🌍 AFRICA ONLY".

**What it does when ON:**
1. **Map:** Sets globe POV to Africa/Nigeria and prevents region switching to non-African regions
2. **Sensor Grid (left rail):** Filters to show only Africa-relevant counts (or grays out non-African entries)
3. **OSINT Feed (right rail):** Filters Telegram posts to Nigeria/Africa keywords using `nigeria-keywords.json`
4. **News Feed:** Only shows Africa/Nigeria geo-tagged news
5. **Thermal/Fire markers:** Only plots Africa-region fires
6. **Air traffic:** Only shows Africa-region flight hotspots
7. **Conflict events:** Only shows Africa ACLED events

**Implementation approach:**
```javascript
let africaFocus = localStorage.getItem('ravencry_africa_focus') === 'true';

function toggleAfricaFocus() {
  africaFocus = !africaFocus;
  localStorage.setItem('ravencry_africa_focus', String(africaFocus));
  // Re-render affected panels
  renderLeftRail();
  renderRightRail();
  if (africaFocus) setRegion('nigeria');
  plotMarkers(); // re-plot with filter
}

// Africa bounding box check
function isInAfrica(lat, lon) {
  return lat >= -35 && lat <= 37 && lon >= -18 && lon <= 52;
}
```

**The toggle button should be placed in the topbar alongside existing toggles:**
```html
<button class="meta-pill perf-pill" onclick="toggleAfricaFocus()" id="africaToggle">
  🌍 <span id="africaStatus">AFRICA FOCUS</span>
</button>
```

**Style it similarly to the VISUALS toggle — subtle border, monospace font.**

### #14 — Boost Nigeria RSS Feed Priority (RECOMMENDED — low risk)

**What to change in `inject.mjs`:**
The `REGIONAL_NEWS_SOURCES` array currently reserves 2 slots for each regional source. Add Nigerian sources:

```javascript
const REGIONAL_NEWS_SOURCES = ['MercoPress', 'Indian Express', 'The Hindu', 'SBS Australia', 'Punch NG', 'Vanguard NG', 'Guardian NG', 'Channels TV', 'Premium Times'];
```

Also increase the reserved slots from 2 to 4 for Nigerian sources specifically.

### #15 — Add Nigeria RSS Feeds to inject.mjs (RECOMMENDED)

Add these to the `feeds` array in `fetchAllNews()`:

```javascript
// Nigeria
['https://punchng.com/feed/', 'Punch NG'],
['https://www.vanguardngr.com/feed/', 'Vanguard NG'],
['https://guardian.ng/feed/', 'Guardian NG'],
['https://www.channelstv.com/feed/', 'Channels TV'],
['https://www.premiumtimesng.com/feed', 'Premium Times'],
```

**Note:** These may need URL verification. Some Nigerian news sites changed their RSS URLs or dropped RSS support. Test each URL before adding.

### #18 & #19 — Dynamic Alert Badge (RECOMMENDED)

**In `renderTopbar()`, change:**
```javascript
// Current (hardcoded):
<span class="alert-badge">HIGH ALERT</span>

// Proposed (dynamic):
${D.nigeria && D.nigeria.flashEvents > 0 
  ? `<span class="alert-badge" style="animation:pulse-blink 1s infinite">🚨 ${D.nigeria.flashEvents} FLASH</span>`
  : `<span class="alert-badge" style="opacity:0.6">NO ACTIVE FLASH</span>`
}
```

### #22 & #24 — Enhance Nigeria Panels in Right Rail

The right rail already has Nigeria data panels. These are rendered in `renderRightRail()` (search in jarvis.html). Enhance them:

**ACLED Nigeria Panel:**
- Add a mini sparkline showing kidnapping events over the last 7 days
- Color-code states by risk level (red = Zamfara/Kaduna/Borno, amber = Katsina/Niger/Yobe)
- Show "Deadliest Events" as a scannable list

**Citizen Reports Panel:**
- Show pending cases with tier badges (FLASH = red, PRIORITY = amber)
- Add case age ("3h ago", "1d ago")
- Link to full case detail

### #26 — Persist Region Preference (RECOMMENDED)

In the `setRegion()` function, add:
```javascript
localStorage.setItem('ravencry_region', region);
```

In initialization, read it back:
```javascript
let currentRegion = localStorage.getItem('ravencry_region') || 'nigeria';
```

---

## SECRETS & ENVIRONMENT VARIABLES

### Redacted in `.env.example`

The following variables in `services/crucix/.env.example` are REDACTED:
- `LLM_API_KEY` — Your Qwen/OpenAI API key. If v0.app needs this, say so and you'll provide it.
- `TELEGRAM_BOT_TOKEN` — RavenCry Telegram bot token. If needed, you'll provide it.
- `FIRMS_MAP_KEY` — NASA FIRMS API key (free — register at firms.modaps.eosdis.nasa.gov/api). If needed, register for one.
- `ACLED_PASSWORD` — ACLED data password. If needed, you'll provide it.
- `N8N_WEBHOOK_SECRET` — Internal webhook secret. If needed, you'll provide it.

### Free/Affordable Keys v0.app Might Need

| Key | Cost | Registration |
|-----|------|-------------|
| FIRMS_MAP_KEY | **Free** | firms.modaps.eosdis.nasa.gov/api |
| FRED_API_KEY | **Free** | fred.stlouisfed.org/docs/api |
| EIA_API_KEY | **Free** | api.eia.gov/register |
| CLOUDFLARE_API_TOKEN | **Free** | dash.cloudflare.com/profile/api-tokens |
| ACLED_EMAIL + ACLED_PASSWORD | **Free** | acleddata.com/user/register |
| AISSTREAM_API_KEY | **Free** | aisstream.io |

### Missing from `.env.example` (Added June 2026)

These were in the original Crucix `.env.example.old` but were missing from the RavenCry version. They are now added back:
- `FRED_API_KEY` — Federal Reserve Economic Data (free)
- `EIA_API_KEY` — Energy Information Administration (free)
- `AISSTREAM_API_KEY` — Maritime AIS data (free)
- `CLOUDFLARE_API_TOKEN` — Cloudflare Radar (free)
- `OLLAMA_BASE_URL` — Local Ollama LLM (only if using local models)

---

## RAVENCRY SERVICE ARCHITECTURE — Context for Creative Synergy

The Crucix dashboard is ONE piece of a larger system. Here's the full picture so v0.app can find synergies:

### Deployed Services (in docker-compose.yml)

| Service | Port | Tech | Role |
|---------|------|------|------|
| **api** | 3003 | Express + TypeScript | Central API gateway. ALL citizen reports, alerts, and operator actions flow through here. PostgreSQL (Aurora) + DynamoDB + S3. SSE stream for real-time PWA updates. |
| **crucix** | 3001 | Node.js ESM + Express 5 | OSINT intelligence engine. This dashboard. Auto-emits FLASH webhooks to n8n when Nigeria events detected. |
| **llm** | 3002 | Express + OpenAI SDK | AI pipeline: extracts person details from reports (EN/HA/YO/IG/Pidgin), classifies severity (FLASH/PRIORITY/ROUTINE), triages OSINT articles, detects fakes. Uses Qwen by default. |
| **telegram** | 3005 | Express 5 | Telegram bot: handles `/report`, `/sighting`, `/status` commands from citizens + broadcasts FLASH alerts to alert channels. |
| **whisper** | 8000 | Python Flask + faster-whisper | Speech-to-text for WhatsApp/Telegram voice notes. Supports EN/HA/YO/IG/Pidgin/Fulfulde/Kanuri. CPU-optimized. |

### Planned/Stub Services (not yet deployed)

| Service | Status | Planned Role |
|---------|--------|-------------|
| **whatsapp** | Port 3004, coded but not containerized | Meta WhatsApp Cloud API webhook handler. Forwards messages to n8n WF-01. |
| **sms** | Stub (empty files) | SMS alert delivery via Africa's Talking. For citizens without smartphones. |
| **ussd** | Stub (empty files) | USSD *384# menu for feature phones. Multi-step reporting flow. |
| **naptip** | Stub (empty files) | Bridge to Nigeria's NAPTIP agency. CAP (Common Alerting Protocol) adapter planned. |

### Supporting Infrastructure

| Component | Role |
|-----------|------|
| **Caddy** | Reverse proxy on ports 80/443, routes to all services |
| **n8n** | Workflow automation (port 5678). WF-01: WhatsApp intake → LLM extraction → API. WF-02: FLASH broadcast → Telegram/SMS. WF-03: OSINT ingestion → Crucix. |
| **PostgreSQL (Aurora)** | Primary database — cases, alerts, sightings, subscribers, operators, LGA coordinates |
| **DynamoDB** | Push notification subscriptions |
| **S3** | Media uploads (photos) |

### How Crucix Fits In

```
Citizen Reports (WhatsApp/Telegram/USSD/PWA)
       ↓
   n8n WF-01 (intake)
       ↓
   LLM Service (extract + classify)
       ↓
   API Gateway (store in Aurora)
       ↓
   Operator Review (approve FLASH/PRIORITY)
       ↓
   n8n WF-02 (broadcast)  ←─── Crucix webhook (OSINT FLASH events)
       ↓                         ↑
   Telegram Alert Channel       Crucix OSINT Sweep
   PWA Push Notifications       (detects kidnapping keywords
   SMS (planned)                in ACLED, GDELT, NAPTIP RSS,
                                Nigeria news RSS)
```

**Synergy Opportunities:**
1. The Crucix dashboard could link to the PWA alert detail pages (`/alert/{case_id}`)
2. The Crucix Nigeria FLASH counter could be an SSE endpoint that the PWA subscribes to
3. The Crucix ACLED data could feed into the PWA's map as "conflict zone" overlays
4. The operator quick-actions in Crucix could POST to the API gateway's operator endpoints (`/api/ops/alerts/:id/approve`)

---

## LOGO & IMAGE ASSETS

**Location:** `services/crucix/favicon_ravencry/`

**Available files (generated from `services/crucix/ravencry.png`):**
- `favicon.ico` — multi-size ICO
- `favicon-16x16.png` — 16×16
- `favicon-32x32.png` — 32×32
- `apple-touch-icon.png` — 180×180
- `android-chrome-192x192.png` — 192×192
- `android-chrome-512x512.png` — 512×512
- `site.webmanifest` — web app manifest

**Usage in jarvis.html:**
```html
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
```

The boot screen logo ring should also use the RavenCry logo instead of the CRUCIX text.

---

## THINGS THAT WILL BREAK STUFF — DO NOT DO

1. **DO NOT change the `D = {...}` data structure** — inject.mjs writes this and jarvis.html consumes it. If you change a key name, the dashboard breaks.
2. **DO NOT remove the globe/flat map toggle** — the `toggleMapMode()` function handles mobile/low-perf fallbacks. Removing it breaks mobile.
3. **DO NOT remove `lowPerfMode`** — it's critical for mobile devices and weak hardware.
4. **DO NOT change the SSE/data refresh logic** — the dashboard auto-refreshes. Changing the interval or removing it breaks the "live" aspect.
5. **DO NOT rename CSS custom properties prefixed with `--`** unless you update ALL references (40+ places).
6. **DO NOT remove the `isFlat` / `shouldStartFlat()` logic** — it auto-detects weak devices and starts in 2D mode. Removing it causes crashes on low-end phones.
7. **DO NOT import external CSS/font files that require internet** — the dashboard must work in Nigeria with intermittent connectivity. Google Fonts are already preloaded via `<link rel="preconnect">`.
8. **DO NOT change the globe.gl CDN URL** — `unpkg.com/globe.gl@2.33.0` is the pinned version. Newer versions may break the API.
9. **DO NOT add heavy JavaScript libraries** — the dashboard already loads GSAP, D3.js, TopoJSON, Three.js, and globe.gl. Adding more will slow boot time on 2G/3G.
10. **DO NOT make changes to `inject.mjs` that alter the `D` object shape** — if you add fields, add them at the end. If you rename fields, update ALL references in jarvis.html.

---

## RECOMMENDED IMPLEMENTATION ORDER

If you're doing multiple improvements, follow this order to minimize conflicts:

1. **First:** #7, #8, #11 (topbar rebranding) — safe, visible, no logic changes
2. **Second:** #1, #2 (Nigeria region + default POV) — safe, map-only
3. **Third:** #18, #19 (dynamic alert badge) — safe, data already exists
4. **Fourth:** #13 (Africa toggle) — complex, do AFTER simpler changes are stable
5. **Fifth:** #14, #15 (RSS feed priority) — changes inject.mjs, test separately
6. **Sixth:** #9 (color palette) — risky, do LAST and test thoroughly
7. **Seventh:** #22, #24 (enhance Nigeria panels) — depends on data being correct

---

## QUESTIONS FOR THE HUMAN (me)

If v0.app encounters these situations, it should ASK:

1. "I need the LLM_API_KEY to test the LLM features — do you want to provide it or should I skip LLM-dependent features?"
2. "I want to add Nigerian RSS feeds but some URLs may be outdated — should I add them and let you test, or skip?"
3. "The color palette change affects 40+ CSS references — do you want the full teal→red conversion, or just accent colors?"
4. "I see the whatsapp/sms/ussd services are stubs — should I build UI for them or leave as planned?"
5. "The ACLED data has geo-points for kidnappings and conflict events — should I plot them on the map, or keep them in the right rail panel only?"
6. "Should I add an SSE endpoint from Crucix that the PWA can subscribe to for Nigeria FLASH alerts? This would connect the two frontends."
7. "The Crucix dashboard is a single HTML file (~2000 lines). Should I split it into modules, or keep it monolithic for easier deployment?"

---

## VERIFICATION CHECKLIST

After making changes, verify:

- [ ] Dashboard loads without console errors
- [ ] 3D globe initializes and rotates
- [ ] Flat/globe toggle works
- [ ] Region buttons work (including new Nigeria button)
- [ ] Africa toggle filters data correctly (if implemented)
- [ ] Nigeria panels in right rail still show data
- [ ] Boot sequence plays and finishes
- [ ] Low-perf mode toggle still works
- [ ] Mobile view doesn't crash
- [ ] Topbar shows correct brand name
- [ ] Alert badge shows dynamic FLASH count (if implemented)
- [ ] Favicon loads correctly
- [ ] Page title shows "RAVENCRY"
- [ ] inject.mjs still synthesizes data correctly (`node dashboard/inject.mjs` runs without error)
- [ ] SSE stream still works (if modified)
