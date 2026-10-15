# RAVENCRY — Crucix Customization Handoff

Single source of truth for the RAVENCRY customization of the Crucix OSINT dashboard.
This documents **what changed**, **why**, and **how to swap demo data for live credentials**.

> TL;DR to go live: provide real credentials (ACLED + `DATABASE_URL` + RSS reachable),
> set `RAVENCRY_DEMO=false` in `.env`, then re-bake with
> `node dashboard/inject.mjs --no-open` (or just restart `node server.mjs`).
> **No code changes are required to switch from demo to live.**

---

## 1. Brand / theme decisions

### Why violet, not red/amber
The original brief asked for a "red/amber re-theme". After inspecting the actual
brand asset (`ravencry.png` / the favicon set), the RAVENCRY logo is **violet + steel
silver**. A red/amber chrome would have *contradicted the logo*. Per the instruction
"the theme shouldn't contradict", the identity was built around the real mark:

| Token | Value | Role |
|-------|-------|------|
| `--accent` | `#9d5cff` | Violet — primary brand (raven) |
| `--accent2` | `#b8c2cc` | Steel silver — secondary (wordmark) |
| `--bg` | `#0a0610` | Warm near-black |
| `--warn` | `#ffb020` | Amber — warnings / banditry |
| `--danger` | `#ff4d57` | Red |
| `--alert` | `#ff2e44` | **Reserved for active kidnap / critical alerts** |

**Semantic colour rule:** red/amber are now *meaningful*, not decorative — red = abduction,
amber = banditry/conflict, yellow (`#ffd54f`) = citizen report. This is more useful for an
alert network than a flat red coat of paint.

### What was re-themed (single swap points)
All theme is driven by CSS tokens in `dashboard/public/jarvis.html` `:root` + global
colour swaps. The functional **map data layers were preserved** so the legend stays
readable:
- The "air traffic" layer was restored to cyan (`#38bdf8`) after the global teal→violet swap.
- ACLED/citizen markers use the semantic red/amber/yellow above.

### Brand assets
Copied into `dashboard/public/` (served statically):
`ravencry-logo.png`, `favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png`.
Source originals remain in `favicon_ravencry/` and `ravencry.png`.

### Files touched for branding
- `dashboard/public/jarvis.html` — `:root` tokens, title, favicons, boot screen, topbar logo+wordmark, threat chip.
- `dashboard/public/loading.html` — title, favicon, tokens, logo, boot lines.
- `locales/en.json` — `dashboard.title`, `bootTitle`, `bootSubtitle`, `boot.initializing`.
- `server.mjs` — startup console banner.

