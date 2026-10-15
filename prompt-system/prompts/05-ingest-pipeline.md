# Prompt 05 — Ingest Pipeline
## WhatsApp Bot + Telegram Bot + USSD + PWA intake

---

## INSTRUCTION TO AI

Build the full citizen intake layer for RAVENCRY. This is the front door of the system — where family members and witnesses submit reports. It must work on any device, any network, in any Nigerian language.

Produce complete, working code for each channel.

---

## CHANNEL 1 — WHATSAPP BOT (Africa's Talking)

### Setup
Africa's Talking WhatsApp Business API. Sandbox credentials from `.env`.

### Webhook handler: `services/whatsapp/handler.mjs`

Handle all incoming message types:

```javascript
// Message types to handle:
// text    → extract report fields via Qwen
// image   → upload to S3, extract embedding
// audio   → send to Whisper, then Qwen extraction
// location → extract lat/lng as last_seen_location
// document → reject with helpful message
```

**Conversation flow (state machine):**

```
State 0 — GREETING
  Trigger: any message from new number OR keyword "HELLO", "START", "REPORT"
  Reply: "Welcome to RAVENCRY 🇳🇬\nTo report a missing person, reply:\n1️⃣ Report missing person\n2️⃣ I saw someone\n3️⃣ Subscribe to alerts in my area\n\nEfọn fún orúkọ (Yoruba) | Aika ne (Hausa) | Nnọọ (Igbo)"

State 1 — REPORT_TYPE
  Trigger: user replies "1"
  Reply: "Please send:\n• The person's name\n• Their age\n• Where they were last seen\n• When (date and time if known)\n\nYou can type, send a voice note, or share their photo."

State 2 — COLLECTING_DETAILS
  Trigger: any message after State 1
  Action: route to Qwen QW-01 extraction
  If incomplete fields: ask follow-up for missing critical fields (name, location minimum)
  If complete: move to State 3

State 3 — PHOTO_REQUEST
  Reply: "Do you have a recent photo? Send it now or reply SKIP"

State 4 — CONFIRM
  Show extracted summary, ask "Is this correct? Reply YES to submit or NO to start again"
  On YES: write to Aurora cases table, return case_id
  Reply: "✅ Report received. Case ID: {case_id}\nWe will alert people in the area. You will receive updates on this number.\n\nShare this ID with police: {case_id}"

State SIGHTING (from "2"):
  Ask: "Which case are you reporting a sighting for? Share the Case ID or describe who you saw."
  Route: POST /api/sightings

State SUBSCRIBE (from "3"):
  Ask: "Which state or LGA are you in? We will send you alerts for missing persons in your area."
  Action: upsert subscriber record with LGA + phone
  Reply: "✅ Subscribed. You will receive RAVENCRY alerts for {lga}. Reply STOP at any time to unsubscribe."
```

**State persistence:** Store conversation state in DynamoDB keyed by `whatsapp:{phone_number}`. TTL: 30 minutes per session.

**Rate limiting:** Max 3 active reports per phone per 24 hours. On limit: "You have reached the maximum reports for today. For urgent cases, call 112."

---

## CHANNEL 2 — TELEGRAM BOT

### Bot setup: `services/telegram/bot.mjs`

Use `node-telegram-bot-api` or Crucix's existing Telegram adapter.

**Commands to implement:**

```
/start         — Welcome + menu
/report        — Begin report flow (mirrors WhatsApp State 1-4)
/sighting {id} — Submit a sighting for case ID
/status {id}   — Get current status of a case (public safe view only)
/subscribe     — Subscribe phone to LGA alerts
/unsubscribe   — Remove from alert list
/brief         — Latest 3 active FLASH alerts (for ops channel)
/help          — Command reference
```

**Alert broadcast format** (from Crucix FLASH emitter):
```
🚨 FLASH ALERT — RAVENCRY

Name: Amina Musa
Age: 8 | Female
Last seen: Kasuwan Shanu, Kano
Time: Today, approx 2:00 PM

Description: Wearing blue school uniform, plaited hair

📸 [photo attached if available]

Case ID: NR-2025-001847
👁 Seen her? Reply: /sighting_NR-2025-001847
```

**Ops channel** (separate channel ID for operators/investigators):
- All PRIORITY and FLASH cases
- Includes Qwen confidence score and source
- Approve button: inline keyboard `[✅ Approve Broadcast] [⛔ Suppress]`
- On approve: POST to `/api/ops/alerts/:id/approve`

---

## CHANNEL 3 — USSD HANDLER (Africa's Talking)

### Handler: `services/ussd/handler.mjs`

USSD sessions are stateless — state must be reconstructed from `sessionId` in each request.
State store: DynamoDB table `ravencry-ussd-sessions` keyed by `sessionId`. TTL: 5 minutes.

**USSD menu tree:**

```
*384#
├── 1. Report missing person
│   ├── Enter name of missing person: [free text]
│   ├── Enter their age: [number]
│   ├── Where last seen? (LGA): [free text]
│   ├── When? (e.g. today 2pm): [free text]
│   └── CON: Report received. Case ID: {id}. Share with police.
│       END: Thank you. RAVENCRY will alert your area.
│
├── 2. I saw a missing person
│   ├── Enter Case ID (from alert): [text]
│   ├── Where did you see them? [text]
│   └── END: Sighting recorded. Thank you for helping.
│
├── 3. Get latest alert in my area
│   ├── Enter your LGA: [text]
│   └── CON: [latest FLASH case in that LGA if any]
│       END: No active alerts in your area.
│
└── 4. Subscribe / Unsubscribe
    ├── 1. Subscribe to alerts
    │   ├── Enter your LGA: [text]
    │   └── END: Subscribed. You'll get SMS alerts for {lga}.
    └── 2. Unsubscribe
        └── END: Unsubscribed. You will no longer receive alerts.
```

