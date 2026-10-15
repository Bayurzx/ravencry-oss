# SKILL: Crucix Patterns
## How Crucix works internally and how to extend it correctly for RAVENCRY

---

## PURPOSE

This skill documents the Crucix codebase conventions, internal patterns, and the exact extension points used by RAVENCRY. Use this to write new source modules, modify the alert pipeline, or debug sweep behaviour without reading the full Crucix codebase each time.

**When to use this skill:**
- Writing a new source module (`apis/sources/*.mjs`)
- Modifying briefing logic or severity tiers
- Debugging a sweep that is not firing
- Adding a new alert delivery channel
- Wiring Crucix output to n8n

---

## SECTION 1: CRUCIX CORE ARCHITECTURE

```
Crucix runtime loop:

  ┌─────────────────────────────────────────────────┐
  │  setInterval(runSweep, SWEEP_INTERVAL_MS)       │
  │                                                 │
  │  runSweep():                                    │
  │    1. Load all source modules from apis/sources │
  │    2. Call each source.fetch() in parallel      │
  │    3. Collect events from all sources           │
  │    4. Pass event list to briefing.mjs           │
  │    5. briefing.mjs → delta detection            │
  │    6. briefing.mjs → severity classification   │
  │    7. briefing.mjs → emit to alert channels    │
  │    8. Update source health in registry          │
  └─────────────────────────────────────────────────┘
```

**Key files:**
```
server.mjs              — Express server, SSE endpoint, sweep scheduler
apis/briefing.mjs       — Delta engine, severity tiers, alert emission
apis/sources/           — One file per data source (RAVENCRY adds 4-5 here)
alerts/telegram.mjs     — Telegram alert adapter
alerts/discord.mjs      — Discord alert adapter (reuse as ops fallback)
alerts/webhook.mjs      — Generic webhook emitter (RAVENCRY: fires to n8n)
config/                 — Configuration files (RAVENCRY adds nigeria-keywords.json)
public/                 — Dashboard frontend (Jarvis HUD)
```

---

## SECTION 2: SOURCE MODULE CONTRACT

Every source module in `apis/sources/` must export a `fetch()` function that returns an array of event objects.

### Minimal Source Module Template
```javascript
// apis/sources/your-source-name.mjs

import { loadKeywords } from '../../config/nigeria-keywords.mjs'

// Source metadata — shown in Crucix HUD
export const meta = {
  name: 'Your Source Name',         // Display name
  description: 'What this monitors', // One line
  type: 'rss' | 'api' | 'db' | 'scrape',
  active: true
}

// Called on every Crucix sweep
// Must return: Array<CrucixEvent> or throw on unrecoverable error
export async function fetch() {
  try {
    const raw = await getRawData()  // your data fetch
    const keywords = loadKeywords()
    
    return raw
      .filter(item => matchesKeywords(item, keywords))
      .map(item => toEvent(item))
      
  } catch (err) {
    // Log but return empty — never crash the sweep
    console.error(`[your-source] fetch failed: ${err.message}`)
    return []
  }
}
```

### CrucixEvent Schema
```javascript
// The object shape Crucix expects from every source
const CrucixEvent = {
  // Required
  id:         string,   // Unique ID — use URL hash, DB uuid, or generated uuid
  title:      string,   // Short display title (shown in HUD)
  source:     string,   // Source module name, e.g. 'naptip-rss'
  timestamp:  string,   // ISO 8601

  // Optional but used by RAVENCRY briefing.mjs
  summary:    string,   // Longer description
  url:        string,   // Source URL if available
  severity:   string,   // Pre-classification hint: 'high'|'medium'|'low'
  location:   string,   // Free text location
  raw:        object    // Full original data (for Qwen processing downstream)
}
```

---

## SECTION 3: THE FOUR RAVENCRY SOURCE MODULES

### `naptip-rss.mjs`
```javascript
import Parser from 'rss-parser'
import { createHash } from 'crypto'
import { loadKeywords } from '../../config/nigeria-keywords.mjs'

const parser = new Parser()
const NAPTIP_RSS = 'https://naptip.gov.ng/feed/'  // verify this URL on setup

export const meta = {
  name: 'NAPTIP Press Releases',
  description: 'Official NAPTIP news and missing persons announcements',
  type: 'rss',
  active: true
}

export async function fetch() {
  const keywords = loadKeywords()
  try {
    const feed = await parser.parseURL(NAPTIP_RSS)
    return feed.items
      .filter(item => matchesAnyKeyword(item.title + ' ' + item.contentSnippet, keywords))
      .map(item => ({
        id: createHash('sha256').update(item.link).digest('hex').slice(0, 16),
        title: item.title,
        source: 'naptip-rss',
        timestamp: item.isoDate || new Date().toISOString(),
        summary: item.contentSnippet,
        url: item.link,
        severity: 'high',   // NAPTIP items are always high — they don't publish trivial cases
        raw: item
      }))
  } catch (err) {
    console.error('[naptip-rss] failed:', err.message)
    return []
  }
}
```