> Note: the internal JS variable `__CRUCIX_LOCALE__` is intentionally left unchanged —
> it is the locale-injection contract from `inject.mjs` (do-not-break rule #1).

---

## 2. Nigeria Alert Grid (new feature)

The synthesize pipeline in `dashboard/inject.mjs` already *built* a complete `D.nigeria`
object from 5 sources, but **nothing rendered it**. RAVENCRY now surfaces it.

### New UI (all in `jarvis.html`)
- **Topbar threat chip** — `nigeriaThreat()` computes NATIONAL THREAT level
  (MONITORING / GUARDED / ELEVATED / CRITICAL) from abduction + flash + citizen counts.
- **Boot line** — `nigeriaBootLine()` summarises abduction signals + citizen reports.
- **Right-rail "Nigeria Alert Grid" panel** — `buildNigeriaPanel()`:
  - 4 metric tiles (abductions / conflict events / citizen reports / flash alerts)
  - Operator quick-actions (see §4)
  - Abduction hotspots (top states, bar-weighted)
  - Verification queue (pending citizen cases with tier badges)
  - Latest headlines (Nigeria News + NAPTIP + GDELT)
  - Graceful **"source offline — awaiting live feed"** empty states per sub-section.

### Map markers (globe + flat map)
`plotMarkers()` (globe) and the flat-map renderer both plot:
- **ACLED Nigeria** `geoPoints` → red (abduction) / amber (other conflict), popups show
  location / sub-type / fatalities.
- **Citizen reports** `pendingCases` (with lat/lon) → yellow, FLASH cases larger, popups
  show name / LGA / state / pending status.

New legend entries: Abduction, Banditry/Conflict, Citizen Report.

---

## 3. Demo data → Live swap (THE key section)

### How the fallback works
`config/nigeria-demo.mjs` exports `loadNigeriaDemo()` returning objects in the **exact raw
shape** the live source fetchers write into `runs/latest.json` under:
`ACLED-Nigeria`, `Citizen-Reports`, `NAPTIP-RSS`, `GDELT-Nigeria`, `Nigeria-News-RSS`.

In `dashboard/inject.mjs`, a single helper resolves each source:

```js
const NG_DEMO = process.env.RAVENCRY_DEMO === 'true' ? loadNigeriaDemo() : null;
const ngSource = (name, countKeys) => {
  const live = data.sources[name];
  const hasLive = live && !live.error && countKeys.some(k => (live[k]||0) > 0);
  if (hasLive) return live;                 // ← real data always wins
  return (NG_DEMO && NG_DEMO[name]) || live || {};
};
```

**Behaviour:**
- `RAVENCRY_DEMO=true` + source empty → demo data used, `D.nigeria.demo = true`,
  UI shows an amber **"DEMO DATA"** badge.
- Real source returns data → **live data always wins**, even if demo is on.
- `RAVENCRY_DEMO=false`/unset + source empty → real empty states render ("source offline").

### To go fully live
1. Supply real credentials in `.env` (see `.env.example`):
   - `ACLED_API_KEY` / `ACLED_EMAIL` → populates `ACLED-Nigeria`.
   - `DATABASE_URL` (Aurora/Postgres) → populates `Citizen-Reports.pendingCases`.
   - Nigeria/NAPTIP RSS + GDELT are public (already reachable in this environment).
2. Set `RAVENCRY_DEMO=false` in `.env`.
3. Re-bake: `node dashboard/inject.mjs --no-open` — or just run `node server.mjs`
   (it re-synthesizes on every sweep and reads the same env flag).
4. The "DEMO DATA" badge automatically becomes "LIVE".

No component, marker, or panel code needs to change — they read whatever `D.nigeria` holds.

---

## 4. Operator quick-actions (new)

Right-rail buttons: **Report Sighting**, **Escalate**, **Contact Ops**
(`buildNigeriaPanel()` → `handleOpsAction()` in `jarvis.html`).

- Each opens a modal form, then POSTs JSON to the API gateway.
- Endpoints (per spec, gateway on port 3003):
  - Report Sighting → `POST /api/sightings`
  - Escalate → `POST /api/ops/alerts/escalate`
  - Contact Ops → `POST /api/ops/messages`
- **Configure the gateway base** by setting a global before the app script, e.g.
  inject `window.__RAVENCRY_API_BASE__ = "http://localhost:3003"`.
  If unset (preview), actions degrade gracefully: a toast confirms the action was
  "queued locally — API gateway not configured" and the payload is `console.log`ged.
- On network failure it shows a "saved to retry queue" toast rather than throwing.

> Future hardening: persist the local queue (localStorage/IndexedDB) and flush on
> reconnect; add auth headers for the ops endpoints.

---

## 5. Local run / preview

```bash
npm install
node server.mjs          # serves dashboard; runs a live sweep on startup
```
`.env` defaults added for preview:
- `PORT=3001`
- `FLASH_AUTO_EMIT=false` (no outbound webhook noise locally)
- `RAVENCRY_DEMO=true` (seed Nigeria demo data until creds are supplied)

The dashboard bakes `D` inline (server mode); `inject.mjs` is the single point that writes
`D` into `jarvis.html` (do-not-break rule #1/#10 respected — `demo` key appended last).

---

## 6. Do-NOT-break compliance

| Rule | Status |
|------|--------|
| 1. `inject.mjs` writes `D` into jarvis.html | ✅ untouched mechanism; only added fields |
| 4. SSE / refresh logic | ✅ not modified |
| 10. `D.nigeria` shape / key order | ✅ existing keys unchanged; `demo` appended at end |
| Map data layers readable | ✅ air layer restored to cyan; semantic NG colours |

---

## 7. Suggestions beyond the brief (documented, not assumed)

1. **Semantic colour system** instead of a flat red coat — already implemented (red=abduction).
2. **National threat level** auto-derived in the topbar — implemented.
3. **Retry queue persistence** for operator actions when offline — *recommended, not yet built*.
4. **SSE FLASH channel for the PWA** (spec idea #2/#6) — natural next step; the threat
   model + counts already exist server-side.
5. **Nigeria-only OSINT filter** (spec idea #17) using `config/nigeria-keywords.json` —
   *recommended next*; keywords loader already present.

---

## 8. Required `.env` variables

The active `.env` (copied from `.env.example`) MUST contain these keys for full
functionality. The `.env.example` committed in the repo **may be stale** — always
cross-reference against the running `.env` (`services/crucix/.env`).

### Required (dashboard won't render Nigeria data without these)
| Variable | Example | Required by |
|----------|---------|-------------|
| `PORT` | `3001` | server.mjs |
| `RAVENCRY_DEMO` | `true` / `false` | inject.mjs — demo/live toggle |
| `FLASH_AUTO_EMIT` | `false` / `true` | server.mjs — n8n webhook auto-fire |
| `N8N_WEBHOOK_URL` | `http://localhost:5678/webhook/crucix-flash` | server.mjs → n8n |
| `N8N_WEBHOOK_SECRET` | `71054a...` | server.mjs → n8n auth |

### Live sources (to go fully live — not needed in demo mode)
| Variable | Example | Required by |
|----------|---------|-------------|
| `ACLED_EMAIL` | `<your-acled-account-email>` | `apis/sources/acled-nigeria.mjs` |
| `ACLED_PASSWORD` | `sU#buk...` | `apis/sources/acled-nigeria.mjs` |
| `DATABASE_URL` | `postgres://...` | `apis/sources/citizen-reports.mjs` |
| `RAVENCRY_API_URL` | `http://localhost:3003` | `apis/sources/citizen-reports.mjs` |
| `FIRMS_MAP_KEY` | `d086b5...` | `apis/sources/firms.mjs` (NASA FIRMS) |
| `LLM_PROVIDER` | `qwen` | `lib/llm/` — LLM idea generation |
| `LLM_API_KEY` | `sk-ws-H...` | `lib/llm/` — LLM idea generation |
| `LLM_MODEL` | *(leave blank for default)* | `lib/llm/` |
| `LLM_BASE_URL` | *(leave blank for default)* | `lib/llm/` |
| `TELEGRAM_BOT_TOKEN` | `8322000821:...` | `lib/alerts/telegram.mjs` |
| `TELEGRAM_CHAT_ID` | `<your-telegram-chat-id>` | `lib/alerts/telegram.mjs` |

> ⚠️ **Stale `.env.example` warning:** If someone runs `cp .env.example .env` after a
> fresh clone, the `.env.example` may be missing `RAVENCRY_DEMO`, `FLASH_AUTO_EMIT`,
> and may have `LLM_PROVIDER=openai` (should be `qwen`). Check `services/crucix/.env`
> against the active root `.env` and update `.env.example` with `cp .env .env.example`
> once credentials are supplied.

### For n8n WF-03 integration
| Variable | Example | Where used |
|----------|---------|------------|
| `N8N_WEBHOOK_URL` | see above | Crucix → n8n webhook |
| `LLM_SERVICE_URL` | `http://host.docker.internal:3002` (Docker) or `http://localhost:3002` (native) | Local n8n Node 4 |

> For full context on n8n integration, see `steps3.md` and `steps3_db_docker.md`.

---

## 9. Nigeria source modules (T-022 — build context)

The dashboard consumes data from **5 Nigeria-specific source modules** registered in
`apis/briefing.mjs`. Each runs independently on the sweep cycle; failures in one don't
block the others.

| Module | Source key in `D` | Auth | What it polls |
|--------|-------------------|:----:|---------------|
| `apis/sources/naptip-rss.mjs` | `NAPTIP-RSS` | No | 10 RSS feeds (NAPTIP, HumAngle tags, Premium Times, Daily Trust, The Cable) |
| `apis/sources/gdelt-nigeria.mjs` | `GDELT-Nigeria` | No | GDELT API v2 (3 queries: kidnapping + child + school attacks; 72h window; 5.5s rate limit) |
| `apis/sources/nigeria-news-rss.mjs` | `Nigeria-News-RSS` | No | 5 feeds (Punch, Vanguard, Guardian NG, Daily Trust, Premium Times) |
| `apis/sources/citizen-reports.mjs` | `Citizen-Reports` | Optional | Aurora `pending_sweep` cases (API gateway first, direct `pg` fallback) |
| `apis/sources/acled-nigeria.mjs` | `ACLED-Nigeria` | Yes | ACLED API — Nigeria-confined, coded conflict events (abduction, banditry, VAC) |

Shared utilities used by the RSS modules: `apis/utils/rss.mjs` (RSS 2.0 parser),
`apis/utils/fetch.mjs` (safeFetch with timeout), `apis/utils/env.mjs` (env loader).

Keywords used for filtering: `config/nigeria-keywords.json` (English, Hausa, Yoruba,
Igbo, Pidgin; relevance-scored with escalators/de-escalators).

> Full architecture rationale in `hackathon_context.md` → "T-022 · 4 (+1) Nigeria Source Modules".

---

## 10. `config/nigeria-demo.mjs` structure

The demo module exports `loadNigeriaDemo()` — a synchronous function returning an object
keyed by source name. Each source object mirrors the **exact shape** written to
`runs/latest.json` by the live fetcher.

**Source keys returned:**
- `NAPTIP-RSS` — `{ feedsOk, feedsFailed, totalArticles, matchedArticles, topArticles[], _demo: true }`
- `GDELT-Nigeria` — `{ totalArticles, matchedArticles, topArticles[], _demo: true }`
- `Nigeria-News-RSS` — `{ feedsOk, feedsFailed, totalArticles, matchedArticles, topArticles[], _demo: true }`
- `Citizen-Reports` — `{ totalPending, flashCount, priorityCount, routineCount, pendingCases[], _demo: true }`
- `ACLED-Nigeria` — `{ totalEvents, totalFatalities, kidnappingEvents[], banditryEvents[], vacEvents[], protestEvents[], highRiskStates[], dailyTimeline[], geoPoints[], _demo: true }`

Each entry sets `_demo: true` — `inject.mjs` detects this to toggle the "DEMO DATA" badge.

**Adding new demo content:** Edit the arrays in `loadNigeriaDemo()`. Match the field names
exactly — `inject.mjs` accesses these objects directly when falling back.

---

## 11. Quick verification checklist

After clone + setup, verify:

```bash
# 1. Install and start
cd services/crucix
npm install
cp .env.example .env          # then edit .env with real creds

# 2. Demo mode test (no live sources needed)
echo "RAVENCRY_DEMO=true" >> .env
echo "FLASH_AUTO_EMIT=false" >> .env
node server.mjs
# → Open http://localhost:3001
# → Should see: violet theme, "DEMO DATA" badge, Nigeria Alert Grid with 4 metric tiles,
#   abduction hotspots, verification queue, 6 kidnapping headlines

# 3. Live mode test (with credentials)
# Set RAVENCRY_DEMO=false, supply ACLED creds + DATABASE_URL
# → "DEMO DATA" badge should disappear
# → Nigeria Alert Grid shows live counts

# 4. n8n integration test
# Set FLASH_AUTO_EMIT=true, N8N_WEBHOOK_URL configured
node apis/webhooks/n8n.mjs
# → Expected: [Crucix] ✅ Test FLASH webhook fired successfully

# 5. Verify all 5 Nigeria sources register
# Check Crucix dashboard → Sources section
# → NAPTIP-RSS, GDELT-Nigeria, Nigeria-News-RSS, Citizen-Reports, ACLED-Nigeria
#   all show green (or yellow "offline" in demo mode)
