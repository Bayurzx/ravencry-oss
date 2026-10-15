# Prompt 04 — Crucix Fork Setup & Modifications
## Run this when starting Phase 2 implementation

---

## INSTRUCTION TO AI

You are helping set up and modify a fork of the **Crucix** open-source alert engine for RAVENCRY.

Crucix repo: https://github.com/CrucixAI/crucix (Node.js + Express)
Architecture: periodic sweep engine → delta detection → severity tiering → multi-channel alert delivery

Your job is to produce the exact file changes, new files, and configuration needed to turn Crucix into the RAVENCRY alert core.

---

## STEP 1 — FORK SETUP

Generate:
- `README-ravencry.md` at repo root explaining the fork purpose
- `.env.example` with ALL required keys for RAVENCRY (include comments explaining each)
- Updated `package.json` with any additional dependencies needed

Required `.env` keys to document:
```
# Crucix core
SWEEP_INTERVAL_MS=300000

# Telegram
TELEGRAM_BOT_TOKEN=
TELEGRAM_ALERT_CHANNEL_ID=
TELEGRAM_OPS_CHANNEL_ID=

# n8n webhook (receives FLASH events from Crucix)
N8N_WEBHOOK_URL=
N8N_WEBHOOK_SECRET=

# Database (Aurora)
DATABASE_URL=

# AI
QWEN_API_KEY=
QWEN_MODEL=qwen-turbo

# SMS gateway
AFRICASTALKING_API_KEY=
AFRICASTALKING_USERNAME=
AFRICASTALKING_SENDER_ID=RAVENCRY

# NAPTIP bridge
NAPTIP_WEBHOOK_URL=
NAPTIP_API_KEY=

# GDELT
GDELT_QUERY=kidnap+Nigeria+missing+abduction

# Internal
NODE_ENV=production
PORT=3001
```

---

## STEP 2 — NIGERIA KEYWORD CONFIGURATION

Create file: `config/nigeria-keywords.json`

Structure:
```json
{
  "kidnapping": {
    "english": ["kidnap", "abduct", "missing person", "taken", "held hostage", "ransom"],
    "pidgin": ["dem don carry", "dem snatch am", "e don miss", "dem kidnap"],
    "hausa": ["an sace", "an yi garkuwa", "batattu", "an tafi da shi"],
    "yoruba": ["ji", "ji eniyan", "sonu", "eniyan sonu"],
    "igbo": ["toro onye", "onye efu", "iwe mmadu"]
  },
  "locations": {
    "high_risk_lgas": ["Zamfara", "Kaduna", "Niger", "Katsina", "Kebbi", "Borno", "Yobe", "Sokoto"],
    "key_routes": ["Abuja-Kaduna expressway", "Lagos-Ibadan expressway", "Benin-Sagamu"],
    "motor_parks": ["Mile 12 Lagos", "Jabi Abuja", "Kasuwan Shanu Kano"]
  },
  "severity_escalators": ["child", "children", "baby", "infant", "school", "student", "multiple", "bus", "mass"],
  "deescalators": ["found", "rescued", "returned", "safe", "recovered"]
}
```

---

## STEP 3 — NEW SOURCE MODULES

Create each file in `apis/sources/`:

### `naptip-rss.mjs`
- Polls NAPTIP press release RSS (or fallback: scrape naptip.gov.ng/media/press-releases)
- Parse items: title, description, pubDate, link
- Filter by nigeria-keywords.json
- Output: array of events `{ source: 'naptip', title, summary, url, published_at, raw }`
- Handle: missing feed gracefully (return empty array, log warning)

### `gdelt-nigeria.mjs`
- Query GDELT API v2: `https://api.gdeltproject.org/api/v2/doc/doc?query=kidnap+Nigeria&mode=artlist&maxrecords=25&format=json`
- Filter results: must contain at least one nigeria-keyword term
- Deduplicate by URL against last 100 seen (in-memory Set)
- Output: same event schema as naptip-rss.mjs

### `nigeria-news-rss.mjs`
- Poll these RSS feeds in parallel (use Promise.all):
  - Vanguard: `https://www.vanguardngr.com/feed/`
  - Punch: `https://punchng.com/feed/`
  - Daily Trust: `https://dailytrust.com/feed`
  - Premium Times: `https://www.premiumtimesng.com/feed`
  - Channels TV: `https://www.channelstv.com/feed/`
- Filter: title or description contains any nigeria-keyword term
- Output: same event schema

### `citizen-reports.mjs`
- Polls Aurora DB: `SELECT * FROM cases WHERE status = 'pending_sweep' ORDER BY created_at DESC LIMIT 50`
- Transforms case rows to Crucix event format
- After read: UPDATE cases SET status = 'in_sweep' WHERE id IN (...)
- Output: array of Crucix events