**Africa's Talking USSD request format:**
```javascript
// POST body from AT:
{
  sessionId: string,
  serviceCode: string,   // *384#
  phoneNumber: string,   // +2348012345678
  text: string,          // accumulated input e.g. "1*Amina*8*Kano central*today 2pm"
  networkCode: string
}

// Response format:
// CON {menu text}  → continue session
// END {message}    → terminate session
```

**State machine implementation:**
Parse `text` by splitting on `*` to determine current step depth.
```javascript
const steps = text.split('*').filter(Boolean)
// steps.length === 0 → show root menu
// steps[0] === '1' && steps.length === 1 → show name prompt
// steps[0] === '1' && steps.length === 2 → show age prompt
// etc.
```

---

## CHANNEL 4 — PWA REPORT FORM

### Component: `components/ReportForm/index.tsx`

4-step wizard with progress indicator:

**Step 1 — What happened?**
```
[Radio group]
● Someone is missing
○ I witnessed a kidnapping
○ I have a tip / sighting

[If "witnessed kidnapping"]
  Show: "Are you safe right now? If in immediate danger, call 112 first."
```

**Step 2 — About the person**
```
Full name: [text input, required]
Age: [number input, optional]
Gender: [select: Male / Female / Unknown]
Distinguishing features: [textarea, optional, placeholder: "clothing, scars, height, hair..."]
Last known photo: [file upload, accept: image/*, max 5MB]
```

**Step 3 — Location & time**
```
Last seen location: [text input with map pin option]
  [📍 Use my current location] button → browser geolocation
  [Or tap on map] → Leaflet map picker
When (approx): [datetime-local input]
Additional details: [textarea, optional]
```

**Step 4 — Your contact (optional)**
```
"Providing your phone number helps us send you updates."
Phone number: [tel input, placeholder: +234...]
[Submit anonymously] button (skips phone entirely)

[Submit Report] primary CTA
```

**On submit:**
- POST to `/api/reports`
- Show loading state
- On 202: show case ID with copy button + share sheet
- On error: show retry option, offer SMS fallback instructions

**Offline handling:**
- If fetch fails: queue report in IndexedDB with `status: 'pending_sync'`
- Show banner: "Report saved. Will send when you're back online."
- Service worker background sync: retry on reconnect

---

## SHARED INTAKE UTILITIES

### `services/intake/normalise.mjs`
```javascript
// Normalises all intake events to a standard shape before n8n processing
export function normaliseReport({ channel, raw, phone, media_urls }) {
  return {
    source_channel: channel,    // 'whatsapp' | 'telegram' | 'ussd' | 'pwa'
    reporter_phone: phone || null,
    raw_text: raw,
    media_urls: media_urls || [],
    received_at: new Date().toISOString(),
    status: 'pending_triage'
  }
}
```

### `services/intake/rate-limit.mjs`
```javascript
// Check DynamoDB for report count by phone in last 24h
// Returns: { allowed: boolean, remaining: number, reset_at: string }
```

### `services/intake/session-store.mjs`
```javascript
// DynamoDB-backed session store for WhatsApp and USSD state machines
// Methods: get(key), set(key, value, ttlSeconds), delete(key)
```

---

## N8N WORKFLOW: WF-01 WHATSAPP INTAKE

Produce the full n8n workflow JSON (importable via n8n UI):

Nodes in order:
1. **Webhook** (trigger) — receives POST from WhatsApp AT webhook
2. **Switch** — branch by `message_type`: text / audio / image / location
3. **[audio branch] HTTP Request** — POST to Whisper service `/transcribe`
4. **[audio branch] Set** — merge transcript as `raw_text`
5. **[all branches] HTTP Request** — POST to Qwen service `/extract` with `raw_text`
6. **Set** — normalise extracted fields + add channel metadata
7. **Postgres** — INSERT into `cases` table, return `case_id`
8. **[if media] HTTP Request** — upload to S3 via presigned URL
9. **HTTP Request** — send WhatsApp reply with case_id confirmation
10. **HTTP Request** — POST to Crucix `/api/trigger-sweep` (optional fast path)
11. **Error handler** — catch all failures → log to DynamoDB → send fallback WhatsApp reply

Export as: `n8n-workflows/wf-01-whatsapp-intake.json`

---

## VERIFICATION CHECKLIST

- [ ] WhatsApp: send "1" → bot responds with report prompt
- [ ] WhatsApp: send voice note in Hausa → transcribed and extracted correctly
- [ ] WhatsApp: complete full 4-state flow → case appears in Aurora with status `pending_triage`
- [ ] Telegram: `/report` command → full flow → case created
- [ ] USSD: simulate `*384*1*Amina*8*Kano*today 3pm#` → case created → END message received
- [ ] PWA: complete 4-step form → case ID returned
- [ ] PWA: submit while offline → report queued, synced on reconnect
- [ ] Rate limit: 4th submission from same phone → 429 / "maximum reached" message