### `gdelt-nigeria.mjs`
```javascript
const GDELT_URL = 'https://api.gdeltproject.org/api/v2/doc/doc'
const QUERY = process.env.GDELT_QUERY || 'kidnap Nigeria missing abduction'

// GDELT response dedup — keep last 100 seen URLs in memory
const seen = new Set()

export async function fetch() {
  const url = `${GDELT_URL}?query=${encodeURIComponent(QUERY)}&mode=artlist&maxrecords=25&format=json&sort=datedesc`
  const res = await globalThis.fetch(url, { signal: AbortSignal.timeout(8000) })
  const data = await res.json()
  
  return (data.articles || [])
    .filter(a => !seen.has(a.url))
    .map(a => {
      seen.add(a.url)
      if (seen.size > 100) seen.delete(seen.values().next().value)  // keep set bounded
      return {
        id: createHash('sha256').update(a.url).digest('hex').slice(0, 16),
        title: a.title,
        source: 'gdelt-nigeria',
        timestamp: a.seendate ? parseGdeltDate(a.seendate) : new Date().toISOString(),
        summary: a.title,
        url: a.url,
        severity: 'medium',
        raw: a
      }
    })
}

function parseGdeltDate(d) {
  // GDELT format: 20240615T123045Z
  return new Date(d.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/, '$1-$2-$3T$4:$5:$6Z')).toISOString()
}
```

### `citizen-reports.mjs`
```javascript
// Polls Aurora for cases submitted via WhatsApp/USSD/PWA that are awaiting sweep
import { pool } from '../../db/aurora.mjs'

export async function fetch() {
  const result = await pool.query(`
    SELECT c.id, c.last_seen_location, c.last_seen_state, c.raw_report,
           c.qwen_confidence, c.alert_tier, c.circumstance,
           p.full_name, p.age_estimate, p.gender
    FROM cases c
    LEFT JOIN persons p ON c.person_id = p.id
    WHERE c.status = 'pending_sweep'
    ORDER BY c.created_at DESC
    LIMIT 50
  `)
  
  // Mark as picked up — prevents double-processing
  if (result.rows.length > 0) {
    const ids = result.rows.map(r => r.id)
    await pool.query(
      `UPDATE cases SET status = 'in_sweep' WHERE id = ANY($1)`,
      [ids]
    )
  }
  
  return result.rows.map(row => ({
    id: row.id,
    title: `Missing: ${row.full_name || 'Unknown'}, ${row.last_seen_location || 'Unknown location'}`,
    source: 'citizen-reports',
    timestamp: new Date().toISOString(),
    summary: row.raw_report,
    severity: row.alert_tier === 'FLASH' ? 'high' : row.alert_tier === 'PRIORITY' ? 'medium' : 'low',
    location: row.last_seen_location,
    raw: row
  }))
}
```

### `sighting-feed.mjs`
```javascript
// Polls Aurora for new sightings on active FLASH/PRIORITY cases
import { pool } from '../../db/aurora.mjs'

export async function fetch() {
  const result = await pool.query(`
    SELECT s.id, s.case_id, s.description, s.sighting_location,
           s.trust_score, c.alert_tier, c.id as case_ref,
           p.full_name
    FROM sightings s
    JOIN cases c ON s.case_id = c.id
    JOIN persons p ON c.person_id = p.id
    WHERE s.status = 'unprocessed'
      AND c.alert_tier IN ('FLASH', 'PRIORITY')
      AND c.status = 'active'
    ORDER BY s.created_at DESC
    LIMIT 20
  `)
  
  return result.rows.map(row => ({
    id: `sighting-${row.id}`,
    title: `Sighting: ${row.full_name} near ${row.sighting_location || 'unknown location'}`,
    source: 'sighting-feed',
    timestamp: new Date().toISOString(),
    summary: row.description,
    severity: row.alert_tier === 'FLASH' ? 'high' : 'medium',
    location: row.sighting_location,
    raw: row
  }))
}
```

---

## SECTION 4: MODIFYING BRIEFING.MJS

The briefing module is the brain of Crucix. For RAVENCRY, we make 3 targeted changes:

### Change 1: RAVENCRY Severity Constants
Find where Crucix defines its tier labels and replace:
```javascript
// BEFORE (default Crucix)
const TIERS = { critical: 3, high: 2, medium: 1, low: 0 }

// AFTER (RAVENCRY)
const TIERS = {
  FLASH:    { level: 3, label: 'FLASH 🚨',    broadcast: 'full',         autoApprove: false },
  PRIORITY: { level: 2, label: 'PRIORITY ⚠️', broadcast: 'subscribers',  autoApprove: false },
  ROUTINE:  { level: 1, label: 'ROUTINE ℹ️',  broadcast: 'ops_only',     autoApprove: true  }
}
```