### `sighting-feed.mjs`
- Polls Aurora DB: `SELECT s.*, c.alert_tier FROM sightings s JOIN cases c ON s.case_id = c.id WHERE s.status = 'unprocessed' AND c.alert_tier = 'FLASH'`
- Output: Crucix events for FLASH case sightings
- Used to trigger location-update sub-alerts

---

## STEP 4 — BRIEFING.MJS MODIFICATIONS

Modify `apis/briefing.mjs` to:

1. **Replace default tier labels** with RAVENCRY tiers:
```javascript
// RAVENCRY severity mapping
const SEVERITY = {
  FLASH: { label: 'FLASH 🚨', priority: 1, broadcast: 'full' },
  PRIORITY: { label: 'PRIORITY ⚠️', priority: 2, broadcast: 'subscribers' },
  ROUTINE: { label: 'ROUTINE ℹ️', priority: 3, broadcast: 'ops_only' }
}
```

2. **Add FLASH webhook emitter** — when a FLASH event is finalised:
```javascript
// Emit to n8n for full broadcast pipeline
if (severity === 'FLASH') {
  await fetch(process.env.N8N_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-RAVENCRY-Secret': process.env.N8N_WEBHOOK_SECRET
    },
    body: JSON.stringify({ event_type: 'FLASH_ALERT', case_id, payload })
  })
}
```

3. **Add Nigeria context to LLM prompt** (if Crucix uses an LLM for summaries):
```
You are the alert triage AI for RAVENCRY, Nigeria's missing persons and anti-kidnapping rapid alert platform. Assess severity using Nigerian geographic and social context. High-risk zones: Northwest (Zamfara, Kaduna, Katsina), Northeast (Borno, Yobe). Child abductions are always FLASH regardless of other factors.
```

---

## STEP 5 — ALERT MESSAGE TEMPLATES

Create `config/alert-templates.json`:

```json
{
  "FLASH": {
    "telegram": "🚨 *FLASH ALERT — RAVENCRY*\n\n*{person_name}* | {age} | {gender}\n📍 Last seen: *{last_seen_location}*\n🕐 {last_seen_time}\n\n{description}\n\n📸 Case ID: `{case_id}`\n👁 Did you see this person? Reply /sighting_{case_id}",
    "sms": "RAVENCRY FLASH: {person_name}, {age}yr {gender}, missing since {last_seen_time} near {last_seen_location}. Seen them? Call 112 or reply SIGHTING {case_id}",
    "ussd": "{person_name} | {age}yr | Last: {last_seen_location}. Reply 1 to report sighting"
  },
  "PRIORITY": {
    "telegram": "⚠️ *PRIORITY ALERT — RAVENCRY*\n\n*{person_name}* | {age} | {gender}\n📍 Last seen: *{last_seen_location}*\n\n{description}\n\nCase ID: `{case_id}`",
    "sms": "RAVENCRY: {person_name}, {age}yr, missing near {last_seen_location}. Info? Call 112 or reply SIGHTING {case_id}"
  }
}
```

---

## STEP 6 — SOURCE HEALTH DASHBOARD EXTENSION

Modify the Crucix dashboard (Jarvis HUD) to show RAVENCRY-specific health metrics:

Add to dashboard data endpoint (`/api/data`):
```json
{
  "ravencry_stats": {
    "active_flash_cases": 3,
    "active_priority_cases": 12,
    "total_open_cases": 47,
    "alerts_sent_24h": 8,
    "sightings_received_24h": 23,
    "sources_healthy": 6,
    "sources_degraded": 1
  }
}
```

---

## STEP 7 — DOCKER INTEGRATION

Generate the service definition to add to `docker-compose.yml`:
```yaml
crucix:
  build: ./crucix
  container_name: ravencry-crucix
  restart: unless-stopped
  ports:
    - "3001:3001"
  environment:
    - NODE_ENV=production
  env_file:
    - .env
  depends_on:
    - postgres
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
    interval: 30s
    timeout: 10s
    retries: 3
```

---

## VERIFICATION CHECKLIST

After completing all steps, confirm:
- [ ] `npm run dev` starts Crucix with all 5 RAVENCRY sources loading
- [ ] Source health dashboard shows all 5 sources green
- [ ] `naptip-rss.mjs` returns events (or empty array gracefully)
- [ ] `gdelt-nigeria.mjs` returns at least 1 event matching Nigerian keywords
- [ ] A test FLASH event triggers the n8n webhook (check n8n execution log)
- [ ] Alert message formats correctly in Telegram using the template
- [ ] Docker container starts and passes healthcheck