### Change 2: Map source severity to RAVENCRY tier
```javascript
function mapSeverityToTier(event) {
  // Source pre-classifications
  if (event.source === 'citizen-reports' && event.raw.alert_tier) {
    return event.raw.alert_tier  // Already classified by Qwen
  }
  if (event.source === 'naptip-rss') return 'PRIORITY'  // NAPTIP is always at least PRIORITY
  if (event.severity === 'high') return 'PRIORITY'       // GDELT/news high → PRIORITY (not FLASH — needs human confirmation)
  return 'ROUTINE'
}
```

### Change 3: FLASH Webhook Emitter
Add to the event emission block in briefing.mjs:
```javascript
async function emitEvent(event, tier) {
  // Existing Crucix channels (Telegram, Discord)
  await sendTelegramAlert(event, tier)
  
  // RAVENCRY addition: n8n webhook for FLASH tier
  if (tier === 'FLASH' && process.env.N8N_WEBHOOK_URL) {
    try {
      await fetch(process.env.N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-RAVENCRY-Secret': process.env.N8N_WEBHOOK_SECRET
        },
        body: JSON.stringify({
          event_type: 'FLASH_ALERT',
          case_id: event.raw?.id || event.id,
          event,
          tier,
          emitted_at: new Date().toISOString()
        }),
        signal: AbortSignal.timeout(5000)  // Non-blocking — 5s timeout
      })
    } catch (err) {
      console.error('[briefing] n8n webhook failed:', err.message)
      // Do not rethrow — Crucix continues even if n8n webhook fails
    }
  }
}
```

---

## SECTION 5: ADDING NEW ALERT CHANNELS

To add a new delivery channel (e.g. email, PagerDuty, custom API):

1. Create `alerts/your-channel.mjs`:
```javascript
export async function sendAlert(event, tier) {
  if (!process.env.YOUR_CHANNEL_KEY) {
    console.warn('[your-channel] key not set, skipping')
    return  // Graceful degradation — never throw on missing key
  }
  // ... your delivery logic
}
```

2. Register in `briefing.mjs` emitEvent():
```javascript
import { sendAlert as sendYourChannel } from '../alerts/your-channel.mjs'
// ... in emitEvent():
await sendYourChannel(event, tier)
```

3. Add key to `.env.example` with comment explaining format.

**Convention:** All alert adapters must:
- Return void (not the delivery result)
- Never throw (log and swallow errors)
- Skip silently if env key is missing
- Complete in under 5 seconds (use AbortSignal.timeout)

---

## SECTION 6: KEYWORD MATCHING UTILITY

Used by all source modules. Centralised in `config/nigeria-keywords.mjs`:

```javascript
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
let _keywords = null

export function loadKeywords() {
  if (!_keywords) {
    _keywords = JSON.parse(readFileSync(join(__dirname, 'nigeria-keywords.json'), 'utf-8'))
  }
  return _keywords
}

export function matchesAnyKeyword(text, keywords) {
  const lower = text.toLowerCase()
  return Object.values(keywords.kidnapping)
    .flat()
    .some(kw => lower.includes(kw.toLowerCase()))
}

export function matchesEscalator(text, keywords) {
  const lower = text.toLowerCase()
  return keywords.severity_escalators.some(kw => lower.includes(kw.toLowerCase()))
}

export function matchesDeescalator(text, keywords) {
  const lower = text.toLowerCase()
  return keywords.deescalators.some(kw => lower.includes(kw.toLowerCase()))
}
```

---

## SECTION 7: DEBUGGING COMMON ISSUES

### Source not appearing in HUD
- Check: `export const meta` is present in the module
- Check: module is imported/registered in the sources loader
- Check: `fetch()` is exported as named export (not default)
- Check: module has no top-level syntax errors (`node --check apis/sources/your-source.mjs`)

### Sweep fires but no events
- Log: add `console.log('[source-name] fetched', items.length, 'items')` before return
- Check: keyword filter is not too aggressive — test with `matchesAnyKeyword()` in isolation
- Check: dedup Set is not blocking all items (new Set per module restart)

### FLASH webhook not firing
- Check: `N8N_WEBHOOK_URL` is set in `.env`
- Check: `N8N_WEBHOOK_SECRET` matches n8n webhook header validator
- Check: n8n webhook workflow is active (not deactivated)
- Check: EC2 security group allows outbound on port 5678 (if n8n is on same machine: use localhost)

### Delta engine firing on same event repeatedly
- Check: event `id` is truly unique and stable across fetches
- The delta engine compares by `id` — if id changes every fetch, every event is "new"
- Fix: use a hash of the canonical content (URL, DB primary key) not a generated UUID

### Source health showing degraded
- Crucix marks a source degraded if `fetch()` returns empty array for > N consecutive sweeps
- This is expected during low-activity periods
- Override: set `meta.allowEmpty = true` in source module to suppress degraded status
